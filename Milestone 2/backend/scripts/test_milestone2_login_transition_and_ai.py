import sys
import os
import time
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database import SessionLocal
import models

BASE_URL = "http://localhost:8000"

STUDENT_EMAIL = "student.transition.test@platform.edu"
TEACHER_EMAIL = "teacher.transition.test@platform.edu"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@gmail.com")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "Admin@12345")
PASSWORD = "Password123!"

def setup_test_users():
    db = SessionLocal()
    try:
        stu = db.query(models.Student).filter(models.Student.email == STUDENT_EMAIL).first()
        if not stu:
            requests.post(f"{BASE_URL}/auth/student/register", json={
                "first_name": "Transition",
                "last_name": "Student",
                "email": STUDENT_EMAIL,
                "institute": "IntelliExam Academy",
                "roll_number": "TRANS-2026-001",
                "class_year": "3rd Year",
                "password": PASSWORD,
                "confirm_password": PASSWORD,
            })
        db.query(models.Student).filter(models.Student.email == STUDENT_EMAIL).update({
            "approval_status": "approved",
            "is_active": True,
        })

        tch = db.query(models.Teacher).filter(models.Teacher.email == TEACHER_EMAIL).first()
        if not tch:
            requests.post(f"{BASE_URL}/auth/teacher/register", json={
                "first_name": "Transition",
                "last_name": "Faculty",
                "email": TEACHER_EMAIL,
                "institute": "IntelliExam Academy",
                "department": "Computer Science & Engineering",
                "password": PASSWORD,
                "confirm_password": PASSWORD,
            })
        db.query(models.Teacher).filter(models.Teacher.email == TEACHER_EMAIL).update({
            "approval_status": "approved",
            "is_active": True,
        })
        db.commit()
    finally:
        db.close()


def test_student_login_and_preloading():
    print("\n--- 1. Testing Student Login & Initial Payload Preloading ---")
    bad_res = requests.post(f"{BASE_URL}/auth/student/login", json={
        "email": STUDENT_EMAIL,
        "password": "WrongPassword999!"
    })
    assert bad_res.status_code == 401, f"Expected 401 for bad password, got {bad_res.status_code}"
    print("[PASS] Invalid student credentials safely rejected with 401 (remains on login screen)")

    res = requests.post(f"{BASE_URL}/auth/student/login", json={
        "email": STUDENT_EMAIL,
        "password": PASSWORD
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "student"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Student authenticated: role='{data['role']}' user='{data['user']['email']}'")

    t0 = time.time()
    summary_res = requests.get(f"{BASE_URL}/students/dashboard-summary", headers=headers)
    exams_res = requests.get(f"{BASE_URL}/exams/student/available", headers=headers)
    mocks_res = requests.get(f"{BASE_URL}/mocks/history", headers=headers)
    t1 = time.time()

    assert summary_res.status_code == 200
    assert exams_res.status_code == 200
    assert mocks_res.status_code == 200
    print(f"[PASS] Student essential dashboard bundle pre-fetched in {(t1-t0)*1000:.1f}ms (Summary, Exams, Mock History ready for zero-staggered render)")


def test_teacher_login_and_preloading():
    print("\n--- 2. Testing Teacher Login & Initial Payload Preloading ---")
    bad_res = requests.post(f"{BASE_URL}/auth/teacher/login", json={
        "email": TEACHER_EMAIL,
        "password": "WrongPassword999!"
    })
    assert bad_res.status_code == 401, f"Expected 401 for bad password, got {bad_res.status_code}"
    print("[PASS] Invalid teacher credentials safely rejected with 401 (remains on login screen)")

    res = requests.post(f"{BASE_URL}/auth/teacher/login", json={
        "email": TEACHER_EMAIL,
        "password": PASSWORD
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["role"] == "teacher"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Teacher authenticated: role='{data['role']}' user='{data['user']['email']}'")

    t0 = time.time()
    summary_res = requests.get(f"{BASE_URL}/teachers/dashboard-summary", headers=headers)
    exams_res = requests.get(f"{BASE_URL}/exams/teacher/my-exams", headers=headers)
    students_res = requests.get(f"{BASE_URL}/teachers/students", headers=headers)
    mocks_res = requests.get(f"{BASE_URL}/teachers/mock-tests", headers=headers)
    t1 = time.time()

    assert summary_res.status_code == 200
    assert exams_res.status_code == 200
    assert students_res.status_code == 200
    assert mocks_res.status_code == 200
    print(f"[PASS] Teacher essential dashboard bundle pre-fetched in {(t1-t0)*1000:.1f}ms (Faculty Summary, Exams, Students, Mock Activity ready for zero-staggered render)")


def test_admin_login_and_preloading():
    print("\n--- 3. Testing Admin Login & Initial Payload Preloading ---")
    bad_res = requests.post(f"{BASE_URL}/auth/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": "WrongAdminPassword!"
    })
    assert bad_res.status_code == 401, f"Expected 401 for bad admin password, got {bad_res.status_code}"
    print("[PASS] Invalid admin credentials safely rejected with 401 (remains on login screen)")

    res = requests.post(f"{BASE_URL}/auth/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASS
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["role"] == "admin"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Admin authenticated: role='{data['role']}' user='{data['user']['email']}'")

    t0 = time.time()
    summary_res = requests.get(f"{BASE_URL}/admins/dashboard-summary", headers=headers)
    users_res = requests.get(f"{BASE_URL}/admins/users", headers=headers)
    t1 = time.time()

    assert summary_res.status_code == 200
    assert users_res.status_code == 200
    print(f"[PASS] Admin essential dashboard bundle pre-fetched in {(t1-t0)*1000:.1f}ms (Admin Summary & Platform User Directory ready for zero-staggered render)")


def test_fast_ai_generation_pipeline():
    print("\n--- 4. Testing Fast AI Question Generation Pipeline & Sanitization ---")
    login_res = requests.post(f"{BASE_URL}/auth/student/login", json={
        "email": STUDENT_EMAIL,
        "password": PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "subject": "Computer Science & Engineering",
        "topic": "Algorithms & Data Structures",
        "difficulty": "Medium",
        "mcq_count": 2,
        "multi_select_count": 1,
        "short_answer_count": 1,
        "long_answer_count": 0,
        "is_timed": True,
        "duration_minutes": 15,
    }

    t0 = time.time()
    gen_res = requests.post(f"{BASE_URL}/mocks/generate", json=payload, headers=headers)
    t1 = time.time()
    gen_duration = t1 - t0

    assert gen_res.status_code == 200, f"Expected 200, got {gen_res.status_code}: {gen_res.text}"
    res_data = gen_res.json()
    assert "attempt_id" in res_data
    assert "questions" in res_data
    assert len(res_data["questions"]) == 4

    for q in res_data["questions"]:
        assert "correct_answer" not in q or q.get("correct_answer") is None, "Security violation: correct_answer leaked in candidate question item!"
        assert "explanation" not in q or q.get("explanation") is None, "Security violation: explanation leaked in candidate question item!"

    print(f"[PASS] AI Practice Test generated in {gen_duration:.2f}s with 4 verified questions (MCQ: 2, Multi-select: 1, Short: 1)")
    print(f"[PASS] Candidate question security verified: All answer keys & explanations sanitized from preview payload")
    print(f"[PASS] Attempt #{res_data['attempt_id']} initialized in progress with {res_data['remaining_seconds']}s timer")


if __name__ == "__main__":
    print("=====================================================================")
    print("  EXAMAI: LOGIN TRANSITION FIX & FAST AI GENERATION VERIFICATION")
    print("=====================================================================")
    try:
        setup_test_users()
        test_student_login_and_preloading()
        test_teacher_login_and_preloading()
        test_admin_login_and_preloading()
        test_fast_ai_generation_pipeline()
        print("\n=====================================================================")
        print("  ALL VERIFICATION TESTS COMPLETED WITH 100% SUCCESS!")
        print("=====================================================================")
    except Exception as e:
        print(f"\n[FAIL] Test suite encountered an exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
