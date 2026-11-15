import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from fastapi.testclient import TestClient

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(dotenv_path=BACKEND_DIR / ".env")

from main import app
from database import SessionLocal
import models

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("STARTING FASTAPI BACKEND VERIFICATION TEST SUITE")
    print("==================================================")
    
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. GET /health is OK")

    res = client.get("/health/database")
    assert res.status_code == 200, f"Database health check failed: {res.text}"
    db_info = res.json()
    assert db_info["database_name"] in ["User", "neondb"], f"Expected db 'User' or 'neondb', got {db_info['database_name']}"
    assert "Student" in db_info["tables_found"]
    assert "Teacher" in db_info["tables_found"]
    assert "Admin" in db_info["tables_found"]
    print(f"[PASS] 2. GET /health/database: Connected to '{db_info['database_name']}' on {db_info['server_version']}")

    test_student_email = "test.student@example.edu"
    test_teacher_email = "test.teacher@example.edu"

    db = SessionLocal()
    try:
        db.query(models.Student).filter(models.Student.email == test_student_email).delete()
        db.query(models.Teacher).filter(models.Teacher.email == test_teacher_email).delete()
        db.commit()
    finally:
        db.close()

    res = client.post("/auth/student/register", json={
        "first_name": "Test",
        "last_name": "Candidate",
        "email": test_student_email,
        "institute": "Tech Institute",
        "roll_number": "CS2026-001",
        "class_year": "4th Year",
        "password": "Password123!",
        "confirm_password": "WrongPassword123!",
    })
    assert res.status_code == 422, f"Expected 422 for mismatched passwords, got {res.status_code}"
    print("[PASS] 3. Student Registration rejects mismatched passwords (422)")

    res = client.post("/auth/student/register", json={
        "first_name": "Test",
        "last_name": "Candidate",
        "email": test_student_email,
        "institute": "Tech Institute",
        "roll_number": "CS2026-001",
        "class_year": "4th Year",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    assert res.status_code == 201, f"Student registration failed: {res.text}"
    student_auth = res.json()
    assert student_auth["approval_status"] == "pending"
    assert "access_token" not in student_auth
    assert "password" not in student_auth["user"]
    print("[PASS] 4. Student Registration creates pending student without active token (201)")

    res = client.post("/auth/student/register", json={
        "first_name": "Duplicate",
        "last_name": "Student",
        "email": test_student_email,
        "institute": "Tech Institute",
        "roll_number": "CS2026-002",
        "class_year": "4th Year",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    assert res.status_code == 400, f"Expected 400 for duplicate email, got {res.status_code}"
    print("[PASS] 5. Student Registration blocks duplicate email (400)")

    res = client.post("/auth/student/login", json={
        "email": test_student_email,
        "password": "Password123!",
    })
    assert res.status_code == 403, f"Expected 403 for pending student, got {res.status_code}"
    print("[PASS] 6. Pending Student Login is rejected with 403 awaiting approval")

    res = client.post("/auth/student/login", json={
        "email": test_student_email,
        "password": "IncorrectPassword!",
    })
    assert res.status_code == 401, f"Expected 401 for bad password, got {res.status_code}"
    print("[PASS] 7. Student Login rejects incorrect password (401)")

    res = client.post("/auth/teacher/register", json={
        "first_name": "Prof",
        "last_name": "Oak",
        "email": test_teacher_email,
        "institute": "Oak Research University",
        "department": "Computer Science & AI",
        "password": "ProfessorPassword2026!",
        "confirm_password": "ProfessorPassword2026!",
    })
    assert res.status_code == 201, f"Teacher registration failed: {res.text}"
    teacher_auth = res.json()
    assert teacher_auth["approval_status"] == "pending"
    assert teacher_auth["user"]["institute"] == "Oak Research University"
    assert "access_token" not in teacher_auth
    print("[PASS] 8. Teacher Registration creates pending teacher with institute (201)")

    res = client.post("/auth/teacher/login", json={
        "email": test_teacher_email,
        "password": "ProfessorPassword2026!",
    })
    assert res.status_code == 403, f"Expected 403 for pending teacher, got {res.status_code}"
    print("[PASS] 9. Pending Teacher Login is rejected with 403 awaiting approval")

    admin_email_env = os.getenv("ADMIN_EMAIL")
    admin_password_env = os.getenv("ADMIN_PASSWORD")
    admin_token = None
    student_token = None
    teacher_token = None
    if admin_email_env and admin_password_env:
        res = client.post("/auth/admin/login", json={
            "email": admin_email_env,
            "password": admin_password_env,
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        admin_auth = res.json()
        admin_token = admin_auth["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("[PASS] 10a. Admin Login succeeds with configured admin credentials (200)")

        res = client.post("/admins/users/approve", headers=admin_headers, json={
            "email": test_student_email,
            "role": "student",
        })
        assert res.status_code == 200, f"Admin approval of student failed: {res.text}"

        res = client.post("/auth/student/login", json={
            "email": test_student_email,
            "password": "Password123!",
        })
        assert res.status_code == 200, f"Student login failed after approval: {res.text}"
        student_token = res.json()["access_token"]
        print("[PASS] 10b. Admin approves student and student logs in successfully (200)")

        res = client.post("/admins/users/approve", headers=admin_headers, json={
            "email": test_teacher_email,
            "role": "teacher",
        })
        assert res.status_code == 200, f"Admin approval of teacher failed: {res.text}"

        res = client.post("/auth/teacher/login", json={
            "email": test_teacher_email,
            "password": "ProfessorPassword2026!",
        })
        assert res.status_code == 200, f"Teacher login failed after approval: {res.text}"
        teacher_token = res.json()["access_token"]
        print("[PASS] 10c. Admin approves teacher and teacher logs in successfully (200)")
    else:
        print("[SKIP] 10. Admin Login skipped: ADMIN_EMAIL and ADMIN_PASSWORD not configured in environment")


    res = client.get("/students/me", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 200
    assert res.json()["email"] == test_student_email
    print("[PASS] 11. Student accesses GET /students/me successfully (200)")

    res = client.get("/students/me", headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 403, f"Expected 403 for wrong role, got {res.status_code}"
    print("[PASS] 12. Cross-role access denied: Teacher cannot access Student route (403)")

    res = client.get("/teachers/me", headers={"Authorization": f"Bearer {teacher_token}"})
    assert res.status_code == 200
    assert res.json()["department"] == "Computer Science & AI"
    print("[PASS] 13. Teacher accesses GET /teachers/me successfully (200)")

    if admin_token:
        res = client.get("/admins/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        users = res.json()
        assert len(users["students"]) >= 1
        assert len(users["teachers"]) >= 1
        print(f"[PASS] 14. Admin lists platform users successfully (200) - found {len(users['students'])} student(s), {len(users['teachers'])} teacher(s)")
    else:
        print("[SKIP] 14. Admin lists platform users skipped: requires configured admin credentials")

    res = client.get("/students/me")
    assert res.status_code == 401
    print("[PASS] 15. Request without Authorization header is rejected (401)")

    print("\n==================================================")
    print("ALL 15 BACKEND TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
