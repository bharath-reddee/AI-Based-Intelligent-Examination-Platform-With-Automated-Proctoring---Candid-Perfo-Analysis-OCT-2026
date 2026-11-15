import datetime
import random
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from database import get_db
import models
import schemas
from dependencies import get_current_teacher, get_current_student
from services.rate_limit_service import limiter, RATE_LIMIT_AUTHENTICATED, RATE_LIMIT_AI_GEN
from services.ai_service import generate_exam_questions, evaluate_subjective_answer
from services.redis_service import (
    invalidate_exam_related_caches,
    set_student_presence,
    get_active_exam_students,
    remove_student_presence,
    record_attempt_heartbeat,
    increment_proctoring_counter,
    acquire_submission_lock,
    release_submission_lock,
    cache_saved_answer,
)

router = APIRouter(prefix="/exams", tags=["Exams"])



def normalize_to_utc_naive(dt: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    """Ensures datetime is stored as naive UTC in PostgreSQL without local timezone shifts."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return dt


def to_utc_aware(dt: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    """Attaches UTC timezone info to naive UTC datetimes for consistent ISO JSON serialization."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(datetime.timezone.utc)


def recalculate_exam_metrics(db: Session, exam: models.Exam):
    """Recalculates total marks and question count based on actual saved questions."""
    questions = db.query(models.Question).filter(models.Question.exam_id == exam.id).all()
    exam.number_of_questions = len(questions)
    calc_marks = sum(int(q.marks) for q in questions)
    if calc_marks > 0:
        exam.total_marks = calc_marks
    db.flush()


def format_exam_teacher_response(db: Session, exam: models.Exam) -> schemas.ExamTeacherResponse:
    """Formats an Exam with assigned student counts and submissions counts."""
    assigned_count = db.query(models.ExamAssignment).filter(models.ExamAssignment.exam_id == exam.id).count()
    submissions_count = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.exam_id == exam.id,
            or_(models.ExamAttempt.is_mock == False, models.ExamAttempt.is_mock.is_(None)),
            models.ExamAttempt.status.in_(["submitted", "evaluated", "graded"]),
        )
        .count()
    )
    sub_rate = round((submissions_count / assigned_count * 100), 1) if assigned_count > 0 else 0.0

    questions_sorted = sorted(exam.questions, key=lambda x: x.order_index) if exam.questions else []
    q_responses = [
        schemas.QuestionTeacherResponse(
            id=q.id,
            exam_id=q.exam_id,
            question_text=q.question_text,
            question_type=q.question_type,
            difficulty=q.difficulty or "Medium",
            options=q.options,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            marks=q.marks,
            negative_marks=q.negative_marks or 0.0,
            min_words=q.min_words,
            max_words=q.max_words,
            order_index=q.order_index,
        )
        for q in questions_sorted
    ]

    return schemas.ExamTeacherResponse(
        id=exam.id,
        title=exam.title,
        subject=exam.subject,
        topic=exam.topic,
        description=exam.description,
        instructions=exam.instructions,
        difficulty=exam.difficulty or "Medium",
        duration_minutes=exam.duration_minutes,
        total_marks=exam.total_marks,
        passing_marks=exam.passing_marks,
        number_of_questions=len(questions_sorted) or exam.number_of_questions,
        max_tab_switches=exam.max_tab_switches if exam.max_tab_switches is not None else 3,
        status=getattr(exam, "status", "published" if exam.is_published else "draft") or "draft",
        ai_proctoring_enabled=bool(exam.ai_proctoring_enabled if exam.ai_proctoring_enabled is not None else True),
        negative_marking_enabled=bool(exam.negative_marking_enabled),
        negative_marking_score=float(exam.negative_marking_score or 0.25),
        shuffle_questions=bool(exam.shuffle_questions),
        shuffle_options=bool(exam.shuffle_options),
        start_time=to_utc_aware(exam.start_time),
        end_time=to_utc_aware(exam.end_time),
        is_published=bool(exam.is_published),
        teacher_email=exam.teacher_email,
        created_at=to_utc_aware(exam.created_at),
        questions=q_responses,
        assigned_students_count=assigned_count,
        submissions_count=submissions_count,
        submission_rate_percent=sub_rate,
    )



@router.post("/", response_model=schemas.ExamTeacherResponse, summary="Create a new exam")
@router.post("/teacher", response_model=schemas.ExamTeacherResponse, summary="Create a new exam (alias)")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def create_exam(
    request: Request,
    exam_in: schemas.ExamCreate,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Creates a new examination with metadata, proctoring, and scoring rules."""
    init_status = exam_in.status or ("published" if exam_in.is_published else "draft")

    db_exam = models.Exam(
        title=exam_in.title.strip(),
        subject=exam_in.subject.strip(),
        topic=exam_in.topic.strip() if exam_in.topic else None,
        description=exam_in.description.strip() if exam_in.description else None,
        instructions=exam_in.instructions.strip() if exam_in.instructions else None,
        difficulty=exam_in.difficulty or "Medium",
        duration_minutes=exam_in.duration_minutes,
        total_marks=exam_in.total_marks,
        passing_marks=exam_in.passing_marks,
        number_of_questions=exam_in.number_of_questions,
        max_tab_switches=exam_in.max_tab_switches if exam_in.max_tab_switches is not None else 3,
        status=init_status,
        ai_proctoring_enabled=exam_in.ai_proctoring_enabled if exam_in.ai_proctoring_enabled is not None else True,
        negative_marking_enabled=bool(exam_in.negative_marking_enabled),
        negative_marking_score=float(exam_in.negative_marking_score or 0.25),
        shuffle_questions=bool(exam_in.shuffle_questions),
        shuffle_options=bool(exam_in.shuffle_options),
        start_time=normalize_to_utc_naive(exam_in.start_time),
        end_time=normalize_to_utc_naive(exam_in.end_time),
        is_published=(init_status == "published"),
        teacher_email=current_teacher.email,
    )
    db.add(db_exam)
    db.flush()

    if exam_in.questions:
        calc_total = 0
        for idx, q_in in enumerate(exam_in.questions):
            db_q = models.Question(
                exam_id=db_exam.id,
                question_text=q_in.question_text.strip(),
                question_type=q_in.question_type or "mcq",
                difficulty=q_in.difficulty or exam_in.difficulty or "Medium",
                options=q_in.options,
                correct_answer=q_in.correct_answer,
                explanation=q_in.explanation,
                marks=int(q_in.marks) if q_in.marks else 1,
                negative_marks=float(q_in.negative_marks or 0.0),
                min_words=q_in.min_words,
                max_words=q_in.max_words,
                order_index=q_in.order_index if q_in.order_index > 0 else idx + 1,
            )
            db.add(db_q)
            calc_total += db_q.marks
        if calc_total > 0:
            db_exam.total_marks = calc_total
            db_exam.number_of_questions = len(exam_in.questions)

    db.commit()
    db.refresh(db_exam)
    await invalidate_exam_related_caches(teacher_email=current_teacher.email)
    return format_exam_teacher_response(db, db_exam)


@router.get("/teacher/my-exams", response_model=List[schemas.ExamTeacherResponse], summary="List exams created by teacher")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_teacher_exams(
    request: Request,
    status_filter: Optional[str] = Query(None, description="all, drafts, published, closed"),
    search: Optional[str] = Query(None, description="Search by title, subject, or topic"),
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    query = db.query(models.Exam).filter(models.Exam.teacher_email == current_teacher.email)

    if status_filter and status_filter.lower() != "all":
        filt = status_filter.lower().strip()
        if filt == "drafts" or filt == "draft":
            query = query.filter(or_(models.Exam.status == "draft", and_(models.Exam.is_published == False, models.Exam.status != "closed")))
        elif filt == "published":
            query = query.filter(or_(models.Exam.status == "published", models.Exam.is_published == True))
        elif filt == "closed":
            query = query.filter(models.Exam.status == "closed")

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Exam.title.ilike(term),
                models.Exam.subject.ilike(term),
                models.Exam.topic.ilike(term),
                models.Exam.description.ilike(term),
            )
        )

    exams = query.order_by(models.Exam.created_at.desc()).all()
    return [format_exam_teacher_response(db, ex) for ex in exams]


@router.get("/teacher/{exam_id}", response_model=schemas.ExamTeacherResponse, summary="Get full exam details (Teacher)")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_teacher_exam_detail(
    request: Request,
    exam_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    if exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this exam.")
    return format_exam_teacher_response(db, exam)


@router.put("/teacher/{exam_id}", response_model=schemas.ExamTeacherResponse, summary="Update exam metadata & rules")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def update_teacher_exam(
    request: Request,
    exam_id: int,
    exam_update: schemas.ExamUpdate,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    if exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this exam.")

    update_data = exam_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "title" and val:
            val = val.strip()
        if field in ("start_time", "end_time"):
            val = normalize_to_utc_naive(val)
        setattr(exam, field, val)

    if "status" in update_data:
        exam.is_published = (exam.status == "published")
    elif "is_published" in update_data:
        exam.status = "published" if exam.is_published else "draft"

    if exam.passing_marks > exam.total_marks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passing marks cannot exceed total marks.")

    if exam.start_time and exam.end_time and exam.start_time >= exam.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Opening date/time must be strictly before closing date/time.")

    recalculate_exam_metrics(db, exam)
    db.commit()
    db.refresh(exam)
    await invalidate_exam_related_caches(teacher_email=current_teacher.email)
    return format_exam_teacher_response(db, exam)


@router.delete("/teacher/{exam_id}", summary="Delete an examination")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def delete_teacher_exam(
    request: Request,
    exam_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    if exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not own this exam.")

    active_attempts = db.query(models.ExamAttempt).filter(models.ExamAttempt.exam_id == exam_id, or_(models.ExamAttempt.is_mock == False, models.ExamAttempt.is_mock.is_(None))).count()
    if active_attempts > 0 and exam.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete examination: {active_attempts} candidate attempt(s) have already been recorded. Close the examination instead."
        )

    db.delete(exam)
    db.commit()
    await invalidate_exam_related_caches(teacher_email=current_teacher.email)
    return {"message": "Examination deleted successfully", "exam_id": exam_id}


@router.post("/teacher/{exam_id}/publish", summary="Publish exam")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def publish_exam(
    request: Request,
    exam_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    if exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    q_count = db.query(models.Question).filter(models.Question.exam_id == exam.id).count()
    if q_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish exam with zero questions. Please add or generate questions first."
        )

    recalculate_exam_metrics(db, exam)
    if exam.total_marks <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Total marks must be greater than zero.")

    exam.status = "published"
    exam.is_published = True
    db.commit()
    db.refresh(exam)
    await invalidate_exam_related_caches(teacher_email=current_teacher.email)
    return {
        "message": "Examination published successfully!",
        "status": exam.status,
        "is_published": exam.is_published,
        "exam_id": exam.id
    }


@router.post("/teacher/{exam_id}/close", summary="Close test")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def close_exam(
    request: Request,
    exam_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    if exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    exam.status = "closed"
    exam.is_published = False
    db.commit()
    db.refresh(exam)
    await invalidate_exam_related_caches(teacher_email=current_teacher.email)
    return {
        "message": "Examination closed successfully. New attempts are no longer accepted.",
        "status": exam.status,
        "is_published": exam.is_published,
        "exam_id": exam.id
    }


@router.post("/teacher/{exam_id}/reopen", summary="Reopen closed test")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def reopen_exam(
    request: Request,
    exam_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    if exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    exam.status = "published"
    exam.is_published = True
    db.commit()
    db.refresh(exam)
    await invalidate_exam_related_caches(teacher_email=current_teacher.email)
    return {
        "message": "Examination reopened successfully and made available to assigned candidates.",
        "status": exam.status,
        "is_published": exam.is_published,
        "exam_id": exam.id
    }



@router.post("/teacher/{exam_id}/questions", response_model=schemas.QuestionTeacherResponse, summary="Add question to exam")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def add_question(
    request: Request,
    exam_id: int,
    question_in: schemas.QuestionCreate,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    if exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    q_type = question_in.question_type or "mcq"
    if q_type == "mcq":
        if not question_in.options or len(question_in.options) < 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Multiple Choice requires at least 2 options.")
        if not question_in.correct_answer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Multiple Choice requires specifying the correct answer option.")
    elif q_type == "multi_select":
        if not question_in.options or len(question_in.options) < 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Multi-Select requires at least 2 options.")
        if not question_in.correct_answer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Multi-Select requires specifying at least one correct option.")

    order_idx = question_in.order_index
    if not order_idx or order_idx <= 0:
        count = db.query(models.Question).filter(models.Question.exam_id == exam_id).count()
        order_idx = count + 1

    db_q = models.Question(
        exam_id=exam.id,
        question_text=question_in.question_text.strip(),
        question_type=q_type,
        difficulty=question_in.difficulty or exam.difficulty or "Medium",
        options=question_in.options,
        correct_answer=question_in.correct_answer,
        explanation=question_in.explanation,
        marks=int(question_in.marks) if question_in.marks else 1,
        negative_marks=float(question_in.negative_marks or 0.0),
        min_words=question_in.min_words,
        max_words=question_in.max_words,
        order_index=order_idx,
    )
    db.add(db_q)
    db.flush()

    recalculate_exam_metrics(db, exam)
    db.commit()
    db.refresh(db_q)
    return db_q


@router.put("/teacher/{exam_id}/questions/{question_id}", response_model=schemas.QuestionTeacherResponse, summary="Edit question")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def edit_question(
    request: Request,
    exam_id: int,
    question_id: int,
    question_in: schemas.QuestionCreate,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    db_q = db.query(models.Question).filter(models.Question.id == question_id, models.Question.exam_id == exam_id).first()
    if not db_q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    db_q.question_text = question_in.question_text.strip()
    db_q.question_type = question_in.question_type or "mcq"
    db_q.difficulty = question_in.difficulty or db_q.difficulty
    db_q.options = question_in.options
    db_q.correct_answer = question_in.correct_answer
    db_q.explanation = question_in.explanation
    db_q.marks = int(question_in.marks) if question_in.marks else 1
    db_q.negative_marks = float(question_in.negative_marks or 0.0)
    db_q.min_words = question_in.min_words
    db_q.max_words = question_in.max_words
    if question_in.order_index:
        db_q.order_index = question_in.order_index

    db.flush()
    recalculate_exam_metrics(db, exam)
    db.commit()
    db.refresh(db_q)
    return db_q


@router.delete("/teacher/{exam_id}/questions/{question_id}", summary="Delete question")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def delete_question(
    request: Request,
    exam_id: int,
    question_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    db_q = db.query(models.Question).filter(models.Question.id == question_id, models.Question.exam_id == exam_id).first()
    if not db_q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    db.delete(db_q)
    db.flush()
    recalculate_exam_metrics(db, exam)
    db.commit()
    return {"message": "Question deleted successfully", "question_id": question_id}


@router.post("/teacher/ai-generate-questions", response_model=List[schemas.AIGeneratedQuestionItem], summary="Generate questions via AI for review")
@limiter.limit(RATE_LIMIT_AI_GEN)
def ai_generate_questions(
    request: Request,
    payload: schemas.AIGenerateQuestionsRequest,
    current_teacher: models.Teacher = Depends(get_current_teacher),
):
    """
    Invokes the AI generation engine to draft questions.
    Returns preview items for teacher selection before saving.
    """
    total = (payload.mcq_count or 0) + (payload.multi_select_count or 0) + (payload.short_answer_count or 0) + (payload.long_answer_count or 0)
    if total <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total requested questions must be at least 1."
        )
    if total > 60:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A maximum of 60 questions can be generated in a single batch."
        )

    try:
        generated = generate_exam_questions(
            subject=payload.subject,
            topic=payload.topic,
            difficulty=payload.difficulty or "Medium",
            mcq_count=payload.mcq_count,
            multi_select_count=payload.multi_select_count,
            short_answer_count=payload.short_answer_count,
            long_answer_count=payload.long_answer_count,
            instructions=payload.instructions,
        )
        return generated
    except Exception as exc:
        err_msg = str(exc)
        if "11001" in err_msg or "getaddrinfo" in err_msg or "NameResolutionError" in err_msg or "ConnectError" in err_msg:
            detail = "Unable to connect to the AI provider. Please check your network connection and try again."
        elif "rate limit" in err_msg.lower() or "429" in err_msg or "quota" in err_msg.lower():
            detail = "AI provider rate limit or quota exceeded. Please wait a moment and try again."
        elif "authentication" in err_msg.lower() or "api key" in err_msg.lower() or "401" in err_msg:
            detail = "AI provider authentication failed. Please verify API credentials."
        else:
            detail = f"AI Generation Failed: {err_msg}"
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


@router.post("/teacher/{exam_id}/batch-questions", response_model=schemas.ExamTeacherResponse, summary="Add selected AI generated questions to exam")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def add_batch_questions(
    request: Request,
    exam_id: int,
    payload: schemas.BatchQuestionsAddRequest,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not payload.questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No questions selected to add.")

    curr_count = db.query(models.Question).filter(models.Question.exam_id == exam.id).count()

    for idx, q_in in enumerate(payload.questions):
        db_q = models.Question(
            exam_id=exam.id,
            question_text=q_in.question_text.strip(),
            question_type=q_in.question_type or "mcq",
            difficulty=q_in.difficulty or exam.difficulty or "Medium",
            options=q_in.options,
            correct_answer=q_in.correct_answer,
            explanation=q_in.explanation,
            marks=int(q_in.marks) if q_in.marks else 1,
            negative_marks=float(q_in.negative_marks or 0.0),
            min_words=q_in.min_words,
            max_words=q_in.max_words,
            order_index=curr_count + idx + 1,
        )
        db.add(db_q)

    db.flush()
    recalculate_exam_metrics(db, exam)
    db.commit()
    db.refresh(exam)
    return format_exam_teacher_response(db, exam)



@router.get("/teacher/{exam_id}/assignments", summary="Get assigned and available students for an exam")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_exam_assignments(
    request: Request,
    exam_id: int,
    search: Optional[str] = Query(None, description="Search available students"),
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    assignments = db.query(models.ExamAssignment).filter(models.ExamAssignment.exam_id == exam.id).all()
    assigned_emails = {a.student_email for a in assignments}

    started_attempts = {
        row[0]
        for row in (
            db.query(models.ExamAttempt.student_email)
            .filter(models.ExamAttempt.exam_id == exam.id, or_(models.ExamAttempt.is_mock == False, models.ExamAttempt.is_mock.is_(None)))
            .all()
        )
    }

    assigned_list = []
    for a in assignments:
        st = db.query(models.Student).filter(models.Student.email == a.student_email).first()
        assigned_list.append({
            "id": a.id,
            "student_email": a.student_email,
            "email": a.student_email,
            "student_name": f"{st.first_name} {st.last_name}" if st else a.student_email,
            "roll_number": st.roll_number if st else "N/A",
            "class_year": st.class_year if st else "N/A",
            "institute": st.institute if st else "N/A",
            "assigned_at": a.assigned_at,
            "has_started": a.student_email in started_attempts,
        })

    available_query = db.query(models.Student).filter(
        models.Student.approval_status == "approved",
        models.Student.is_active == True,
    )
    if assigned_emails:
        available_query = available_query.filter(~models.Student.email.in_(assigned_emails))

    if current_teacher.institute and current_teacher.institute.lower() not in ["not specified", "general"]:
        inst_query = available_query.filter(models.Student.institute.ilike(f"%{current_teacher.institute}%"))
        if inst_query.count() > 0:
            available_query = inst_query

    if search and search.strip():
        term = f"%{search.strip()}%"
        available_query = available_query.filter(
            or_(
                models.Student.first_name.ilike(term),
                models.Student.last_name.ilike(term),
                models.Student.email.ilike(term),
                models.Student.roll_number.ilike(term),
                models.Student.class_year.ilike(term),
            )
        )

    available_students = available_query.order_by(models.Student.first_name.asc()).limit(150).all()

    return {
        "exam_id": exam.id,
        "title": exam.title,
        "assigned_count": len(assigned_list),
        "assigned_students": assigned_list,
        "available_students": [
            {
                "email": s.email,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "name": f"{s.first_name} {s.last_name}",
                "roll_number": s.roll_number,
                "class_year": s.class_year,
                "institute": s.institute,
            }
            for s in available_students
        ],
    }


@router.post("/teacher/{exam_id}/assignments", summary="Assign students to an exam")
@router.post("/teacher/{exam_id}/assign", summary="Assign students to an exam (alias)")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def assign_students_to_exam(
    request: Request,
    exam_id: int,
    payload: schemas.ExamAssignmentRequest,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not payload.student_emails:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No student emails provided for assignment.")

    existing_assigned = {
        row[0]
        for row in (
            db.query(models.ExamAssignment.student_email)
            .filter(models.ExamAssignment.exam_id == exam.id)
            .all()
        )
    }

    added_count = 0
    now = datetime.datetime.utcnow()
    for email in payload.student_emails:
        email = email.strip()
        if email and email not in existing_assigned:
            st = db.query(models.Student).filter(models.Student.email == email, models.Student.approval_status == "approved").first()
            if st:
                db_assign = models.ExamAssignment(
                    exam_id=exam.id,
                    student_email=email,
                    assigned_at=now,
                )
                db.add(db_assign)
                existing_assigned.add(email)
                added_count += 1

    db.commit()
    return {
        "message": f"Successfully assigned {added_count} student(s) to examination.",
        "exam_id": exam.id,
        "total_assigned": len(existing_assigned),
    }


@router.delete("/teacher/{exam_id}/assignments/{student_email}", summary="Unassign student from an exam")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def unassign_student_from_exam(
    request: Request,
    exam_id: int,
    student_email: str,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.exam_id == exam_id,
        models.ExamAttempt.student_email == student_email,
        or_(models.ExamAttempt.is_mock == False, models.ExamAttempt.is_mock.is_(None)),
    ).first()

    if attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unassign student: Candidate has already initiated an examination attempt."
        )

    assignment = db.query(models.ExamAssignment).filter(
        models.ExamAssignment.exam_id == exam_id,
        models.ExamAssignment.student_email == student_email,
    ).first()

    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student assignment not found.")

    db.delete(assignment)
    db.commit()
    return {"message": "Candidate unassigned successfully", "student_email": student_email}



@router.get("/student/available", summary="List published examinations assigned to authenticated student")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_available_exams(
    request: Request,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Returns published examinations specifically assigned to the student.
    Enforces publication status and assignment authorization.
    """
    assigned_exam_ids = [
        row[0]
        for row in (
            db.query(models.ExamAssignment.exam_id)
            .filter(models.ExamAssignment.student_email == current_student.email)
            .all()
        )
    ]

    query = db.query(models.Exam).filter(
        or_(models.Exam.is_published == True, models.Exam.status == "published")
    )

    if assigned_exam_ids:
        query = query.filter(models.Exam.id.in_(assigned_exam_ids))
    else:
        return []

    published_exams = query.order_by(models.Exam.start_time.desc().nullslast(), models.Exam.created_at.desc()).all()

    result = []
    now = datetime.datetime.utcnow()

    for ex in published_exams:
        teacher = db.query(models.Teacher).filter(models.Teacher.email == ex.teacher_email).first()
        teacher_name = f"Prof. {teacher.first_name} {teacher.last_name}" if teacher else "Faculty Examiner"

        attempt = (
            db.query(models.ExamAttempt)
            .filter(
                models.ExamAttempt.exam_id == ex.id,
                models.ExamAttempt.student_email == current_student.email,
                or_(models.ExamAttempt.is_mock == False, models.ExamAttempt.is_mock.is_(None)),
            )
            .order_by(models.ExamAttempt.id.desc())
            .first()
        )

        is_submitted = bool(
            attempt
            and (
                attempt.submit_time is not None
                or attempt.status in ["submitted", "evaluated", "pending_evaluation", "graded", "completed"]
            )
        )

        attempt_status = "not_started"
        score = None
        attempt_id = None
        if attempt:
            attempt_status = "submitted" if is_submitted else attempt.status
            score = attempt.score
            attempt_id = attempt.id

        is_upcoming = bool(ex.start_time and now < ex.start_time)
        is_closed = bool(ex.status == "closed" or (ex.end_time and now > ex.end_time))

        result.append({
            "id": ex.id,
            "title": ex.title,
            "subject": ex.subject,
            "topic": getattr(ex, "topic", None),
            "description": ex.description,
            "instructions": ex.instructions,
            "teacher_name": teacher_name,
            "duration_minutes": ex.duration_minutes,
            "total_marks": ex.total_marks,
            "passing_marks": ex.passing_marks,
            "number_of_questions": len(ex.questions) or ex.number_of_questions,
            "ai_proctoring_enabled": bool(ex.ai_proctoring_enabled if ex.ai_proctoring_enabled is not None else True),
            "max_tab_switches": ex.max_tab_switches or 3,
            "start_time": to_utc_aware(ex.start_time),
            "end_time": to_utc_aware(ex.end_time),
            "status": "closed" if is_closed else ("upcoming" if is_upcoming else "available"),
            "attempt_status": attempt_status,
            "is_submitted": is_submitted,
            "attempt_id": attempt_id,
            "score": score,
        })

    return result


@router.get("/student/{exam_id}/instructions", summary="Pre-exam permission & readiness instructions")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_exam_instructions(
    request: Request,
    exam_id: int,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    assigned = db.query(models.ExamAssignment).filter(
        models.ExamAssignment.exam_id == exam_id,
        models.ExamAssignment.student_email == current_student.email,
    ).first()
    if not assigned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not assigned to this examination.")

    exam = db.query(models.Exam).filter(models.Exam.id == exam_id, or_(models.Exam.is_published == True, models.Exam.status == "published")).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Published examination not found.")

    existing_attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.exam_id == exam.id,
            models.ExamAttempt.student_email == current_student.email,
            or_(models.ExamAttempt.is_mock == False, models.ExamAttempt.is_mock.is_(None)),
        )
        .order_by(models.ExamAttempt.id.desc())
        .first()
    )
    if existing_attempt and (
        existing_attempt.submit_time is not None
        or existing_attempt.status in ["submitted", "graded", "evaluated", "pending_evaluation", "completed"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted this examination. Subsequent attempts are prohibited."
        )

    teacher = db.query(models.Teacher).filter(models.Teacher.email == exam.teacher_email).first()
    teacher_name = f"Prof. {teacher.first_name} {teacher.last_name}" if teacher else "Faculty Examiner"

    return {
        "id": exam.id,
        "title": exam.title,
        "subject": exam.subject,
        "topic": getattr(exam, "topic", None),
        "description": exam.description,
        "instructions": exam.instructions or "1. Read all questions thoroughly.\n2. Answers are autosaved continuously.\n3. Do not minimize or switch browser tabs.\n4. Ensure webcam remains visible throughout.",
        "teacher_name": teacher_name,
        "duration_minutes": exam.duration_minutes,
        "total_marks": exam.total_marks,
        "passing_marks": exam.passing_marks,
        "number_of_questions": len(exam.questions) or exam.number_of_questions,
        "ai_proctoring_enabled": bool(exam.ai_proctoring_enabled if exam.ai_proctoring_enabled is not None else True),
        "max_tab_switches": exam.max_tab_switches or 3,
        "negative_marking_enabled": bool(exam.negative_marking_enabled),
        "negative_marking_score": exam.negative_marking_score or 0.25,
        "start_time": to_utc_aware(exam.start_time),
        "end_time": to_utc_aware(exam.end_time),
    }


@router.post("/student/{exam_id}/start", summary="Start or resume an examination attempt with authoritative server timer")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def start_exam_attempt(
    request: Request,
    exam_id: int,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    assigned = db.query(models.ExamAssignment).filter(
        models.ExamAssignment.exam_id == exam_id,
        models.ExamAssignment.student_email == current_student.email,
    ).first()
    if not assigned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not assigned to this examination.")

    exam = db.query(models.Exam).filter(models.Exam.id == exam_id, or_(models.Exam.is_published == True, models.Exam.status == "published")).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Published examination not found.")

    now = datetime.datetime.utcnow()

    if exam.start_time and now < exam.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This examination has not opened yet. Scheduled start: {exam.start_time} UTC"
        )
    if exam.end_time and now > exam.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This examination window has concluded.")

    existing_attempt = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.exam_id == exam.id,
            models.ExamAttempt.student_email == current_student.email,
            or_(models.ExamAttempt.is_mock == False, models.ExamAttempt.is_mock.is_(None)),
        )
        .first()
    )

    if existing_attempt:
        if (
            existing_attempt.submit_time is not None
            or existing_attempt.status in ["submitted", "graded", "evaluated", "pending_evaluation", "completed"]
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already submitted this examination. Subsequent attempts are prohibited."
            )
        attempt = existing_attempt
    else:
        q_order = [q.id for q in sorted(exam.questions, key=lambda x: x.order_index)]
        if exam.shuffle_questions:
            random.shuffle(q_order)

        opt_order = {}
        if exam.shuffle_options:
            for q in exam.questions:
                if q.options and isinstance(q.options, list) and q.question_type in ["mcq", "multi_select"]:
                    shuffled_opts = list(q.options)
                    random.shuffle(shuffled_opts)
                    opt_order[str(q.id)] = shuffled_opts

        attempt = models.ExamAttempt(
            exam_id=exam.id,
            student_email=current_student.email,
            status="in_progress",
            start_time=now,
            total_marks=float(exam.total_marks),
            tab_switch_count=0,
            question_order=q_order,
            option_order=opt_order,
            is_mock=False,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    elapsed_seconds = (now - attempt.start_time).total_seconds()
    total_allowed_seconds = exam.duration_minutes * 60
    remaining_seconds = max(0, int(total_allowed_seconds - elapsed_seconds))

    if remaining_seconds <= 0 and attempt.status == "in_progress":
        attempt.status = "submitted"
        attempt.submit_time = now
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam time limit has expired. Your attempt has concluded.")

    await set_student_presence(
        exam_id=exam.id,
        student_email=current_student.email,
        metadata={
            "attempt_id": attempt.id,
            "student_name": f"{current_student.first_name} {current_student.last_name}",
            "roll_number": current_student.roll_number,
            "start_time": attempt.start_time.isoformat() if attempt.start_time else now.isoformat(),
        },
    )

    saved_answers = {
        ans.question_id: ans.answer_text
        for ans in db.query(models.StudentAnswer).filter(models.StudentAnswer.attempt_id == attempt.id).all()
    }

    questions_map = {q.id: q for q in exam.questions}
    ordered_ids = attempt.question_order or [q.id for q in sorted(exam.questions, key=lambda x: x.order_index)]

    questions_payload = []
    for q_id in ordered_ids:
        q = questions_map.get(q_id)
        if not q:
            continue

        opts = q.options
        if attempt.option_order and str(q.id) in attempt.option_order:
            opts = attempt.option_order[str(q.id)]

        questions_payload.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "difficulty": q.difficulty or "Medium",
            "options": opts,
            "marks": q.marks,
            "min_words": q.min_words,
            "max_words": q.max_words,
            "saved_answer": saved_answers.get(q.id, ""),
        })

    return {
        "attempt_id": attempt.id,
        "exam_id": exam.id,
        "title": exam.title,
        "subject": exam.subject,
        "topic": getattr(exam, "topic", None),
        "duration_minutes": exam.duration_minutes,
        "remaining_seconds": remaining_seconds,
        "total_marks": exam.total_marks,
        "ai_proctoring_enabled": bool(exam.ai_proctoring_enabled if exam.ai_proctoring_enabled is not None else True),
        "max_tab_switches": exam.max_tab_switches or 3,
        "current_tab_switches": attempt.tab_switch_count or 0,
        "questions": questions_payload,
        "negative_marking_enabled": bool(getattr(exam, "negative_marking_enabled", False)),
        "negative_marking_score": float(getattr(exam, "negative_marking_score", 0.0) or 0.0),
    }


@router.post("/student/attempts/{attempt_id}/save-answer", summary="Autosave student answer")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def save_student_answer(
    request: Request,
    attempt_id: int,
    answer_in: schemas.AnswerSubmit,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id).first()
    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found.")

    if (
        attempt.status != "in_progress"
        or attempt.submit_time is not None
        or attempt.status in ["submitted", "graded", "evaluated", "pending_evaluation", "completed"]
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is already finalized.")

    answer = (
        db.query(models.StudentAnswer)
        .filter(
            models.StudentAnswer.attempt_id == attempt.id,
            models.StudentAnswer.question_id == answer_in.question_id,
        )
        .first()
    )

    if answer:
        answer.answer_text = answer_in.answer_text
    else:
        answer = models.StudentAnswer(
            attempt_id=attempt.id,
            question_id=answer_in.question_id,
            answer_text=answer_in.answer_text,
        )
        db.add(answer)

    db.commit()

    await cache_saved_answer(attempt.id, answer_in.question_id, answer_in.answer_text)

    return {"status": "saved", "question_id": answer_in.question_id, "timestamp": datetime.datetime.utcnow().isoformat()}


@router.post("/student/attempts/{attempt_id}/proctoring-event", summary="Log proctoring event & enforce tab limits")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def log_proctoring_event(
    request: Request,
    attempt_id: int,
    payload: schemas.ProctoringEventCreate,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id).first()
    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found.")

    exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    max_switches = exam.max_tab_switches if exam and exam.max_tab_switches is not None else 3

    event_type = payload.event_type.strip()
    is_tab_switch = "tab" in event_type.lower() or "focus" in event_type.lower() or "fullscreen" in event_type.lower()

    if is_tab_switch:
        attempt.tab_switch_count = (attempt.tab_switch_count or 0) + 1

    incident = models.ProctoringEvent(
        attempt_id=attempt.id,
        exam_id=attempt.exam_id,
        student_email=current_student.email,
        event_type=event_type,
        severity=payload.severity or ("high" if is_tab_switch and (attempt.tab_switch_count or 0) >= max_switches else "medium"),
        details=payload.details or f"Telemetry flag recorded during active attempt (Violation Count: {attempt.tab_switch_count}).",
        review_status="flagged",
    )
    db.add(incident)
    db.commit()

    await increment_proctoring_counter(attempt.exam_id, attempt.id, event_type)

    threshold_exceeded = bool(is_tab_switch and (attempt.tab_switch_count or 0) >= max_switches)

    return {
        "status": "logged",
        "incident_id": incident.id,
        "tab_switch_count": attempt.tab_switch_count or 0,
        "max_tab_switches": max_switches,
        "threshold_exceeded": threshold_exceeded,
    }


@router.post("/student/attempts/{attempt_id}/heartbeat", summary="Update examinee heartbeat and presence")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def exam_attempt_heartbeat(
    request: Request,
    attempt_id: int,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Real-time presence tracking and heartbeat reporting for active examinee."""
    attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id).first()
    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found.")

    exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    now = datetime.datetime.utcnow()

    elapsed_seconds = (now - attempt.start_time).total_seconds()
    total_allowed_seconds = (exam.duration_minutes if exam else 60) * 60
    remaining_seconds = max(0, int(total_allowed_seconds - elapsed_seconds))

    is_expired = remaining_seconds <= 0 and attempt.status == "in_progress"
    if is_expired:
        attempt.status = "submitted"
        attempt.submit_time = now
        db.commit()
        await remove_student_presence(attempt.exam_id, current_student.email)

    if not is_expired and attempt.status == "in_progress":
        await set_student_presence(
            exam_id=attempt.exam_id,
            student_email=current_student.email,
            metadata={
                "attempt_id": attempt.id,
                "student_name": f"{current_student.first_name} {current_student.last_name}",
                "roll_number": current_student.roll_number,
            },
        )
        await record_attempt_heartbeat(
            attempt_id=attempt.id,
            student_email=current_student.email,
            client_status={"tab_switches": attempt.tab_switch_count or 0},
        )

    return {
        "status": "expired" if is_expired else "active",
        "attempt_id": attempt.id,
        "remaining_seconds": remaining_seconds,
        "tab_switches": attempt.tab_switch_count or 0,
        "server_time": now.isoformat(),
    }


@router.get("/teacher/{exam_id}/live-presence", summary="Get real-time presence of active examinees")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def get_teacher_live_presence(
    request: Request,
    exam_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Retrieve all students currently taking this examination in real-time."""
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")
    if exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    active_students = await get_active_exam_students(exam_id)

    if not active_students:
        active_attempts = (
            db.query(models.ExamAttempt)
            .filter(
                models.ExamAttempt.exam_id == exam_id,
                models.ExamAttempt.status == "in_progress",
                models.ExamAttempt.submit_time.is_(None),
            )
            .all()
        )
        active_students = [
            {
                "student_email": att.student_email,
                "exam_id": exam_id,
                "metadata": {
                    "attempt_id": att.id,
                    "start_time": att.start_time.isoformat() if att.start_time else None,
                    "source": "database_fallback",
                },
            }
            for att in active_attempts
        ]

    return {
        "exam_id": exam_id,
        "exam_title": exam.title,
        "active_examinees_count": len(active_students),
        "examinees": active_students,
    }


@router.post("/student/attempts/{attempt_id}/submit", summary="Submit examination and calculate score")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def submit_exam_attempt(
    request: Request,
    attempt_id: int,
    submission: schemas.AttemptSubmit,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    lock_acquired = await acquire_submission_lock(attempt_id, ttl_seconds=30)
    if not lock_acquired:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Submission is currently processing for this attempt. Please wait.",
        )

    try:
        attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id).first()
        if not attempt or attempt.student_email != current_student.email:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found.")

        if (
            attempt.submit_time is not None
            or attempt.status in ["submitted", "graded", "evaluated", "pending_evaluation", "completed"]
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This exam attempt has already been submitted.")

        now = datetime.datetime.utcnow()
        exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()

        for item in submission.answers:
            ans = (
                db.query(models.StudentAnswer)
                .filter(models.StudentAnswer.attempt_id == attempt.id, models.StudentAnswer.question_id == item.question_id)
                .first()
            )
            if ans:
                ans.answer_text = item.answer_text
            else:
                ans = models.StudentAnswer(
                    attempt_id=attempt.id,
                    question_id=item.question_id,
                    answer_text=item.answer_text,
                )
                db.add(ans)
        db.flush()

        total_score = 0.0
        has_pending = False
        neg_marking = bool(exam.negative_marking_enabled)
        neg_score = float(exam.negative_marking_score or 0.25)

        for q in exam.questions:
            st_ans = (
                db.query(models.StudentAnswer)
                .filter(models.StudentAnswer.attempt_id == attempt.id, models.StudentAnswer.question_id == q.id)
                .first()
            )
            user_val = (st_ans.answer_text or "").strip() if st_ans else ""

            if q.question_type == "mcq":
                corr = (q.correct_answer or "").strip()
                is_correct = bool(user_val and user_val.lower() == corr.lower())

                if is_correct:
                    awarded = float(q.marks)
                elif user_val and neg_marking:
                    awarded = -1.0 * (float(q.negative_marks) if q.negative_marks and q.negative_marks > 0 else neg_score)
                else:
                    awarded = 0.0

                total_score += awarded
                if st_ans:
                    st_ans.is_correct = is_correct
                    st_ans.awarded_marks = awarded
                    st_ans.evaluated_at = now

            elif q.question_type == "multi_select":
                corr_raw = q.correct_answer or ""
                corr_list = []
                try:
                    corr_list = json.loads(corr_raw) if (corr_raw.startswith("[") and corr_raw.endswith("]")) else [c.strip() for c in corr_raw.split(",") if c.strip()]
                except Exception:
                    corr_list = [c.strip() for c in corr_raw.split(",") if c.strip()]

                user_list = []
                try:
                    user_list = json.loads(user_val) if (user_val.startswith("[") and user_val.endswith("]")) else [u.strip() for u in user_val.split(",") if u.strip()]
                except Exception:
                    user_list = [u.strip() for u in user_val.split(",") if u.strip()]

                corr_norm = sorted([c.lower().strip() for c in corr_list])
                user_norm = sorted([u.lower().strip() for u in user_list])
                is_correct = bool(user_norm and user_norm == corr_norm)

                if is_correct:
                    awarded = float(q.marks)
                elif user_norm and neg_marking:
                    awarded = -1.0 * (float(q.negative_marks) if q.negative_marks and q.negative_marks > 0 else neg_score)
                else:
                    awarded = 0.0

                total_score += awarded
                if st_ans:
                    st_ans.is_correct = is_correct
                    st_ans.awarded_marks = awarded
                    st_ans.evaluated_at = now

            else:
                ai_eval = evaluate_subjective_answer(
                    question_text=q.question_text,
                    question_type=q.question_type,
                    model_answer=q.correct_answer or q.explanation or "",
                    max_marks=float(q.marks),
                    student_answer=user_val,
                )
                if ai_eval:
                    awarded = float(ai_eval["awarded_marks"])
                    total_score += awarded
                    if st_ans:
                        st_ans.is_correct = ai_eval["is_correct"]
                        st_ans.awarded_marks = awarded
                        st_ans.teacher_feedback = ai_eval["feedback"]
                        st_ans.evaluated_at = now
                else:
                    has_pending = True
                    if st_ans:
                        st_ans.is_correct = None
                        st_ans.awarded_marks = 0.0

        attempt.status = "pending_evaluation" if has_pending else "evaluated"
        attempt.submit_time = now
        attempt.score = max(0.0, round(total_score, 2))
        attempt.total_marks = float(exam.total_marks)
        db.commit()
        db.refresh(attempt)

        await remove_student_presence(attempt.exam_id, current_student.email)
        await invalidate_exam_related_caches(
            teacher_email=exam.teacher_email if exam else None,
        )

        return {
            "message": "Examination submitted successfully!",
            "attempt_id": attempt.id,
            "exam_title": exam.title,
            "score": attempt.score,
            "total_marks": attempt.total_marks,
            "passing_marks": exam.passing_marks,
            "passed": (attempt.score or 0) >= exam.passing_marks,
            "percentage": round(((attempt.score or 0.0) / (attempt.total_marks or 1.0)) * 100, 1),
            "status": attempt.status,
        }
    finally:
        await release_submission_lock(attempt_id)


@router.get("/student/attempts/{attempt_id}/result", summary="Get student examination result")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_student_result(
    request: Request,
    attempt_id: int,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id).first()
    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")

    exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    tot = attempt.total_marks or (exam.total_marks if exam else 100)

    return {
        "attempt_id": attempt.id,
        "exam_title": exam.title if exam else "Assessment",
        "subject": exam.subject if exam else "",
        "status": attempt.status,
        "score": attempt.score,
        "total_marks": tot,
        "percentage": round(((attempt.score or 0.0) / (tot or 1.0)) * 100, 1),
        "passing_marks": exam.passing_marks if exam else 40,
        "passed": (attempt.score or 0) >= (exam.passing_marks if exam else 40),
        "start_time": attempt.start_time,
        "submit_time": attempt.submit_time,
    }



@router.get("/teacher/{exam_id}/submissions", summary="View all submissions for an exam")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_teacher_exam_submissions(
    request: Request,
    exam_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    attempts = (
        db.query(models.ExamAttempt)
        .filter(models.ExamAttempt.exam_id == exam_id, or_(models.ExamAttempt.is_mock == False, models.ExamAttempt.is_mock.is_(None)))
        .order_by(models.ExamAttempt.submit_time.desc().nullslast())
        .all()
    )

    results = []
    for att in attempts:
        student = db.query(models.Student).filter(models.Student.email == att.student_email).first()
        alerts_count = db.query(models.ProctoringEvent).filter(models.ProctoringEvent.attempt_id == att.id).count()

        pct = round(((att.score or 0.0) / (att.total_marks or exam.total_marks)) * 100, 1) if att.total_marks else 0.0

        results.append({
            "attempt_id": att.id,
            "student_name": f"{student.first_name} {student.last_name}" if student else att.student_email,
            "student_email": att.student_email,
            "roll_number": student.roll_number if student else "N/A",
            "class_year": student.class_year if student else "N/A",
            "status": att.status,
            "start_time": att.start_time,
            "submit_time": att.submit_time,
            "score": att.score,
            "total_marks": att.total_marks or exam.total_marks,
            "percentage": pct,
            "passed": (att.score or 0) >= exam.passing_marks if att.score is not None else None,
            "tab_switch_count": att.tab_switch_count or 0,
            "proctoring_alerts_count": alerts_count,
        })

    return {
        "exam_id": exam.id,
        "title": exam.title,
        "subject": exam.subject,
        "total_marks": exam.total_marks,
        "passing_marks": exam.passing_marks,
        "total_submissions": len(results),
        "submissions": results,
    }


@router.get("/teacher/{exam_id}/submissions/{attempt_id}", summary="Get detailed candidate attempt & proctoring audit")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_attempt_detail(
    request: Request,
    exam_id: int,
    attempt_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id, models.ExamAttempt.exam_id == exam_id).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")

    student = db.query(models.Student).filter(models.Student.email == attempt.student_email).first()

    answers_map = {
        sa.question_id: sa
        for sa in db.query(models.StudentAnswer).filter(models.StudentAnswer.attempt_id == attempt.id).all()
    }

    questions_data = []
    for q in sorted(exam.questions, key=lambda x: x.order_index):
        sa = answers_map.get(q.id)
        questions_data.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "max_marks": q.marks,
            "options": q.options,
            "student_answer": sa.answer_text if sa else None,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
            "awarded_marks": sa.awarded_marks if sa else 0.0,
            "is_correct": sa.is_correct if sa else None,
            "teacher_feedback": sa.teacher_feedback if sa else None,
        })

    incidents = (
        db.query(models.ProctoringEvent)
        .filter(models.ProctoringEvent.attempt_id == attempt.id)
        .order_by(models.ProctoringEvent.created_at.asc())
        .all()
    )

    incidents_data = [
        {
            "id": inc.id,
            "event_type": inc.event_type,
            "severity": inc.severity,
            "details": inc.details,
            "review_status": inc.review_status,
            "created_at": inc.created_at,
        }
        for inc in incidents
    ]

    return {
        "attempt_id": attempt.id,
        "exam_id": exam.id,
        "exam_title": exam.title,
        "student": {
            "name": f"{student.first_name} {student.last_name}" if student else attempt.student_email,
            "email": attempt.student_email,
            "roll_number": student.roll_number if student else "N/A",
            "class_year": student.class_year if student else "N/A",
            "institute": student.institute if student else "N/A",
        },
        "score": attempt.score,
        "total_marks": attempt.total_marks or exam.total_marks,
        "passing_marks": exam.passing_marks,
        "status": attempt.status,
        "start_time": attempt.start_time,
        "submit_time": attempt.submit_time,
        "tab_switch_count": attempt.tab_switch_count or 0,
        "questions": questions_data,
        "proctoring_events": incidents_data,
    }


@router.post("/teacher/attempts/{attempt_id}/evaluate-answer", summary="Teacher manual grade and feedback update")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def manual_evaluate_answer(
    request: Request,
    attempt_id: int,
    payload: schemas.SubjectiveEvaluationRequest,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")

    exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    if not exam or exam.teacher_email != current_teacher.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    question = db.query(models.Question).filter(models.Question.id == payload.question_id, models.Question.exam_id == exam.id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    if payload.awarded_marks < 0 or payload.awarded_marks > float(question.marks):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Awarded marks must be between 0.0 and max marks ({question.marks})."
        )

    sa = (
        db.query(models.StudentAnswer)
        .filter(models.StudentAnswer.attempt_id == attempt.id, models.StudentAnswer.question_id == question.id)
        .first()
    )

    now = datetime.datetime.utcnow()
    is_corr = bool(payload.awarded_marks > 0.0)

    if not sa:
        sa = models.StudentAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_text="",
            is_correct=is_corr,
            awarded_marks=float(payload.awarded_marks),
            teacher_feedback=payload.feedback.strip() if payload.feedback else None,
            evaluated_at=now,
        )
        db.add(sa)
    else:
        sa.awarded_marks = float(payload.awarded_marks)
        sa.is_correct = is_corr
        sa.teacher_feedback = payload.feedback.strip() if payload.feedback else None
        sa.evaluated_at = now

    db.flush()

    all_ans = db.query(models.StudentAnswer).filter(models.StudentAnswer.attempt_id == attempt.id).all()
    attempt.score = round(sum(a.awarded_marks or 0.0 for a in all_ans), 2)
    db.commit()
    db.refresh(attempt)

    return {"message": "Grade and feedback updated successfully", "attempt_id": attempt.id, "new_score": attempt.score}
