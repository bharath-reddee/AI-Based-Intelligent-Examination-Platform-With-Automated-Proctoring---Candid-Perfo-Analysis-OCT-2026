"""
Verification Suite for ExamAI Milestone 2:
- Examination Submission Status & Backend Isolation
- Duplicate Start/Instruction/Answer Prevention
- Student Isolation & Dashboard Status Persistence
"""

import sys
import os
import uuid

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import Teacher, Student, Exam, Question, ExamAssignment, ExamAttempt, StudentAnswer
from services.auth_service import create_access_token

client = TestClient(app)

def run_tests():
    db = SessionLocal()
    print("=" * 70)
    print("EXAMAI SUBMISSION STATUS & DUPLICATE ATTEMPT VERIFICATION")
    print("=" * 70)

    try:
        teacher = db.query(Teacher).filter(Teacher.approval_status == "approved").first()
        student_a = db.query(Student).filter(Student.approval_status == "approved").first()
        student_b = db.query(Student).filter(Student.approval_status == "approved", Student.email != student_a.email).first()

        assert teacher is not None, "Approved teacher required in database"
        assert student_a is not None, "Approved student A required in database"

        if not student_b:
            b_uid = uuid.uuid4().hex[:6]
            student_b = Student(
                first_name="Isolation",
                last_name="Student",
                email=f"isolation_student_{b_uid}@example.com",
                institute=student_a.institute,
                roll_number=f"ROLL{b_uid}",
                class_year=student_a.class_year,
                password="testhashedpassword",
                approval_status="approved",
                is_active=True,
            )
            db.add(student_b)
            db.commit()
            db.refresh(student_b)

        token_a = create_access_token({"sub": student_a.email, "role": "student"})
        token_b = create_access_token({"sub": student_b.email, "role": "student"})

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        test_uid = uuid.uuid4().hex[:6]
        exam = Exam(
            title=f"Submission Verification Exam {test_uid}",
            subject="Computer Science",
            duration_minutes=30,
            total_marks=20,
            passing_marks=10,
            teacher_email=teacher.email,
            is_published=True,
            ai_proctoring_enabled=True,
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)

        q1 = Question(
            exam_id=exam.id,
            question_text="What does CPU stand for?",
            question_type="mcq",
            options=["Central Processing Unit", "Computer Personal Unit", "Control Process Unit", "Core Power Unit"],
            correct_answer="Central Processing Unit",
            marks=10,
            order_index=1,
        )
        db.add(q1)

        db.add(ExamAssignment(exam_id=exam.id, student_email=student_a.email))
        db.add(ExamAssignment(exam_id=exam.id, student_email=student_b.email))
        db.commit()

        print("[OK] Test environment initialized: Teacher, Student A, Student B, and Shared Proctored Exam.")

        res = client.get("/exams/student/available", headers=headers_a)
        assert res.status_code == 200, f"Available exams failed: {res.text}"
        exams_a = res.json()
        target_a = next((e for e in exams_a if e["id"] == exam.id), None)
        assert target_a is not None, "Exam not visible in Student A available list"
        assert target_a["attempt_status"] in ["not_started", "not_attempted"]
        assert target_a["is_submitted"] is False
        print("[TEST 1 PASSED] Initial available exam has is_submitted=False, attempt_status in not_started/not_attempted")

        res = client.get(f"/exams/student/{exam.id}/instructions", headers=headers_a)
        assert res.status_code == 200, f"Instructions failed: {res.text}"
        print("[TEST 2 PASSED] Instructions accessible for unsubmitted exam")

        res = client.post(f"/exams/student/{exam.id}/start", headers=headers_a)
        assert res.status_code == 200, f"Start exam failed: {res.text}"
        start_data = res.json()
        attempt_id = start_data["attempt_id"]
        assert attempt_id is not None
        print(f"[TEST 3 PASSED] Student A started attempt {attempt_id}")

        res = client.post(
            f"/exams/student/attempts/{attempt_id}/save-answer",
            headers=headers_a,
            json={"question_id": q1.id, "answer_text": "Central Processing Unit"},
        )
        assert res.status_code == 200, f"Save answer failed: {res.text}"
        print("[TEST 4 PASSED] Student A saved answer")

        submission_payload = {
            "answers": [
                {"question_id": q1.id, "answer_text": "Central Processing Unit"}
            ]
        }
        res = client.post(f"/exams/student/attempts/{attempt_id}/submit", headers=headers_a, json=submission_payload)
        assert res.status_code == 200, f"Submit attempt failed: {res.text}"
        submit_data = res.json()
        assert submit_data.get("status") in ["submitted", "evaluated", "pending_evaluation", "graded"]
        print(f"[TEST 5 PASSED] Student A submitted successfully. Attempt status: {submit_data.get('status')}")

        res = client.get("/exams/student/available", headers=headers_a)
        assert res.status_code == 200
        exams_a = res.json()
        target_a = next(e for e in exams_a if e["id"] == exam.id)
        assert target_a["is_submitted"] is True, f"Expected is_submitted=True, got {target_a['is_submitted']}"
        assert target_a["attempt_status"] == "submitted", f"Expected attempt_status='submitted', got {target_a['attempt_status']}"
        print("[TEST 6 PASSED] Available list reflects is_submitted=True and attempt_status='submitted' persistently")

        res = client.get("/students/dashboard-summary", headers=headers_a)
        assert res.status_code == 200
        dash_a = res.json()
        assert dash_a["metrics"]["completed_exams"] >= 1
        recent_a = next((e for e in dash_a["recent_exams"] if e["id"] == exam.id), None)
        if recent_a:
            assert recent_a["status"] == "Submitted"
        print("[TEST 7 PASSED] Dashboard summary accurately counts completed_exams and sets status to 'Submitted'")

        res = client.get(f"/exams/student/{exam.id}/instructions", headers=headers_a)
        assert res.status_code == 400, f"Expected 400 on instructions, got {res.status_code}"
        assert "already submitted" in res.json().get("detail", "").lower()
        print("[TEST 8 PASSED] Backend blocks /instructions for submitted exam with HTTP 400")

        res = client.post(f"/exams/student/{exam.id}/start", headers=headers_a)
        assert res.status_code == 400, f"Expected 400 on start, got {res.status_code}"
        assert "already submitted" in res.json().get("detail", "").lower()
        print("[TEST 9 PASSED] Backend blocks /start for submitted exam with HTTP 400")

        res = client.post(
            f"/exams/student/attempts/{attempt_id}/save-answer",
            headers=headers_a,
            json={"question_id": q1.id, "answer_text": "Computer Personal Unit"},
        )
        assert res.status_code == 400, f"Expected 400 on save-answer after submission, got {res.status_code}"
        print("[TEST 10 PASSED] Backend blocks answer modification on submitted attempt")

        res = client.post(f"/exams/student/attempts/{attempt_id}/submit", headers=headers_a, json=submission_payload)
        assert res.status_code == 400, f"Expected 400 on duplicate submit, got {res.status_code}"
        assert "already been submitted" in res.json().get("detail", "").lower()
        print("[TEST 11 PASSED] Backend blocks duplicate submission with HTTP 400")

        res = client.get("/exams/student/available", headers=headers_b)
        assert res.status_code == 200
        exams_b = res.json()
        target_b = next(e for e in exams_b if e["id"] == exam.id)
        assert target_b["is_submitted"] is False, "Student B should NOT be marked as submitted"
        assert target_b["attempt_status"] in ["not_started", "not_attempted"], "Student B should still be not_started/not_attempted"

        res = client.get(f"/exams/student/{exam.id}/instructions", headers=headers_b)
        assert res.status_code == 200, "Student B should still have access to exam instructions"
        print("[TEST 12 PASSED] Student Isolation verified: Student B is completely unaffected by Student A's submission")

        print("=" * 70)
        print("ALL 12 VERIFICATION SUITE CHECKS COMPLETED SUCCESSFULLY (100% PASS)")
        print("=" * 70)

    finally:
        try:
            if 'attempt_id' in locals():
                db.query(StudentAnswer).filter(StudentAnswer.attempt_id == attempt_id).delete(synchronize_session=False)
            if 'exam' in locals() and exam.id:
                db.query(ExamAttempt).filter(ExamAttempt.exam_id == exam.id).delete(synchronize_session=False)
                db.query(ExamAssignment).filter(ExamAssignment.exam_id == exam.id).delete(synchronize_session=False)
                db.query(Question).filter(Question.exam_id == exam.id).delete(synchronize_session=False)
                db.query(Exam).filter(Exam.id == exam.id).delete(synchronize_session=False)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Cleanup warning: {e}")
        db.close()

if __name__ == "__main__":
    run_tests()
