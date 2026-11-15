from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import models
from services.auth_service import decode_access_token

security = HTTPBearer(auto_error=False)


def get_current_user_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Extract and validate JWT token claims from Authorization Bearer header."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email: Optional[str] = payload.get("sub")
    role: Optional[str] = payload.get("role")
    if not email or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing essential claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"email": email, "role": role}


def get_current_student(
    claims: dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db),
) -> models.Student:
    """Authorize current user as a student and return the Student database model."""
    if claims["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: endpoint requires 'student' role, but user has '{claims['role']}'.",
        )
    student = db.query(models.Student).filter(models.Student.email == claims["email"]).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student account not found in database.",
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
                detail=f"Your registration has been rejected.{reason_suffix}",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval. Please wait for an administrator to review your registration.",
        )
    return student


def get_current_teacher(
    claims: dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db),
) -> models.Teacher:
    """Authorize current user as a teacher and return the Teacher database model."""
    if claims["role"] != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: endpoint requires 'teacher' role, but user has '{claims['role']}'.",
        )
    teacher = db.query(models.Teacher).filter(models.Teacher.email == claims["email"]).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher account not found in database.",
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
                detail=f"Your registration has been rejected.{reason_suffix}",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval. Please wait for an administrator to review your registration.",
        )
    return teacher


def get_current_admin(
    claims: dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db),
) -> models.Admin:
    """Authorize current user as an admin and return the Admin database model."""
    if claims["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: endpoint requires 'admin' role, but user has '{claims['role']}'.",
        )
    admin = db.query(models.Admin).filter(models.Admin.email == claims["email"]).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found in database.",
        )
    if admin.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator account is deactivated.",
        )
    return admin

