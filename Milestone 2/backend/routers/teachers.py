from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from database import get_db
import models
import schemas
from dependencies import get_current_teacher
from services.rate_limit_service import limiter, RATE_LIMIT_AUTHENTICATED
from services.redis_service import (
    make_teacher_dashboard_key,
    get_cached_json,
    set_cached_json,
)

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.get("/me", response_model=schemas.TeacherResponse, summary="Get current authenticated teacher profile")
def get_teacher_profile(current_teacher: models.Teacher = Depends(get_current_teacher)):
    return schemas.TeacherResponse.model_validate(current_teacher)


def get_teacher_scope_filters(current_teacher: models.Teacher, db: Session):
    """
    Returns (candidate_emails, taught_subjects, scope_conditions) for authorized scope.
    """
    candidate_emails = set(
        row[0]
        for row in (
            db.query(models.ExamAttempt.student_email)
            .join(models.Exam, models.Exam.id == models.ExamAttempt.exam_id)
            .filter(
                models.Exam.teacher_email == current_teacher.email,
                models.ExamAttempt.is_mock == False,
            )
            .all()
        )
    )

    taught_subjects = set(
        row[0]
        for row in (
            db.query(models.Exam.subject)
            .filter(models.Exam.teacher_email == current_teacher.email)
            .all()
        )
    )

    scope_conditions = [models.Exam.teacher_email == current_teacher.email]
    if candidate_emails:
        scope_conditions.append(models.ExamAttempt.student_email.in_(candidate_emails))
    if taught_subjects:
        scope_conditions.append(models.Exam.subject.in_(taught_subjects))

    return candidate_emails, taught_subjects, scope_conditions


@router.get("/dashboard-summary", summary="Get dashboard summary for teacher")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def get_teacher_dashboard_summary(
    request: Request,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    cache_key = make_teacher_dashboard_key(current_teacher.email)
    cached = await get_cached_json(cache_key)
    if cached is not None:
        return cached

    student_query = db.query(models.Student).filter(
        models.Student.approval_status == "approved",
        models.Student.is_active == True,
    )
    if current_teacher.institute and current_teacher.institute.lower() not in ["not specified", "general"]:
        inst_students = student_query.filter(models.Student.institute.ilike(f"%{current_teacher.institute}%")).count()
        total_students = inst_students if inst_students > 0 else student_query.count()
    else:
        total_students = student_query.count()

    teacher_exams = (
        db.query(models.Exam)
        .filter(models.Exam.teacher_email == current_teacher.email)
        .order_by(models.Exam.created_at.desc())
        .all()
    )

    total_exams = len(teacher_exams)
    draft_exams = sum(1 for e in teacher_exams if (getattr(e, 'status', None) == 'draft' or (not e.is_published and getattr(e, 'status', None) != 'closed')))
    published_exams = sum(1 for e in teacher_exams if (getattr(e, 'status', None) == 'published' or e.is_published))
    closed_exams = sum(1 for e in teacher_exams if getattr(e, 'status', None) == 'closed')

    exam_ids = [e.id for e in teacher_exams]
    total_questions = 0
    if exam_ids:
        total_questions = db.query(models.Question).filter(models.Question.exam_id.in_(exam_ids)).count()

    total_submissions = 0
    if exam_ids:
        total_submissions = (
            db.query(models.ExamAttempt)
            .filter(
                models.ExamAttempt.exam_id.in_(exam_ids),
                models.ExamAttempt.is_mock == False,
                models.ExamAttempt.status.in_(["submitted", "evaluated", "graded"]),
            )
            .count()
        )

    candidate_emails, taught_subjects, _ = get_teacher_scope_filters(current_teacher, db)
    proctoring_conditions = []
    if exam_ids:
        proctoring_conditions.append(models.ProctoringEvent.exam_id.in_(exam_ids))
    if candidate_emails:
        proctoring_conditions.append(models.ProctoringEvent.student_email.in_(candidate_emails))

    if proctoring_conditions:
        proctoring_count = db.query(models.ProctoringEvent).filter(or_(*proctoring_conditions)).count()
    else:
        proctoring_count = 0

    recent_exams_data = []
    for exam in teacher_exams[:6]:
        assigned_count = db.query(models.ExamAssignment).filter(models.ExamAssignment.exam_id == exam.id).count()
        submission_count = db.query(models.ExamAttempt).filter(
            models.ExamAttempt.exam_id == exam.id,
            models.ExamAttempt.is_mock == False,
            models.ExamAttempt.status.in_(["submitted", "evaluated", "graded"]),
        ).count()

        q_count = len(exam.questions) if exam.questions else 0
        raw_status = getattr(exam, 'status', 'published' if exam.is_published else 'draft')
        display_status = "Published" if raw_status == "published" else ("Closed" if raw_status == "closed" else "Draft")

        recent_exams_data.append({
            "id": exam.id,
            "title": exam.title,
            "subject": exam.subject,
            "topic": getattr(exam, 'topic', None),
            "status": display_status,
            "raw_status": raw_status,
            "number_of_questions": q_count,
            "total_marks": exam.total_marks,
            "duration_minutes": exam.duration_minutes,
            "candidates_enrolled": assigned_count or total_students,
            "assigned_count": assigned_count,
            "submissions_received": submission_count,
            "created_at": exam.created_at,
        })

    response_data = {
        "teacher": schemas.TeacherResponse.model_validate(current_teacher),
        "metrics": {
            "total_students_enrolled": total_students,
            "total_approved_students": total_students,
            "total_exams": total_exams,
            "draft_exams": draft_exams,
            "published_exams": published_exams,
            "closed_exams": closed_exams,
            "active_exams": published_exams,
            "total_submissions": total_submissions,
            "questions_bank_count": total_questions,
            "proctoring_alerts_flagged": proctoring_count,
        },
        "recent_exams": recent_exams_data,
    }
    await set_cached_json(cache_key, response_data, ttl_seconds=30)
    return response_data


@router.get("/students", summary="Get approved students accessible to teacher")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_teacher_students(
    request: Request,
    search: Optional[str] = Query(None, description="Search by name, email, roll number, or class"),
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Returns real approved students accessible to the authenticated teacher.
    Filters by approval_status == 'approved' and matches institutional relationship.
    Supports searching by name, email, roll number, or class.
    """
    query = db.query(models.Student).filter(
        models.Student.approval_status == "approved",
        models.Student.is_active == True,
    )

    if current_teacher.institute and current_teacher.institute.lower() not in ["not specified", "general"]:
        inst_query = query.filter(models.Student.institute.ilike(f"%{current_teacher.institute}%"))
        if inst_query.count() > 0:
            query = inst_query

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Student.first_name.ilike(term),
                models.Student.last_name.ilike(term),
                models.Student.email.ilike(term),
                models.Student.roll_number.ilike(term),
                models.Student.class_year.ilike(term),
                models.Student.institute.ilike(term),
            )
        )

    students = query.order_by(models.Student.first_name.asc(), models.Student.last_name.asc()).all()

    return [
        {
            "first_name": s.first_name,
            "last_name": s.last_name,
            "name": f"{s.first_name} {s.last_name}",
            "email": s.email,
            "roll_number": s.roll_number,
            "class_year": s.class_year,
            "institute": s.institute,
            "approval_status": s.approval_status,
            "created_at": s.created_at,
        }
        for s in students
    ]


@router.get(
    "/mock-tests",
    response_model=schemas.TeacherMockTestActivityResponse,
    summary="Get student mock test attempts and results within teacher's scope",
)
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_teacher_mock_test_activity(
    request: Request,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    evaluation_status: Optional[str] = None,
):
    candidate_emails, taught_subjects, scope_conditions = get_teacher_scope_filters(current_teacher, db)

    query = (
        db.query(models.ExamAttempt)
        .join(models.Exam, models.Exam.id == models.ExamAttempt.exam_id)
        .filter(
            models.ExamAttempt.is_mock == True,
            models.ExamAttempt.status.in_(["submitted", "completed", "pending_evaluation", "evaluated"]),
            models.ExamAttempt.submit_time.isnot(None),
        )
    )

    query = query.filter(or_(*scope_conditions))

    attempts_all = (
        query.order_by(models.ExamAttempt.submit_time.desc())
        .all()
    )

    items = []
    for att in attempts_all:
        exam = att.exam or db.query(models.Exam).filter(models.Exam.id == att.exam_id).first()
        student = db.query(models.Student).filter(models.Student.email == att.student_email).first()
        student_answers = att.student_answers or []

        total_q = len(exam.questions) if (exam and exam.questions) else len(student_answers)
        q_answered = sum(1 for a in student_answers if a.answer_text and a.answer_text.strip())
        correct_cnt = sum(1 for a in student_answers if a.is_correct is True)
        incorrect_cnt = sum(1 for a in student_answers if a.is_correct is False)
        has_pending_subjective = any(a.is_correct is None for a in student_answers) or att.status == "pending_evaluation"

        eval_status = "pending_evaluation" if has_pending_subjective else "completed"
        total_marks_val = float(att.total_marks or (exam.total_marks if exam else 0.0) or 1.0)
        score_val = float(att.score) if att.score is not None else 0.0
        percentage_val = round((score_val / total_marks_val) * 100, 1) if total_marks_val > 0 else 0.0
        passed_val = (score_val >= (exam.passing_marks or 0)) if (exam and exam.passing_marks is not None) else None

        student_name = f"{student.first_name} {student.last_name}" if student else att.student_email
        roll_num = student.roll_number if student else "N/A"
        exam_title = exam.title if exam else "Mock Test"
        exam_subject = exam.subject if exam else "General"

        if search:
            search_lower = search.lower().strip()
            match = (
                search_lower in student_name.lower()
                or search_lower in att.student_email.lower()
                or search_lower in roll_num.lower()
                or search_lower in exam_title.lower()
                or search_lower in exam_subject.lower()
            )
            if not match:
                continue

        if evaluation_status and evaluation_status != "all":
            if evaluation_status == "pending_evaluation" and eval_status != "pending_evaluation":
                continue
            if evaluation_status == "completed" and eval_status != "completed":
                continue

        items.append(
            schemas.TeacherMockTestAttemptItem(
                attempt_id=att.id,
                student_id=roll_num if roll_num != "N/A" else att.student_email,
                student_name=student_name,
                student_email=att.student_email,
                roll_number=roll_num,
                mock_title=exam_title,
                subject=exam_subject,
                difficulty="Standard",
                total_questions=total_q,
                questions_answered=q_answered,
                correct_count=correct_cnt,
                incorrect_count=incorrect_cnt,
                score=score_val,
                total_marks=total_marks_val,
                percentage=percentage_val,
                passed=passed_val,
                status="completed" if att.status in ["submitted", "completed", "evaluated"] else att.status,
                evaluation_status=eval_status,
                start_time=att.start_time,
                submit_time=att.submit_time,
            )
        )

    paginated_items = items[skip : skip + limit]

    return schemas.TeacherMockTestActivityResponse(
        total_attempts=len(items),
        attempts=paginated_items,
    )


@router.get(
    "/mock-tests/{attempt_id}",
    response_model=schemas.TeacherAttemptDetailResponse,
    summary="Get comprehensive mock test result details and analytics for an attempt",
)
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_teacher_mock_test_detail(
    request: Request,
    attempt_id: int,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found.")

    exam = attempt.exam or db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated examination not found.")

    candidate_emails, taught_subjects, _ = get_teacher_scope_filters(current_teacher, db)
    is_owner = (exam.teacher_email == current_teacher.email)
    is_candidate = (attempt.student_email in candidate_emails)
    is_taught_subject = (exam.subject in taught_subjects)

    if not (is_owner or is_candidate or is_taught_subject):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to view results for this attempt.",
        )

    student = db.query(models.Student).filter(models.Student.email == attempt.student_email).first()
    student_name = f"{student.first_name} {student.last_name}" if student else attempt.student_email
    roll_number = student.roll_number if student else "N/A"
    institute = student.institute if student else "N/A"
    class_year = student.class_year if student else "N/A"

    questions = sorted(exam.questions, key=lambda x: x.order_index)
    answers_map = {sa.question_id: sa for sa in attempt.student_answers}

    question_review_details = []
    correct_count = 0
    incorrect_count = 0
    pending_subj_count = 0
    questions_answered = 0

    for q in questions:
        sa = answers_map.get(q.id)
        user_ans = sa.answer_text if sa else ""
        is_corr = sa.is_correct if sa else None
        awarded = float(sa.awarded_marks) if sa else 0.0
        feedback = sa.teacher_feedback if sa else None
        eval_at = sa.evaluated_at if sa else None

        is_answered = bool(user_ans and user_ans.strip())
        if is_answered:
            questions_answered += 1

        if not is_answered:
            q_eval_status = "unanswered"
        elif q.question_type == "mcq":
            if is_corr is True:
                q_eval_status = "correct"
                correct_count += 1
            else:
                q_eval_status = "incorrect"
                incorrect_count += 1
        else:
            if is_corr is None:
                q_eval_status = "pending_evaluation"
                pending_subj_count += 1
            else:
                q_eval_status = "evaluated"

        question_review_details.append(
            schemas.QuestionReviewDetail(
                question_id=q.id,
                answer_id=sa.id if sa else None,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options,
                user_answer=user_ans,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                is_correct=is_corr,
                awarded_marks=awarded,
                max_marks=q.marks,
                evaluation_status=q_eval_status,
                teacher_feedback=feedback,
                evaluated_at=eval_at,
            )
        )

    total_q = len(questions)
    questions_unanswered = total_q - questions_answered
    total_marks_val = float(attempt.total_marks or (exam.total_marks if exam else 1.0) or 1.0)
    score_val = float(attempt.score) if attempt.score is not None else 0.0
    percentage_val = round((score_val / total_marks_val) * 100, 1) if total_marks_val > 0 else 0.0
    passed_val = (score_val >= (exam.passing_marks or 0)) if (exam and exam.passing_marks is not None) else False

    overall_eval_status = "pending_evaluation" if pending_subj_count > 0 else "completed"

    duration_used_seconds = None
    if attempt.start_time and attempt.submit_time:
        duration_used_seconds = int((attempt.submit_time - attempt.start_time).total_seconds())

    all_student_attempts = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.student_email == attempt.student_email,
            models.ExamAttempt.is_mock == True,
            models.ExamAttempt.submit_time.isnot(None),
            models.ExamAttempt.status.in_(["submitted", "completed", "pending_evaluation", "evaluated"]),
        )
        .order_by(models.ExamAttempt.submit_time.asc())
        .all()
    )

    history_items = []
    subject_map = {}

    for att_h in all_student_attempts:
        ex_h = att_h.exam or db.query(models.Exam).filter(models.Exam.id == att_h.exam_id).first()
        h_title = ex_h.title if ex_h else "Mock Assessment"
        h_subj = ex_h.subject if ex_h else "General"
        h_total_marks = float(att_h.total_marks or (ex_h.total_marks if ex_h else 1.0) or 1.0)
        h_score = float(att_h.score or 0.0)
        h_perc = round((h_score / h_total_marks) * 100, 1) if h_total_marks > 0 else 0.0
        h_has_pending = any(a.is_correct is None for a in (att_h.student_answers or []))

        history_items.append(
            schemas.AttemptHistoryItem(
                attempt_id=att_h.id,
                exam_id=att_h.exam_id,
                title=h_title,
                subject=h_subj,
                date=att_h.submit_time,
                score=h_score,
                total_marks=h_total_marks,
                percentage=h_perc,
                status=att_h.status,
                evaluation_status="pending_evaluation" if h_has_pending else "completed",
                is_current=(att_h.id == attempt.id),
            )
        )

        if h_subj not in subject_map:
            subject_map[h_subj] = {"scores": [], "percentages": [], "count": 0}
        subject_map[h_subj]["scores"].append(h_score)
        subject_map[h_subj]["percentages"].append(h_perc)
        subject_map[h_subj]["count"] += 1

    total_hist_count = len(history_items)
    if total_hist_count > 0:
        avg_score = round(sum(h.score for h in history_items) / total_hist_count, 1)
        avg_perc = round(sum(h.percentage for h in history_items) / total_hist_count, 1)
        highest_score = max(h.score for h in history_items)
        highest_perc = max(h.percentage for h in history_items)
        lowest_score = min(h.score for h in history_items)
        lowest_perc = min(h.percentage for h in history_items)
    else:
        avg_score = score_val
        avg_perc = percentage_val
        highest_score = score_val
        highest_perc = percentage_val
        lowest_score = score_val
        lowest_perc = percentage_val

    has_trend = total_hist_count >= 2
    trend = None
    improvement_percentage = None
    if has_trend:
        latest_perc = history_items[-1].percentage
        prev_perc = history_items[-2].percentage
        diff = round(latest_perc - prev_perc, 1)
        improvement_percentage = diff
        if diff > 0:
            trend = "improving"
        elif diff < 0:
            trend = "declining"
        else:
            trend = "stable"

    subject_breakdown = []
    weak_areas = []
    strong_areas = []

    for subj, data_s in subject_map.items():
        s_count = data_s["count"]
        s_avg_score = round(sum(data_s["scores"]) / s_count, 1) if s_count > 0 else 0.0
        s_avg_perc = round(sum(data_s["percentages"]) / s_count, 1) if s_count > 0 else 0.0
        accuracy = s_avg_perc

        subject_breakdown.append(
            schemas.SubjectPerformanceItem(
                subject=subj,
                attempts_count=s_count,
                average_score=s_avg_score,
                average_percentage=s_avg_perc,
                accuracy=accuracy,
            )
        )

        if s_avg_perc < 50.0:
            weak_areas.append(subj)
        elif s_avg_perc >= 70.0:
            strong_areas.append(subj)

    total_objective_answered = correct_count + incorrect_count
    accuracy_rate = round((correct_count / total_objective_answered) * 100, 1) if total_objective_answered > 0 else 0.0
    completion_rate = round((questions_answered / total_q) * 100, 1) if total_q > 0 else 0.0

    analytics = schemas.StudentProgressAnalytics(
        total_attempts_count=total_hist_count,
        average_score=avg_score,
        average_percentage=avg_perc,
        highest_score=highest_score,
        highest_percentage=highest_perc,
        lowest_score=lowest_score,
        lowest_percentage=lowest_perc,
        improvement_percentage=improvement_percentage,
        trend=trend,
        has_trend=has_trend,
        accuracy_rate=accuracy_rate,
        completion_rate=completion_rate,
        subject_breakdown=subject_breakdown,
        weak_areas=weak_areas,
        strong_areas=strong_areas,
    )

    return schemas.TeacherAttemptDetailResponse(
        student_name=student_name,
        student_email=attempt.student_email,
        roll_number=roll_number,
        institute=institute,
        class_year=class_year,
        exam_id=exam.id,
        exam_title=exam.title,
        subject=exam.subject,
        instructions=exam.instructions,
        duration_minutes=exam.duration_minutes,
        passing_marks=exam.passing_marks or 0,
        attempt_id=attempt.id,
        status="completed" if attempt.status in ["submitted", "completed", "evaluated"] else attempt.status,
        evaluation_status=overall_eval_status,
        start_time=attempt.start_time,
        submit_time=attempt.submit_time,
        duration_used_seconds=duration_used_seconds,
        score=score_val,
        total_marks=total_marks_val,
        percentage=percentage_val,
        passed=passed_val,
        total_questions=total_q,
        questions_answered=questions_answered,
        questions_unanswered=questions_unanswered,
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        pending_subjective_count=pending_subj_count,
        questions=question_review_details,
        history=history_items,
        analytics=analytics,
    )


@router.post(
    "/mock-tests/{attempt_id}/evaluate-answer",
    response_model=schemas.TeacherAttemptDetailResponse,
    summary="Evaluate a student subjective answer, award marks and feedback, and update attempt score",
)
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def evaluate_subjective_answer(
    request: Request,
    attempt_id: int,
    payload: schemas.SubjectiveEvaluationRequest,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    attempt = db.query(models.ExamAttempt).filter(models.ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found.")

    exam = attempt.exam or db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated examination not found.")

    candidate_emails, taught_subjects, _ = get_teacher_scope_filters(current_teacher, db)
    is_owner = (exam.teacher_email == current_teacher.email)
    is_candidate = (attempt.student_email in candidate_emails)
    is_taught_subject = (exam.subject in taught_subjects)

    if not (is_owner or is_candidate or is_taught_subject):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to evaluate this candidate attempt.",
        )

    question = (
        db.query(models.Question)
        .filter(models.Question.id == payload.question_id, models.Question.exam_id == exam.id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found in this examination.")

    if question.question_type == "mcq":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MCQ questions are graded automatically by the objective evaluation engine.",
        )

    if payload.awarded_marks < 0.0 or payload.awarded_marks > float(question.marks):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Awarded marks ({payload.awarded_marks}) must be between 0.0 and maximum marks ({question.marks}).",
        )

    student_ans = (
        db.query(models.StudentAnswer)
        .filter(
            models.StudentAnswer.attempt_id == attempt.id,
            models.StudentAnswer.question_id == question.id,
        )
        .first()
    )

    now = datetime.utcnow()
    is_corr = bool(payload.awarded_marks > 0.0)

    if not student_ans:
        student_ans = models.StudentAnswer(
            attempt_id=attempt.id,
            question_id=question.id,
            answer_text="",
            is_correct=is_corr,
            awarded_marks=float(payload.awarded_marks),
            teacher_feedback=payload.feedback.strip() if payload.feedback else None,
            evaluated_at=now,
        )
        db.add(student_ans)
    else:
        student_ans.awarded_marks = float(payload.awarded_marks)
        student_ans.is_correct = is_corr
        student_ans.teacher_feedback = payload.feedback.strip() if payload.feedback else None
        student_ans.evaluated_at = now

    db.flush()

    all_answers = (
        db.query(models.StudentAnswer)
        .filter(models.StudentAnswer.attempt_id == attempt.id)
        .all()
    )
    new_score = sum(sa.awarded_marks or 0.0 for sa in all_answers)
    attempt.score = new_score

    all_questions = db.query(models.Question).filter(models.Question.exam_id == exam.id).all()
    ans_map = {sa.question_id: sa for sa in all_answers}
    has_pending = False
    for q in all_questions:
        if q.question_type != "mcq":
            sa = ans_map.get(q.id)
            if not sa or sa.is_correct is None:
                has_pending = True
                break

    attempt.status = "pending_evaluation" if has_pending else "evaluated"
    db.commit()
    db.refresh(attempt)

    return get_teacher_mock_test_detail(
        request=request,
        attempt_id=attempt.id,
        current_teacher=current_teacher,
        db=db,
    )



@router.get(
    "/proctoring-incidents",
    response_model=List[schemas.ProctoringIncidentResponse],
    summary="Get proctoring incidents flagged within teacher's instructional scope",
)
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_teacher_proctoring_incidents(
    request: Request,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    teacher_exams = db.query(models.Exam).filter(models.Exam.teacher_email == current_teacher.email).all()
    exam_ids = [e.id for e in teacher_exams]
    candidate_emails, taught_subjects, _ = get_teacher_scope_filters(current_teacher, db)

    scope_conditions = []
    if exam_ids:
        scope_conditions.append(models.ProctoringEvent.exam_id.in_(exam_ids))
    if candidate_emails:
        scope_conditions.append(models.ProctoringEvent.student_email.in_(candidate_emails))

    if not scope_conditions:
        return []

    incidents = (
        db.query(models.ProctoringEvent)
        .filter(or_(*scope_conditions))
        .order_by(desc(models.ProctoringEvent.created_at))
        .limit(100)
        .all()
    )

    results = []
    for inc in incidents:
        st = db.query(models.Student).filter(models.Student.email == inc.student_email).first()
        ex = db.query(models.Exam).filter(models.Exam.id == inc.exam_id).first() if inc.exam_id else None
        results.append(
            schemas.ProctoringIncidentResponse(
                id=inc.id,
                attempt_id=inc.attempt_id,
                exam_id=inc.exam_id,
                exam_title=ex.title if ex else "Examination Assessment",
                student_name=f"{st.first_name} {st.last_name}" if st else inc.student_email,
                student_email=inc.student_email,
                roll_number=st.roll_number if st else "N/A",
                event_type=inc.event_type,
                severity=inc.severity or "medium",
                details=inc.details,
                review_status=inc.review_status or "flagged",
                created_at=inc.created_at,
            )
        )
    return results


@router.post(
    "/proctoring-incidents/{incident_id}/review",
    summary="Review and update proctoring incident status",
)
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def review_proctoring_incident(
    request: Request,
    incident_id: int,
    payload: schemas.ProctoringIncidentReviewRequest,
    current_teacher: models.Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    incident = db.query(models.ProctoringEvent).filter(models.ProctoringEvent.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proctoring incident not found.")

    incident.review_status = payload.review_status
    if payload.notes:
        incident.details = (incident.details or "") + f" [Instructor Review: {payload.notes}]"
    db.commit()
    db.refresh(incident)
    return {
        "message": "Incident review updated successfully",
        "incident_id": incident.id,
        "review_status": incident.review_status,
    }
