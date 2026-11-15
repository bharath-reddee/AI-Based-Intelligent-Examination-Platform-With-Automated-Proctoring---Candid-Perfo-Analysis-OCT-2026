from typing import List
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from dependencies import get_current_student
from services.rate_limit_service import limiter, RATE_LIMIT_AUTHENTICATED
from services.redis_service import (
    make_student_dashboard_key,
    get_cached_json,
    set_cached_json,
)

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me", response_model=schemas.StudentResponse, summary="Get current authenticated student profile")
def get_student_profile(current_student: models.Student = Depends(get_current_student)):
    return schemas.StudentResponse.model_validate(current_student)


@router.get("/dashboard-summary", summary="Get dashboard summary for student")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def get_student_dashboard_summary(
    request: Request,
    current_student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    cache_key = make_student_dashboard_key(current_student.email)
    cached = await get_cached_json(cache_key)
    if cached is not None:
        return cached

    published_exams = db.query(models.Exam).filter(models.Exam.is_published == True).all()

    attempts = db.query(models.ExamAttempt).filter(
        models.ExamAttempt.student_email == current_student.email
    ).all()

    attempted_exam_ids = {att.exam_id: att for att in attempts}

    def is_attempt_submitted(att):
        return bool(
            att and (
                att.submit_time is not None
                or att.status in ["submitted", "evaluated", "pending_evaluation", "graded", "completed"]
            )
        )

    completed_count = sum(1 for a in attempts if is_attempt_submitted(a))
    upcoming_count = len(published_exams) - sum(
        1 for e in published_exams if e.id in attempted_exam_ids and is_attempt_submitted(attempted_exam_ids[e.id])
    )

    scores = [a.score for a in attempts if is_attempt_submitted(a) and a.score is not None and a.total_marks and a.total_marks > 0]
    avg_percentage = 0.0
    if scores:
        percentage_list = [
            (a.score / a.total_marks) * 100
            for a in attempts
            if is_attempt_submitted(a) and a.score is not None and a.total_marks and a.total_marks > 0
        ]
        avg_percentage = round(sum(percentage_list) / len(percentage_list), 1)

    recent_exams_data = []
    for ex in published_exams[:5]:
        att = attempted_exam_ids.get(ex.id)
        status_str = "Upcoming"
        score_val = None
        if att:
            status_str = "Submitted" if is_attempt_submitted(att) else ("In Progress" if att.status == "in_progress" else "Upcoming")
            score_val = att.score

        recent_exams_data.append({
            "id": ex.id,
            "title": ex.title,
            "subject": ex.subject,
            "date": ex.start_time.strftime("%Y-%m-%d") if ex.start_time else "Anytime",
            "status": status_str,
            "score": score_val,
            "total": ex.total_marks,
        })

    response_data = {
        "student": schemas.StudentResponse.model_validate(current_student),
        "metrics": {
            "upcoming_exams": upcoming_count,
            "completed_exams": completed_count,
            "average_score": avg_percentage,
            "proctoring_trust_score": "100%",
        },
        "recent_exams": recent_exams_data,
    }
    await set_cached_json(cache_key, response_data, ttl_seconds=30)
    return response_data
