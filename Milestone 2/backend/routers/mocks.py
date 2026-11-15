import os
import json
import uuid
import datetime
import random
import time
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
import models
import schemas
from dependencies import get_current_student
from services.rate_limit_service import limiter, RATE_LIMIT_AUTHENTICATED
from services.ai_service import generate_exam_questions, evaluate_subjective_answer
from services.validation_service import (
    validate_and_refine_question,
    grade_objective_question,
    clean_latex_formula
)

router = APIRouter(prefix="/mocks", tags=["AI Practice Tests"])

SUGGESTED_TOPICS = {
    "Computer Science & Engineering": [
        "Algorithms & Data Structures",
        "Operating Systems & Memory Management",
        "Computer Networks & Network Security",
        "Database Management Systems & Normalization",
        "Object-Oriented Design & Principles"
    ],
    "Artificial Intelligence & Machine Learning": [
        "Supervised & Unsupervised Learning",
        "Deep Neural Networks & Backpropagation",
        "Natural Language Processing & Transformers",
        "Model Evaluation: Bias-Variance & Metrics",
        "Reinforcement Learning Basics"
    ],
    "Physics & Engineering Thermodynamics": [
        "Reversible Adiabatic & Isothermal Processes",
        "First & Second Laws of Thermodynamics",
        "Carnot Engine & Entropy Calculations",
        "Fluid Dynamics & Bernoulli's Principle",
        "Electromagnetism & Maxwell's Equations"
    ],
    "Mathematics & Discrete Structures": [
        "Probability Theory & Bayes' Rule",
        "Linear Algebra: Eigenvalues & Vector Spaces",
        "Calculus: Integration & Optimization",
        "Graph Theory & Combinatorics",
        "Differential Equations"
    ],
    "Software Engineering & Cloud Architecture": [
        "Distributed Systems & Consensus Protocols",
        "RESTful API Design & Microservices",
        "Containerization & Kubernetes Basics",
        "Authentication: JWT & OAuth 2.0 Protocols",
        "Database Indexing & Query Optimization"
    ]
}

CURATED_FALLBACK_BANK = [
    {
        "subject": "Computer Science & Engineering",
        "topic": "Algorithms & Data Structures",
        "question_text": "What is the worst-case time complexity of searching an element in a balanced AVL tree with $n$ nodes?",
        "question_type": "mcq",
        "difficulty": "Medium",
        "options": ["$O(\\log n)$", "$O(n)$", "$O(1)$", "$O(n \\log n)$"],
        "correct_answer": "$O(\\log n)$",
        "explanation": "Because an AVL tree is strictly height-balanced with height bounded by $1.44 \\log_2 n$, lookup operations take $O(\\log n)$ in the worst case.",
        "marks": 1,
    },
    {
        "subject": "Computer Science & Engineering",
        "topic": "Operating Systems & Memory Management",
        "question_text": "Which of the following conditions are necessary for a system deadlock to occur according to the Coffman conditions?",
        "question_type": "multi_select",
        "difficulty": "Medium",
        "options": [
            "Mutual Exclusion",
            "Hold and Wait",
            "No Preemption",
            "Linear Memory Paging"
        ],
        "correct_answer": '["Mutual Exclusion", "Hold and Wait", "No Preemption"]',
        "explanation": "The four Coffman conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Linear Memory Paging is unrelated to deadlock.",
        "marks": 2,
    },
    {
        "subject": "Computer Science & Engineering",
        "topic": "Algorithms & Data Structures",
        "question_text": "Briefly explain the key difference between Dijkstra's algorithm and the Bellman-Ford algorithm for shortest paths.",
        "question_type": "short_answer",
        "difficulty": "Medium",
        "options": None,
        "correct_answer": "Dijkstra uses a greedy approach with a priority queue achieving O((V+E)log V) but fails on negative edge weights, whereas Bellman-Ford can handle negative weights and detect negative cycles in O(V*E) time.",
        "explanation": "Dijkstra is faster but requires non-negative edge weights; Bellman-Ford handles negative weights and detects negative weight cycles.",
        "marks": 3,
    },
    {
        "subject": "Physics & Engineering Thermodynamics",
        "topic": "Reversible Adiabatic & Isothermal Processes",
        "question_text": "For a reversible adiabatic process involving an ideal gas with heat capacity ratio $\\gamma = C_p/C_v$, which fundamental thermodynamic relation holds true?",
        "question_type": "mcq",
        "difficulty": "Medium",
        "options": [
            "$PV^\\gamma = \\text{constant}$",
            "$TV^{\\gamma-1} = \\text{constant}$",
            "$P/T = \\text{constant}$",
            "$V/T = \\text{constant}$"
        ],
        "correct_answer": "$PV^\\gamma = \\text{constant}$",
        "explanation": "For a quasi-static reversible adiabatic process of an ideal gas, PV^gamma = constant and TV^(gamma-1) = constant are both valid mathematical representations of the path equation.",
        "marks": 1,
    },
    {
        "subject": "Physics & Engineering Thermodynamics",
        "topic": "First & Second Laws of Thermodynamics",
        "question_text": "Which of the following statements are consistent with the Second Law of Thermodynamics?",
        "question_type": "multi_select",
        "difficulty": "Hard",
        "options": [
            "Heat cannot spontaneously flow from a colder body to a hotter body (Clausius statement)",
            "No cyclic process can convert heat completely into work without other changes (Kelvin-Planck statement)",
            "The total entropy of an isolated system always remains constant in any irreversible process",
            "Absolute zero temperature can be achieved in a finite number of thermodynamic steps"
        ],
        "correct_answer": '["Heat cannot spontaneously flow from a colder body to a hotter body (Clausius statement)", "No cyclic process can convert heat completely into work without other changes (Kelvin-Planck statement)"]',
        "explanation": "The Clausius and Kelvin-Planck statements formulate the Second Law. Entropy increases in irreversible processes (not constant), and the Third Law implies absolute zero is unreachable in finite steps.",
        "marks": 2,
    },
    {
        "subject": "Artificial Intelligence & Machine Learning",
        "topic": "Supervised & Unsupervised Learning",
        "question_text": "Which algorithm is specifically designed for unsupervised clustering of data into $k$ distinct partitions by minimizing within-cluster variance?",
        "question_type": "mcq",
        "difficulty": "Easy",
        "options": ["K-Means Clustering", "Linear Discriminant Analysis", "Random Forest Classifier", "Logistic Regression"],
        "correct_answer": "K-Means Clustering",
        "explanation": "K-Means is an unsupervised clustering algorithm that iteratively partitions data points into k clusters minimizing inertia.",
        "marks": 1,
    },
    {
        "subject": "Artificial Intelligence & Machine Learning",
        "topic": "Deep Neural Networks & Backpropagation",
        "question_text": "Which of the following techniques are commonly applied to mitigate overfitting in deep artificial neural networks?",
        "question_type": "multi_select",
        "difficulty": "Medium",
        "options": [
            "Dropout regularization",
            "L2 Weight Decay",
            "Early Stopping based on validation loss",
            "Removing activation functions to make network purely linear"
        ],
        "correct_answer": '["Dropout regularization", "L2 Weight Decay", "Early Stopping based on validation loss"]',
        "explanation": "Dropout, L2 regularization, and Early Stopping prevent overfitting. Removing non-linear activations destroys representation capacity.",
        "marks": 2,
    },
    {
        "subject": "Artificial Intelligence & Machine Learning",
        "topic": "Model Evaluation: Bias-Variance & Metrics",
        "question_text": "Define the Bias-Variance tradeoff and describe how model complexity influences both components.",
        "question_type": "long_answer",
        "difficulty": "Medium",
        "options": None,
        "correct_answer": "Bias is error from erroneous assumptions or underfitting; Variance is sensitivity to small fluctuations in training data or overfitting. As model complexity increases, bias decreases while variance increases, requiring an optimal balance to minimize total generalization error.",
        "explanation": "A complete response covers definition of bias, variance, inverse relationship with model complexity, and minimizing test generalization error.",
        "marks": 5,
    }
]


@router.get("/subjects", summary="Get subjects available for AI practice testing")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_practice_subjects(
    request: Request,
    current_student: models.Student = Depends(get_current_student),
):
    """Returns top-level subjects available for candidate practice tests."""
    return {
        "subjects": list(SUGGESTED_TOPICS.keys()),
        "note": "AI practice test studio with automated grading, ambiguity validation, and instant feedback."
    }


@router.get("/topics", summary="Get curated subjects and recommended topic suggestion chips")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_practice_topics(
    request: Request,
    current_student: models.Student = Depends(get_current_student),
):
    """Returns curated subjects and suggested topics for candidate exploration."""
    return {
        "categories": SUGGESTED_TOPICS
    }


@router.post("/generate", summary="Configure and generate AI practice test")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def generate_practice_test(
    request: Request,
    payload: Dict[str, Any],
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Generates a personalized AI practice test according to student's exact configuration.
    Validates question distribution, executes question quality & ambiguity validation,
    and returns practice test attempt for student preview.
    """
    t_req_start = time.time()
    subject = str(payload.get("subject", "")).strip()
    topic = str(payload.get("topic", "")).strip() or "General Academic Concepts"
    difficulty = str(payload.get("difficulty", "Medium")).capitalize()
    if difficulty not in ["Easy", "Medium", "Hard"]:
        difficulty = "Medium"

    has_breakdown_keys = any(k in payload for k in ["mcq_count", "multi_select_count", "short_answer_count", "long_answer_count"])
    if has_breakdown_keys:
        mcq_count = max(0, int(payload.get("mcq_count", 0)))
        multi_select_count = max(0, int(payload.get("multi_select_count", 0)))
        short_answer_count = max(0, int(payload.get("short_answer_count", 0)))
        long_answer_count = max(0, int(payload.get("long_answer_count", 0)))
        total_count = mcq_count + multi_select_count + short_answer_count + long_answer_count
        if total_count <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Total question count must be at least 1. Please allocate question counts."
            )
    else:
        legacy_count = int(payload.get("question_count", 5))
        if legacy_count <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Total question count must be at least 1."
            )
        mcq_count = legacy_count
        multi_select_count = 0
        short_answer_count = 0
        long_answer_count = 0
        total_count = legacy_count

    if total_count > 30:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Maximum supported practice test size is 30 questions per attempt."
        )

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subject is required to generate assessment questions."
        )

    is_timed = bool(payload.get("is_timed", True))
    duration_minutes = int(payload.get("duration_minutes", 15))
    if is_timed and (duration_minutes < 1 or duration_minutes > 180):
        duration_minutes = 15

    t_val_done = time.time()

    generated_questions = []
    generation_error = None
    try:
        generated_questions = generate_exam_questions(
            subject=subject,
            topic=topic,
            difficulty=difficulty,
            mcq_count=mcq_count,
            multi_select_count=multi_select_count,
            short_answer_count=short_answer_count,
            long_answer_count=long_answer_count,
        )
    except Exception as e:
        generation_error = str(e)

    t_gen_done = time.time()

    if len(generated_questions) < total_count:
        print(f"[AI GENERATION TOP-UP] AI returned {len(generated_questions)}/{total_count} questions (error: {generation_error}). Topping up with curated validated pool.")
        matching_pool = [
            q for q in CURATED_FALLBACK_BANK
            if subject.lower() in q["subject"].lower() or q["subject"].lower() in subject.lower()
        ]
        if not matching_pool:
            matching_pool = CURATED_FALLBACK_BANK

        needed = total_count - len(generated_questions)
        for q in matching_pool:
            if needed <= 0:
                break
            validated = validate_and_refine_question(q)
            if not any(g["question_text"] == validated["question_text"] for g in generated_questions):
                generated_questions.append(validated)
                needed -= 1

        while len(generated_questions) < total_count and matching_pool:
            cloned = dict(matching_pool[len(generated_questions) % len(matching_pool)])
            cloned["question_text"] = f"[Variant {len(generated_questions)+1}] {cloned['question_text']}"
            generated_questions.append(validate_and_refine_question(cloned))

    generated_questions = generated_questions[:total_count]

    total_marks = sum(int(q.get("marks", 1)) for q in generated_questions)
    if total_marks <= 0:
        total_marks = len(generated_questions)

    assigned_teacher = (
        db.query(models.Teacher)
        .filter(models.Teacher.approval_status == "approved")
        .first()
    )
    teacher_email = assigned_teacher.email if assigned_teacher else "system@platform.edu"

    mock_exam = models.Exam(
        title=f"Practice Test: {subject} ({topic})",
        description=f"AI-generated practice assessment on {topic} ({difficulty} difficulty).",
        instructions="Complete the practice test. Your responses are auto-saved. Instant diagnostic evaluation and feedback provided upon submission.",
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        duration_minutes=duration_minutes if is_timed else 0,
        total_marks=total_marks,
        passing_marks=max(1, int(total_marks * 0.4)),
        number_of_questions=len(generated_questions),
        is_published=True,
        is_mock=True,
        created_by_student=current_student.email,
        teacher_email=teacher_email,
    )
    db.add(mock_exam)
    db.flush()

    created_questions = [
        models.Question(
            exam_id=mock_exam.id,
            question_text=clean_latex_formula(q_data["question_text"]),
            question_type=q_data["question_type"],
            difficulty=q_data.get("difficulty", difficulty),
            options=q_data.get("options"),
            correct_answer=q_data.get("correct_answer"),
            explanation=q_data.get("explanation"),
            marks=int(q_data.get("marks", 1)),
            negative_marks=float(q_data.get("negative_marks", 0.0)),
            min_words=q_data.get("min_words"),
            max_words=q_data.get("max_words"),
            order_index=idx + 1,
            validation_status=q_data.get("validation_status", "validated"),
        )
        for idx, q_data in enumerate(generated_questions)
    ]
    db.add_all(created_questions)
    db.flush()

    now = datetime.datetime.utcnow()
    attempt = models.ExamAttempt(
        exam_id=mock_exam.id,
        student_email=current_student.email,
        status="in_progress",
        start_time=now,
        total_marks=float(total_marks),
        is_mock=True,
        is_timed=is_timed,
        flagged_questions=[],
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    t_db_done = time.time()
    val_ms = (t_val_done - t_req_start) * 1000
    gen_s = (t_gen_done - t_val_done)
    db_ms = (t_db_done - t_gen_done) * 1000
    total_s = (t_db_done - t_req_start)
    print(f"[PRACTICE GENERATION LIFECYCLE] Subject='{subject}' Topic='{topic}' Questions={len(created_questions)} | Validation: {val_ms:.1f}ms | AI Generation: {gen_s:.2f}s | DB Persistence: {db_ms:.1f}ms | Total Duration: {total_s:.2f}s")

    sanitized = [
        schemas.PracticeQuestionItem(
            id=q.id,
            question_text=q.question_text,
            question_type=q.question_type,
            options=q.options,
            marks=q.marks,
            order_index=q.order_index,
            min_words=q.min_words,
            max_words=q.max_words,
            difficulty=q.difficulty,
            validation_status=q.validation_status,
        )
        for q in created_questions
    ]

    return schemas.PracticeTestAttemptResponse(
        attempt_id=attempt.id,
        exam_id=mock_exam.id,
        title=mock_exam.title,
        subject=mock_exam.subject,
        topic=mock_exam.topic,
        difficulty=mock_exam.difficulty,
        is_timed=is_timed,
        duration_minutes=duration_minutes,
        remaining_seconds=duration_minutes * 60 if is_timed else None,
        total_marks=float(total_marks),
        total_questions=len(sanitized),
        is_mock=True,
        status=attempt.status,
        questions=sanitized,
        saved_answers={},
        saved_images={},
        flagged_questions=[],
    )


@router.get("/attempts/{attempt_id}", response_model=schemas.PracticeTestAttemptResponse, summary="Get active practice test attempt")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_practice_attempt(
    request: Request,
    attempt_id: int,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Retrieves practice test attempt, persisting answers and authoritative server countdown."""
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.id == attempt_id,
        models.ExamAttempt.is_mock == True,
    ).first()

    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice test attempt not found.")

    exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated practice exam not found.")

    remaining_seconds = None
    if attempt.is_timed and exam.duration_minutes > 0:
        now = datetime.datetime.utcnow()
        elapsed = (now - attempt.start_time).total_seconds()
        remaining_seconds = max(0, int(exam.duration_minutes * 60 - elapsed))

    answers_map = {}
    images_map = {}
    for sa in attempt.student_answers or []:
        if sa.answer_text is not None:
            answers_map[str(sa.question_id)] = sa.answer_text
        if sa.image_url:
            images_map[str(sa.question_id)] = sa.image_url

    flagged_list = attempt.flagged_questions or []

    sanitized = [
        schemas.PracticeQuestionItem(
            id=q.id,
            question_text=q.question_text,
            question_type=q.question_type,
            options=q.options,
            marks=q.marks,
            order_index=q.order_index,
            min_words=q.min_words,
            max_words=q.max_words,
            difficulty=q.difficulty,
            validation_status=q.validation_status,
        )
        for q in sorted(exam.questions, key=lambda x: x.order_index)
    ]

    return schemas.PracticeTestAttemptResponse(
        attempt_id=attempt.id,
        exam_id=exam.id,
        title=exam.title,
        subject=exam.subject,
        topic=exam.topic,
        difficulty=exam.difficulty or "Medium",
        is_timed=bool(attempt.is_timed),
        duration_minutes=exam.duration_minutes,
        remaining_seconds=remaining_seconds,
        total_marks=float(attempt.total_marks or exam.total_marks or 1.0),
        total_questions=len(sanitized),
        is_mock=True,
        status=attempt.status,
        questions=sanitized,
        saved_answers=answers_map,
        saved_images=images_map,
        flagged_questions=flagged_list,
    )


@router.post("/attempts/{attempt_id}/save-answer", summary="Autosave practice test answer & flags")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def save_practice_answer(
    request: Request,
    attempt_id: int,
    payload: schemas.PracticeSaveAnswerRequest,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Saves candidate answer, image, and flagged status to PostgreSQL."""
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.id == attempt_id,
        models.ExamAttempt.is_mock == True,
    ).first()

    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice attempt not found.")

    if attempt.status in ["submitted", "completed", "evaluated"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot edit answers for a submitted attempt.")

    existing_sa = db.query(models.StudentAnswer).filter(
        models.StudentAnswer.attempt_id == attempt.id,
        models.StudentAnswer.question_id == payload.question_id,
    ).first()

    if payload.answer_text is not None or payload.image_url is not None:
        if existing_sa:
            if payload.answer_text is not None:
                existing_sa.answer_text = payload.answer_text
            if payload.image_url is not None:
                existing_sa.image_url = payload.image_url
        else:
            new_sa = models.StudentAnswer(
                attempt_id=attempt.id,
                question_id=payload.question_id,
                answer_text=payload.answer_text or "",
                image_url=payload.image_url,
            )
            db.add(new_sa)

    if payload.is_flagged is not None:
        current_flags = list(attempt.flagged_questions or [])
        if payload.is_flagged and payload.question_id not in current_flags:
            current_flags.append(payload.question_id)
        elif not payload.is_flagged and payload.question_id in current_flags:
            current_flags.remove(payload.question_id)
        attempt.flagged_questions = current_flags

    db.commit()
    return {
        "success": True,
        "question_id": payload.question_id,
        "saved_at": datetime.datetime.utcnow().isoformat(),
    }


@router.post("/attempts/{attempt_id}/upload-photo", summary="Upload written handwriting photo or diagram")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def upload_practice_photo(
    request: Request,
    attempt_id: int,
    question_id: int = Form(...),
    photo: UploadFile = File(...),
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Uploads written answer photo/handwriting, validating size and format."""
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.id == attempt_id,
        models.ExamAttempt.is_mock == True,
    ).first()

    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice attempt not found.")

    if attempt.status in ["submitted", "completed", "evaluated"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt already submitted.")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if photo.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Supported formats: JPEG, PNG, WebP."
        )

    contents = await photo.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum permitted limit of 5MB."
        )

    upload_dir = Path(__file__).resolve().parent.parent / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = photo.filename.split(".")[-1] if "." in photo.filename else "jpg"
    safe_filename = f"attempt_{attempt_id}_q{question_id}_{uuid.uuid4().hex[:8]}.{ext}"
    target_path = upload_dir / safe_filename

    with open(target_path, "wb") as f:
        f.write(contents)

    relative_url = f"/uploads/{safe_filename}"

    existing_sa = db.query(models.StudentAnswer).filter(
        models.StudentAnswer.attempt_id == attempt.id,
        models.StudentAnswer.question_id == question_id,
    ).first()

    if existing_sa:
        existing_sa.image_url = relative_url
    else:
        new_sa = models.StudentAnswer(
            attempt_id=attempt.id,
            question_id=question_id,
            answer_text="",
            image_url=relative_url,
        )
        db.add(new_sa)

    db.commit()
    return {
        "success": True,
        "question_id": question_id,
        "image_url": relative_url,
        "filename": safe_filename,
    }


def _build_detailed_result(db: Session, attempt: models.ExamAttempt, exam: models.Exam) -> schemas.PracticeDetailedResult:
    """Helper to compute complete objective and subjective scoring metrics."""
    answers_map = {sa.question_id: sa for sa in attempt.student_answers}
    question_results = []
    
    total_score = 0.0
    total_max_marks = 0.0
    objective_marks = 0.0
    objective_max = 0.0
    written_marks = 0.0
    written_max = 0.0
    
    correct_count = 0
    incorrect_count = 0
    partially_correct_count = 0
    unanswered_count = 0
    pending_count = 0
    has_pending_written = False

    for q in sorted(exam.questions, key=lambda x: x.order_index):
        sa = answers_map.get(q.id)
        user_ans = sa.answer_text if sa else ""
        user_img = sa.image_url if sa else None
        awarded = float(sa.awarded_marks) if (sa and sa.awarded_marks is not None) else 0.0
        is_corr = sa.is_correct if sa else None
        feedback = sa.teacher_feedback if sa else ""
        q_marks = int(q.marks or 1)
        total_max_marks += q_marks

        is_answered = bool((user_ans and user_ans.strip()) or user_img)
        if not is_answered:
            unanswered_count += 1
        else:
            if q.question_type in ["mcq", "mcq_single", "multi_select", "mcq_multi"]:
                objective_max += q_marks
                objective_marks += awarded
                if is_corr is True:
                    correct_count += 1
                elif awarded > 0:
                    partially_correct_count += 1
                else:
                    incorrect_count += 1
            else:
                written_max += q_marks
                written_marks += awarded
                if is_corr is True:
                    correct_count += 1
                elif is_corr is False:
                    incorrect_count += 1
                else:
                    pending_count += 1
                    has_pending_written = True

        question_results.append(
            schemas.PracticeQuestionResultItem(
                question_id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options,
                user_answer=user_ans,
                user_image_url=user_img,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                is_correct=is_corr,
                awarded_marks=awarded,
                max_marks=q_marks,
                feedback=feedback or q.explanation,
                validation_status=q.validation_status or "validated",
            )
        )

    final_score = float(attempt.score if attempt.score is not None else (objective_marks + written_marks))
    percentage = round((final_score / total_max_marks) * 100, 1) if total_max_marks > 0 else 0.0
    passed = final_score >= (exam.passing_marks or 0)

    time_spent = None
    if attempt.submit_time and attempt.start_time:
        time_spent = int((attempt.submit_time - attempt.start_time).total_seconds())

    return schemas.PracticeDetailedResult(
        attempt_id=attempt.id,
        exam_id=exam.id,
        title=exam.title,
        subject=exam.subject,
        topic=exam.topic,
        difficulty=exam.difficulty or "Medium",
        status="pending_evaluation" if has_pending_written else "evaluated",
        is_timed=bool(attempt.is_timed),
        duration_minutes=exam.duration_minutes,
        time_spent_seconds=time_spent,
        submit_time=attempt.submit_time,
        score=round(final_score, 1),
        total_marks=total_max_marks,
        percentage=percentage,
        passed=passed,
        total_questions=len(exam.questions),
        answered_count=len(exam.questions) - unanswered_count,
        unanswered_count=unanswered_count,
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        partially_correct_count=partially_correct_count,
        objective_marks=round(objective_marks, 1),
        objective_max_marks=objective_max,
        written_marks=round(written_marks, 1),
        written_max_marks=written_max,
        pending_evaluation_count=pending_count,
        has_pending_written=has_pending_written,
        question_results=question_results,
    )


@router.post("/attempts/{attempt_id}/submit", response_model=schemas.PracticeDetailedResult, summary="Submit practice test and calculate score")
@router.post("/{attempt_id}/submit", response_model=schemas.PracticeDetailedResult, summary="Submit practice test (legacy alias)")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def submit_practice_test(
    request: Request,
    attempt_id: int,
    submission: Optional[schemas.PracticeTestSubmitRequest] = None,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Submits candidate practice test attempt. Grades objective questions with partial credit
    support, executes AI subjective evaluation where available, and returns detailed metrics.
    """
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.id == attempt_id,
        models.ExamAttempt.is_mock == True,
    ).first()

    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice attempt not found.")

    exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()

    if attempt.status in ["submitted", "completed", "evaluated", "pending_evaluation"]:
        return _build_detailed_result(db, attempt, exam)

    now = datetime.datetime.utcnow()

    submission_answers = {}
    if submission and submission.answers:
        for sa in submission.answers:
            submission_answers[sa.question_id] = (sa.answer_text, sa.image_url)

    existing_answers = {sa.question_id: sa for sa in attempt.student_answers}

    total_score = 0.0
    has_pending_written = False

    for q in exam.questions:
        existing_sa = existing_answers.get(q.id)
        sub_text, sub_img = submission_answers.get(q.id, (None, None))

        ans_text = sub_text if sub_text is not None else (existing_sa.answer_text if existing_sa else "")
        img_url = sub_img if sub_img is not None else (existing_sa.image_url if existing_sa else None)

        awarded = 0.0
        is_corr = None
        feedback = ""

        q_max_marks = float(q.marks or 1)
        q_negative_marks = float(q.negative_marks or 0.0)

        if q.question_type in ["mcq", "mcq_single", "multi_select", "mcq_multi"]:
            is_corr, awarded, feedback = grade_objective_question(
                question_type=q.question_type,
                student_answer=ans_text,
                correct_answer=q.correct_answer,
                max_marks=q_max_marks,
                negative_marks=q_negative_marks,
                allow_partial=True,
            )
            total_score += awarded
        else:
            if ans_text and ans_text.strip():
                eval_res = evaluate_subjective_answer(
                    question_text=q.question_text,
                    question_type=q.question_type,
                    model_answer=q.correct_answer or "",
                    max_marks=q_max_marks,
                    student_answer=ans_text,
                )
                if eval_res:
                    awarded = float(eval_res.get("awarded_marks", 0.0))
                    feedback = eval_res.get("feedback", "Automated AI evaluation completed.")
                    is_corr = eval_res.get("is_correct", False)
                    total_score += awarded
                else:
                    is_corr = None
                    awarded = 0.0
                    feedback = "Awaiting instructor or secondary AI evaluation."
                    has_pending_written = True
            else:
                is_corr = False
                awarded = 0.0
                feedback = "No answer submitted."

        if existing_sa:
            existing_sa.answer_text = ans_text
            existing_sa.image_url = img_url
            existing_sa.is_correct = is_corr
            existing_sa.awarded_marks = awarded
            existing_sa.teacher_feedback = feedback
            existing_sa.evaluated_at = now
        else:
            new_sa = models.StudentAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                answer_text=ans_text,
                image_url=img_url,
                is_correct=is_corr,
                awarded_marks=awarded,
                teacher_feedback=feedback,
                evaluated_at=now,
            )
            db.add(new_sa)

    attempt.status = "pending_evaluation" if has_pending_written else "evaluated"
    attempt.submit_time = now
    attempt.score = total_score
    db.commit()

    return _build_detailed_result(db, attempt, exam)


@router.get("/attempts/{attempt_id}/result", response_model=schemas.PracticeDetailedResult, summary="Get detailed results for practice test attempt")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_practice_result(
    request: Request,
    attempt_id: int,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Retrieves comprehensive question-by-question result report."""
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.id == attempt_id,
        models.ExamAttempt.is_mock == True,
    ).first()

    if not attempt or attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice attempt not found.")

    exam = db.query(models.Exam).filter(models.Exam.id == attempt.exam_id).first()
    return _build_detailed_result(db, attempt, exam)


@router.get("/history", summary="Get candidate practice test history")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def get_practice_history(
    request: Request,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Returns candidate's practice history entries."""
    attempts = (
        db.query(models.ExamAttempt)
        .filter(
            models.ExamAttempt.student_email == current_student.email,
            models.ExamAttempt.is_mock == True,
            models.ExamAttempt.status.in_(["submitted", "completed", "pending_evaluation", "evaluated"]),
        )
        .order_by(models.ExamAttempt.submit_time.desc().nullslast())
        .all()
    )

    history = []
    for att in attempts:
        exam = db.query(models.Exam).filter(models.Exam.id == att.exam_id).first()
        student_answers = att.student_answers or []
        has_pending = any(a.is_correct is None for a in student_answers) or att.status == "pending_evaluation"
        total_marks = float(att.total_marks or (exam.total_marks if exam else 1.0) or 1.0)
        score = float(att.score or 0.0)
        percentage = round((score / total_marks) * 100, 1) if total_marks > 0 else 0.0

        history.append({
            "attempt_id": att.id,
            "exam_id": exam.id if exam else None,
            "title": exam.title if exam else "Practice Assessment",
            "subject": exam.subject if exam else "General",
            "topic": exam.topic if exam else "",
            "difficulty": exam.difficulty if exam else "Medium",
            "date": att.submit_time.strftime("%Y-%m-%d %H:%M") if att.submit_time else "N/A",
            "score": score,
            "total_marks": total_marks,
            "total_questions": len(exam.questions) if exam and exam.questions else len(student_answers),
            "percentage": percentage,
            "passed": score >= (exam.passing_marks if exam else 0),
            "status": "pending_evaluation" if has_pending else "evaluated",
            "has_pending_written": has_pending,
        })

    return history


@router.post("/attempts/{attempt_id}/retake", summary="Retake a practice test (creates fresh attempt)")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def retake_practice_test(
    request: Request,
    attempt_id: int,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Spawns a new practice attempt with identical question paper while safely preserving prior attempt history.
    """
    prior_attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.id == attempt_id,
        models.ExamAttempt.is_mock == True,
    ).first()

    if not prior_attempt or prior_attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prior practice attempt not found.")

    exam = db.query(models.Exam).filter(models.Exam.id == prior_attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated practice exam not found.")

    now = datetime.datetime.utcnow()
    new_attempt = models.ExamAttempt(
        exam_id=exam.id,
        student_email=current_student.email,
        status="in_progress",
        start_time=now,
        total_marks=float(exam.total_marks),
        is_mock=True,
        is_timed=bool(prior_attempt.is_timed),
        flagged_questions=[],
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)

    return {
        "success": True,
        "new_attempt_id": new_attempt.id,
        "exam_id": exam.id,
        "title": exam.title,
    }


@router.delete("/attempts/{attempt_id}", summary="Delete student's own practice test attempt")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def delete_practice_attempt(
    request: Request,
    attempt_id: int,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Safely deletes an eligible practice attempt belonging to current student.
    Strictly forbids deleting assigned institutional examinations or other students' attempts.
    """
    attempt = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.id == attempt_id,
        models.ExamAttempt.is_mock == True,
    ).first()

    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice attempt not found.")

    if attempt.student_email != current_student.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You can only delete your own practice tests.")

    exam_id = attempt.exam_id

    db.query(models.StudentAnswer).filter(models.StudentAnswer.attempt_id == attempt.id).delete(synchronize_session=False)
    db.delete(attempt)
    db.commit()

    remaining_attempts = db.query(models.ExamAttempt).filter(models.ExamAttempt.exam_id == exam_id).count()
    if remaining_attempts == 0:
        exam = db.query(models.Exam).filter(models.Exam.id == exam_id, models.Exam.is_mock == True).first()
        if exam and exam.created_by_student == current_student.email:
            db.query(models.Question).filter(models.Question.exam_id == exam_id).delete(synchronize_session=False)
            db.delete(exam)
            db.commit()

    return {
        "success": True,
        "message": "Practice test attempt deleted successfully."
    }
