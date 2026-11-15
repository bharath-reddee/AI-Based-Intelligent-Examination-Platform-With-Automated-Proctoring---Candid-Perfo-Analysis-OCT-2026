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

def run_mock_verification():
    print("==================================================")
    print("TESTING MOCK TEST PERSISTENCE & TEACHER AUTHORIZATION")
    print("==================================================")

    s_email = "student.mocktest@example.edu"
    t_email_authorized = "prof.auth@example.edu"
    t_email_unauthorized = "prof.unauth@example.edu"

    db = SessionLocal()
    try:
        attempts = db.query(models.ExamAttempt).filter(models.ExamAttempt.student_email == s_email).all()
        for att in attempts:
            db.query(models.StudentAnswer).filter(models.StudentAnswer.attempt_id == att.id).delete()
            db.delete(att)
        
        test_teachers = [t_email_authorized, t_email_unauthorized]
        old_exams = db.query(models.Exam).filter(models.Exam.teacher_email.in_(test_teachers)).all()
        for oe in old_exams:
            oe_attempts = db.query(models.ExamAttempt).filter(models.ExamAttempt.exam_id == oe.id).all()
            for oea in oe_attempts:
                db.query(models.StudentAnswer).filter(models.StudentAnswer.attempt_id == oea.id).delete(synchronize_session=False)
                db.delete(oea)
            db.query(models.Question).filter(models.Question.exam_id == oe.id).delete(synchronize_session=False)
            db.delete(oe)
        db.commit()

        db.query(models.Student).filter(models.Student.email == s_email).delete(synchronize_session=False)
        db.query(models.Teacher).filter(models.Teacher.email.in_(test_teachers)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()

    res = client.post("/auth/student/register", json={
        "first_name": "Mock",
        "last_name": "Candidate",
        "email": s_email,
        "institute": "Engineering University",
        "roll_number": "MOCK-2026-099",
        "class_year": "3rd Year",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    assert res.status_code == 201, f"Student registration failed: {res.text}"

    res = client.post("/auth/teacher/register", json={
        "first_name": "Database",
        "last_name": "Professor",
        "email": t_email_authorized,
        "institute": "Tech Institute",
        "department": "Computer Science & Engineering",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    assert res.status_code == 201, f"Authorized teacher registration failed: {res.text}"

    res = client.post("/auth/teacher/register", json={
        "first_name": "Literature",
        "last_name": "Professor",
        "email": t_email_unauthorized,
        "institute": "Arts Academy",
        "department": "Humanities & Arts",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    assert res.status_code == 201, f"Unauthorized teacher registration failed: {res.text}"

    db = SessionLocal()
    try:
        db.query(models.Student).filter(models.Student.email == s_email).update({"approval_status": "approved"})
        db.query(models.Teacher).filter(models.Teacher.email.in_([t_email_authorized, t_email_unauthorized])).update({"approval_status": "approved"})
        db.commit()
    finally:
        db.close()

    res_s = client.post("/auth/student/login", json={"email": s_email, "password": "Password123!"})
    assert res_s.status_code == 200, f"Student login failed: {res_s.text}"
    student_token = res_s.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("[PASS] 1. Student registered and authenticated successfully")

    res_ta = client.post("/auth/teacher/login", json={"email": t_email_authorized, "password": "Password123!"})
    assert res_ta.status_code == 200, f"Auth teacher login failed: {res_ta.text}"
    auth_teacher_token = res_ta.json()["access_token"]
    auth_teacher_headers = {"Authorization": f"Bearer {auth_teacher_token}"}
    print("[PASS] 2. Authorized teacher registered and authenticated successfully")

    res_tu = client.post("/auth/teacher/login", json={"email": t_email_unauthorized, "password": "Password123!"})
    assert res_tu.status_code == 200, f"Unauth teacher login failed: {res_tu.text}"
    unauth_teacher_token = res_tu.json()["access_token"]
    unauth_teacher_headers = {"Authorization": f"Bearer {unauth_teacher_token}"}
    print("[PASS] 3. Unrelated teacher registered and authenticated successfully")

    res = client.post("/exams/", headers=auth_teacher_headers, json={
        "title": "CS301 Official Database Systems Midterm",
        "description": "Departmental examination",
        "instructions": "All questions mandatory",
        "subject": "Database Systems & SQL",
        "duration_minutes": 60,
        "total_marks": 50,
        "passing_marks": 20,
        "number_of_questions": 5,
        "is_published": True,
    })
    assert res.status_code in [200, 201], f"Create exam failed: {res.text}"
    print("[PASS] 4. Authorized teacher created official exam in Database Systems & SQL")

    res = client.get("/mocks/subjects", headers=student_headers)
    assert res.status_code == 200, f"Get mock subjects failed: {res.text}"
    subjects = res.json()["subjects"]
    assert len(subjects) > 0
    assert all(isinstance(s, str) and len(s.strip()) > 0 for s in subjects)
    print(f"[PASS] 5. GET /mocks/subjects returned {len(subjects)} sanitized subjects: {subjects}")

    res = client.post("/mocks/generate", headers=student_headers, json={
        "subject": "Database Systems & SQL",
        "question_count": 3,
        "duration_minutes": 15,
    })
    assert res.status_code == 200, f"Generate mock failed: {res.text}"
    mock_data = res.json()
    attempt_id = mock_data["attempt_id"]
    questions = mock_data["questions"]
    assert attempt_id is not None
    assert len(questions) == 3
    print(f"[PASS] 6. Mock test generated (attempt_id: {attempt_id}, 3 questions)")

    res = client.get("/teachers/mock-tests", headers=auth_teacher_headers)
    assert res.status_code == 200
    mock_activity = res.json()
    assert all(a["attempt_id"] != attempt_id for a in mock_activity["attempts"]), \
        "Incomplete in_progress attempt must not be displayed on Teacher Dashboard!"
    print("[PASS] 7. In-progress mock test attempt correctly omitted from Teacher Dashboard")

    db = SessionLocal()
    sub_answers = []
    try:
        for q in questions:
            db_q = db.query(models.Question).filter(models.Question.id == q["id"]).first()
            sub_answers.append({"question_id": q["id"], "answer_text": db_q.correct_answer or "test answer"})
    finally:
        db.close()
    res = client.post(f"/mocks/{attempt_id}/submit", headers=student_headers, json={"answers": sub_answers})
    assert res.status_code == 200, f"Submit mock failed: {res.text}"
    result_eval = res.json()
    assert result_eval["attempt_id"] == attempt_id
    assert result_eval["total_questions"] == 3
    assert result_eval["correct_count"] >= 1
    print(f"[PASS] 8. Mock test submitted & evaluated (Score: {result_eval['score']}/{result_eval['total_marks']})")

    res_retry = client.post(f"/mocks/{attempt_id}/submit", headers=student_headers, json={"answers": sub_answers})
    assert res_retry.status_code == 200, f"Retry submit failed: {res_retry.text}"
    assert res_retry.json()["attempt_id"] == attempt_id
    db = SessionLocal()
    try:
        ans_count = db.query(models.StudentAnswer).filter(models.StudentAnswer.attempt_id == attempt_id).count()
        assert ans_count == 3, f"Expected exactly 3 student answers, found {ans_count} (duplicates created!)"
    finally:
        db.close()
    print("[PASS] 9. Idempotent submission verified: retry returns result with 0 duplicate records")

    res = client.get("/mocks/history", headers=student_headers)
    assert res.status_code == 200
    history = res.json()
    assert any(h["attempt_id"] == attempt_id for h in history), "Attempt must appear in student's history"
    print("[PASS] 10. Student GET /mocks/history returns completed practice attempt")

    res = client.get("/teachers/mock-tests", headers=auth_teacher_headers)
    assert res.status_code == 200, f"Teacher mock-tests failed: {res.text}"
    t_activity = res.json()
    assert t_activity["total_attempts"] >= 1
    matching_attempt = next((a for a in t_activity["attempts"] if a["attempt_id"] == attempt_id), None)
    assert matching_attempt is not None, "Attempt must appear on Authorized Teacher Dashboard"
    assert matching_attempt["student_name"] == "Mock Candidate"
    assert matching_attempt["student_email"] == s_email
    assert matching_attempt["subject"] == "Database Systems & SQL"
    assert matching_attempt["score"] == result_eval["score"]
    assert matching_attempt["total_marks"] == result_eval["total_marks"]
    assert matching_attempt["status"] in ["completed", "pending_evaluation"]
    assert matching_attempt["evaluation_status"] in ["completed", "pending_evaluation"]
    print(f"[PASS] 11. Authorized teacher successfully received student practice mock result: {matching_attempt['student_name']} - {matching_attempt['score']}/{matching_attempt['total_marks']}")

    res = client.get("/teachers/mock-tests", headers=student_headers)
    assert res.status_code == 403, f"Expected 403 for student accessing teacher route, got {res.status_code}"
    print("[PASS] 12. Cross-role protection: Student forbidden from accessing /teachers/mock-tests (403)")

    res = client.get("/teachers/mock-tests")
    assert res.status_code == 401, f"Expected 401 for unauthenticated request, got {res.status_code}"
    print("[PASS] 13. Unauthenticated request rejected (401)")

    res = client.get("/teachers/mock-tests", headers=unauth_teacher_headers)
    assert res.status_code == 200
    unauth_activity = res.json()
    assert not any(a["attempt_id"] == attempt_id for a in unauth_activity["attempts"]), \
        "Unrelated teacher outside candidate/subject scope must NOT see unrelated student mock test!"
    print("[PASS] 14. Scope isolation verified: Unrelated teacher cannot view out-of-scope mock test")

    print("\n==================================================")
    print("ALL MOCK TEST VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_mock_verification()
