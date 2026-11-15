from typing import List, Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
import models
import schemas
from dependencies import get_current_admin
from services.rate_limit_service import limiter, RATE_LIMIT_AUTHENTICATED
from services.redis_service import (
    make_admin_dashboard_key,
    get_cached_json,
    set_cached_json,
    invalidate_admin_cache,
    invalidate_teacher_cache,
    invalidate_student_cache,
)

router = APIRouter(prefix="/admins", tags=["Administrators"])


@router.get("/me", response_model=schemas.AdminResponse, summary="Get current authenticated admin profile")
def get_admin_profile(current_admin: models.Admin = Depends(get_current_admin)):
    return schemas.AdminResponse.model_validate(current_admin)


@router.get("/dashboard-summary", summary="Get overall platform statistics for administration")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def get_admin_dashboard_summary(
    request: Request,
    current_admin: models.Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    cache_key = make_admin_dashboard_key()
    cached = await get_cached_json(cache_key)
    if cached is not None:
        return cached

    student_count = db.query(models.Student).count()
    teacher_count = db.query(models.Teacher).count()
    admin_count = db.query(models.Admin).count()

    pending_students = db.query(models.Student).filter(models.Student.approval_status == "pending").count()
    pending_teachers = db.query(models.Teacher).filter(models.Teacher.approval_status == "pending").count()
    pending_approvals = pending_students + pending_teachers

    approved_students = db.query(models.Student).filter(models.Student.approval_status == "approved").count()
    approved_teachers = db.query(models.Teacher).filter(models.Teacher.approval_status == "approved").count()

    rejected_students = db.query(models.Student).filter(models.Student.approval_status == "rejected").count()
    rejected_teachers = db.query(models.Teacher).filter(models.Teacher.approval_status == "rejected").count()
    rejected_accounts = rejected_students + rejected_teachers

    active_students = db.query(models.Student).filter(models.Student.is_active == True).count()
    active_teachers = db.query(models.Teacher).filter(models.Teacher.is_active == True).count()
    active_accounts = active_students + active_teachers

    inactive_students = db.query(models.Student).filter(models.Student.is_active == False).count()
    inactive_teachers = db.query(models.Teacher).filter(models.Teacher.is_active == False).count()
    inactive_accounts = inactive_students + inactive_teachers

    published_exams = db.query(models.Exam).filter(models.Exam.is_published == True).count()

    response_data = {
        "admin": schemas.AdminResponse.model_validate(current_admin),
        "metrics": {
            "total_students": student_count,
            "total_teachers": teacher_count,
            "total_admins": admin_count,
            "pending_approvals": pending_approvals,
            "pending_students": pending_students,
            "pending_teachers": pending_teachers,
            "approved_students": approved_students,
            "approved_teachers": approved_teachers,
            "rejected_accounts": rejected_accounts,
            "active_accounts": active_accounts,
            "inactive_accounts": inactive_accounts,
            "published_exams": published_exams,
            "proctoring_system_status": "Operational",
            "ai_evaluator_status": "Online",
        },
    }
    await set_cached_json(cache_key, response_data, ttl_seconds=30)
    return response_data


@router.get("/users", summary="List registered students and teachers with optional filtering")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
def list_registered_users(
    request: Request,
    role: Optional[str] = Query(None, description="Filter by role: 'all', 'student', 'teacher'"),
    status: Optional[str] = Query(None, description="Filter by approval status: 'all', 'pending', 'approved', 'rejected'"),
    search: Optional[str] = Query(None, description="Search term for name, email, or institute"),
    current_admin: models.Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    students_query = db.query(models.Student)
    teachers_query = db.query(models.Teacher)

    if status and status.lower() != "all":
        status_clean = status.lower()
        students_query = students_query.filter(models.Student.approval_status == status_clean)
        teachers_query = teachers_query.filter(models.Teacher.approval_status == status_clean)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        students_query = students_query.filter(
            or_(
                models.Student.first_name.ilike(term),
                models.Student.last_name.ilike(term),
                models.Student.email.ilike(term),
                models.Student.institute.ilike(term),
                models.Student.roll_number.ilike(term),
            )
        )
        teachers_query = teachers_query.filter(
            or_(
                models.Teacher.first_name.ilike(term),
                models.Teacher.last_name.ilike(term),
                models.Teacher.email.ilike(term),
                models.Teacher.institute.ilike(term),
                models.Teacher.department.ilike(term),
            )
        )

    students = students_query.order_by(models.Student.created_at.desc().nullslast()).all()
    teachers = teachers_query.order_by(models.Teacher.created_at.desc().nullslast()).all()

    include_students = role is None or role.lower() in ["all", "student"]
    include_teachers = role is None or role.lower() in ["all", "teacher"]

    students_list = [schemas.StudentResponse.model_validate(s).model_dump() for s in students] if include_students else []
    teachers_list = [schemas.TeacherResponse.model_validate(t).model_dump() for t in teachers] if include_teachers else []

    return {
        "students": students_list,
        "teachers": teachers_list,
        "total_students": len(students_list),
        "total_teachers": len(teachers_list),
        "total": len(students_list) + len(teachers_list),
    }


@router.post("/users/approve", summary="Approve a pending or rejected student or teacher")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def approve_user(
    request: Request,
    payload: schemas.AdminUserApprovalRequest,
    current_admin: models.Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    target_email = payload.email.lower()
    user = None

    if payload.role == "student":
        user = db.query(models.Student).filter(models.Student.email == target_email).first()
    elif payload.role == "teacher":
        user = db.query(models.Teacher).filter(models.Teacher.email == target_email).first()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified.")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{payload.role.capitalize()} account with email '{target_email}' was not found.",
        )

    user.approval_status = "approved"
    user.rejection_reason = None
    db.commit()
    db.refresh(user)

    await invalidate_admin_cache()
    if payload.role == "student":
        await invalidate_student_cache(target_email)
    elif payload.role == "teacher":
        await invalidate_teacher_cache(target_email)

    user_data = (
        schemas.StudentResponse.model_validate(user).model_dump()
        if payload.role == "student"
        else schemas.TeacherResponse.model_validate(user).model_dump()
    )

    return {
        "message": f"{payload.role.capitalize()} account for {user.first_name} {user.last_name} ({target_email}) has been approved.",
        "email": target_email,
        "role": payload.role,
        "approval_status": "approved",
        "user": user_data,
    }


@router.post("/users/reject", summary="Reject a pending or registered student or teacher with reason")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def reject_user(
    request: Request,
    payload: schemas.AdminUserRejectionRequest,
    current_admin: models.Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    target_email = payload.email.lower()
    reason_clean = payload.reason.strip()
    if not reason_clean:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A specific rejection reason must be provided.",
        )

    user = None
    if payload.role == "student":
        user = db.query(models.Student).filter(models.Student.email == target_email).first()
    elif payload.role == "teacher":
        user = db.query(models.Teacher).filter(models.Teacher.email == target_email).first()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified.")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{payload.role.capitalize()} account with email '{target_email}' was not found.",
        )

    user.approval_status = "rejected"
    user.rejection_reason = reason_clean
    db.commit()
    db.refresh(user)

    await invalidate_admin_cache()
    if payload.role == "student":
        await invalidate_student_cache(target_email)
    elif payload.role == "teacher":
        await invalidate_teacher_cache(target_email)

    user_data = (
        schemas.StudentResponse.model_validate(user).model_dump()
        if payload.role == "student"
        else schemas.TeacherResponse.model_validate(user).model_dump()
    )

    return {
        "message": f"{payload.role.capitalize()} registration for {user.first_name} {user.last_name} has been rejected.",
        "email": target_email,
        "role": payload.role,
        "approval_status": "rejected",
        "rejection_reason": reason_clean,
        "user": user_data,
    }


@router.post("/users/toggle-status", summary="Activate or deactivate a user account")
@limiter.limit(RATE_LIMIT_AUTHENTICATED)
async def toggle_user_status(
    request: Request,
    payload: schemas.AdminUserStatusToggleRequest,
    current_admin: models.Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    target_email = payload.email.lower()

    if payload.role == "admin":
        if target_email == current_admin.email.lower() and not payload.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own active administrator account.",
            )
        active_admins = db.query(models.Admin).filter(models.Admin.is_active == True).count()
        if active_admins <= 1 and not payload.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active administrator account on the platform.",
            )
        user = db.query(models.Admin).filter(models.Admin.email == target_email).first()
    elif payload.role == "student":
        user = db.query(models.Student).filter(models.Student.email == target_email).first()
    elif payload.role == "teacher":
        user = db.query(models.Teacher).filter(models.Teacher.email == target_email).first()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role specified.")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with email '{target_email}' was not found.",
        )

    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)

    await invalidate_admin_cache()
    if payload.role == "student":
        await invalidate_student_cache(target_email)
    elif payload.role == "teacher":
        await invalidate_teacher_cache(target_email)

    status_word = "activated" if payload.is_active else "deactivated"
    return {
        "message": f"Account for {user.first_name} {user.last_name} ({target_email}) has been {status_word}.",
        "email": target_email,
        "role": payload.role,
        "is_active": user.is_active,
    }

