from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from database import get_db
import models
import schemas
from services.auth_service import hash_password, verify_password, create_access_token
from services.rate_limit_service import (
    limiter,
    account_lockout_manager,
    RATE_LIMIT_REGISTER_IP,
    RATE_LIMIT_LOGIN_IP,
    RATE_LIMIT_ADMIN_LOGIN_IP,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def check_email_conflict(email: str, db: Session):
    """Check if email already exists across Student, Teacher, or Admin tables."""
    clean_email = email.strip().lower()
    if db.query(models.Student).filter(func.lower(models.Student.email) == clean_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists as a student.",
        )
    if db.query(models.Teacher).filter(func.lower(models.Teacher.email) == clean_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists as a teacher.",
        )
    if db.query(models.Admin).filter(func.lower(models.Admin.email) == clean_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists as an administrator.",
        )


@router.post(
    "/student/register",
    response_model=schemas.RegistrationPendingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student account",
)
@limiter.limit(RATE_LIMIT_REGISTER_IP)
def register_student(
    request: Request,
    payload: schemas.StudentRegisterRequest,
    db: Session = Depends(get_db),
):
    check_email_conflict(payload.email, db)

    hashed_pw = hash_password(payload.password)
    new_student = models.Student(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=payload.email.strip().lower(),
        institute=payload.institute.strip(),
        roll_number=payload.roll_number.strip(),
        class_year=payload.class_year.strip(),
        password=hashed_pw,
        confirm_password=None,
        approval_status="pending",
        is_active=True,
        rejection_reason=None,
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    user_data = schemas.StudentResponse.model_validate(new_student).model_dump()

    return schemas.RegistrationPendingResponse(
        message="Your student account has been created and is waiting for an administrator to approve it.",
        approval_status="pending",
        email=new_student.email,
        role="student",
        user=user_data,
    )


@router.post(
    "/teacher/register",
    response_model=schemas.RegistrationPendingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new teacher account",
)
@limiter.limit(RATE_LIMIT_REGISTER_IP)
def register_teacher(
    request: Request,
    payload: schemas.TeacherRegisterRequest,
    db: Session = Depends(get_db),
):
    if not payload.institute or not payload.institute.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Institute Name is required and cannot be empty.",
        )

    check_email_conflict(payload.email, db)

    hashed_pw = hash_password(payload.password)
    new_teacher = models.Teacher(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=payload.email.strip().lower(),
        institute=payload.institute.strip(),
        department=payload.department.strip(),
        password=hashed_pw,
        confirm_password=None,
        approval_status="pending",
        is_active=True,
        rejection_reason=None,
    )

    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)

    user_data = schemas.TeacherResponse.model_validate(new_teacher).model_dump()

    return schemas.RegistrationPendingResponse(
        message="Your teacher account has been created and is waiting for an administrator to approve it.",
        approval_status="pending",
        email=new_teacher.email,
        role="teacher",
        user=user_data,
    )


@router.post(
    "/student/login",
    response_model=schemas.TokenResponse,
    summary="Authenticate student with email and password",
)
@limiter.limit(RATE_LIMIT_LOGIN_IP)
async def login_student(
    request: Request,
    payload: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    clean_identifier = payload.email.strip().lower()

    await account_lockout_manager.check_lockout_async(clean_identifier)

    student = db.query(models.Student).filter(
        or_(
            func.lower(models.Student.email) == clean_identifier,
            func.lower(models.Student.roll_number) == clean_identifier,
        )
    ).first()

    if not student:
        teacher_match = db.query(models.Teacher).filter(
            func.lower(models.Teacher.email) == clean_identifier
        ).first()
        if teacher_match:
            await account_lockout_manager.record_failure_async(clean_identifier)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account is registered as a Teacher. Please switch to the Teacher login tab.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        admin_match = db.query(models.Admin).filter(
            func.lower(models.Admin.email) == clean_identifier
        ).first()
        if admin_match:
            await account_lockout_manager.record_failure_async(clean_identifier)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account is registered as an Administrator. Please use the Admin Portal to sign in.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        await account_lockout_manager.record_failure_async(clean_identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, student.password):
        await account_lockout_manager.record_failure_async(clean_identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if student.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator.",
        )

    if student.approval_status != "approved":
        if student.approval_status == "rejected":
            reason_suffix = f" Reason: {student.rejection_reason}" if student.rejection_reason else ""
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your registration has been rejected by an administrator.{reason_suffix}",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your student account has been created and is waiting for administrator approval. You can sign in once your account has been approved.",
        )

    await account_lockout_manager.record_success_async(clean_identifier)

    token = create_access_token({"sub": student.email, "role": "student"})
    user_data = schemas.StudentResponse.model_validate(student).model_dump()

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        role="student",
        user=user_data,
        message="Student login successful.",
    )


@router.post(
    "/teacher/login",
    response_model=schemas.TokenResponse,
    summary="Authenticate teacher with email and password",
)
@limiter.limit(RATE_LIMIT_LOGIN_IP)
async def login_teacher(
    request: Request,
    payload: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    clean_identifier = payload.email.strip().lower()

    await account_lockout_manager.check_lockout_async(clean_identifier)

    teacher = db.query(models.Teacher).filter(
        func.lower(models.Teacher.email) == clean_identifier
    ).first()

    if not teacher:
        student_match = db.query(models.Student).filter(
            or_(
                func.lower(models.Student.email) == clean_identifier,
                func.lower(models.Student.roll_number) == clean_identifier,
            )
        ).first()
        if student_match:
            await account_lockout_manager.record_failure_async(clean_identifier)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account is registered as a Student. Please switch to the Student login tab.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        admin_match = db.query(models.Admin).filter(
            func.lower(models.Admin.email) == clean_identifier
        ).first()
        if admin_match:
            await account_lockout_manager.record_failure_async(clean_identifier)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account is registered as an Administrator. Please use the Admin Portal to sign in.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        await account_lockout_manager.record_failure_async(clean_identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, teacher.password):
        await account_lockout_manager.record_failure_async(clean_identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if teacher.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator.",
        )

    if teacher.approval_status != "approved":
        if teacher.approval_status == "rejected":
            reason_suffix = f" Reason: {teacher.rejection_reason}" if teacher.rejection_reason else ""
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your registration has been rejected by an administrator.{reason_suffix}",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your teacher account has been created and is waiting for an administrator to approve it. You can sign in once your account has been approved.",
        )

    await account_lockout_manager.record_success_async(clean_identifier)

    token = create_access_token({"sub": teacher.email, "role": "teacher"})
    user_data = schemas.TeacherResponse.model_validate(teacher).model_dump()

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        role="teacher",
        user=user_data,
        message="Teacher login successful.",
    )


@router.post(
    "/admin/login",
    response_model=schemas.TokenResponse,
    summary="Authenticate administrator with email and password",
)
@limiter.limit(RATE_LIMIT_ADMIN_LOGIN_IP)
async def login_admin(
    request: Request,
    payload: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    clean_identifier = payload.email.strip().lower()

    await account_lockout_manager.check_lockout_async(clean_identifier)

    admin = db.query(models.Admin).filter(
        func.lower(models.Admin.email) == clean_identifier
    ).first()

    if not admin:
        user_match = (
            db.query(models.Student).filter(func.lower(models.Student.email) == clean_identifier).first()
            or db.query(models.Teacher).filter(func.lower(models.Teacher.email) == clean_identifier).first()
        )
        if user_match:
            await account_lockout_manager.record_failure_async(clean_identifier)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account is not an Administrator. Please use the Student/Teacher login page.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        await account_lockout_manager.record_failure_async(clean_identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, admin.password):
        await account_lockout_manager.record_failure_async(clean_identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if admin.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator account is deactivated.",
        )

    await account_lockout_manager.record_success_async(clean_identifier)

    token = create_access_token({"sub": admin.email, "role": "admin"})
    user_data = schemas.AdminResponse.model_validate(admin).model_dump()

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        role="admin",
        user=user_data,
        message="Admin login successful.",
    )

