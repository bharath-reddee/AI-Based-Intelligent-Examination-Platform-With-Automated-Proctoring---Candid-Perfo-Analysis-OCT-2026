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
from services.auth_service import create_access_token

client = TestClient(app)

def run_teacher_results_verification():
    print("==================================================")
    print("TESTING TEACHER DASHBOARD, RESULTS & EVALUATION")
    print("==================================================")

    db = SessionLocal()
    try:
        teacher = db.query(models.Teacher).filter(models.Teacher.email == "ashishrana5563@gmail.com").first()
        if not teacher:
            teacher = db.query(models.Teacher).first()
        assert teacher is not None, "No teacher account found in database!"

        t_token = create_access_token(data={"sub": teacher.email, "role": "teacher"})
        t_headers = {"Authorization": f"Bearer {t_token}"}
        print(f"[INFO] Using authenticated teacher: {teacher.email} ({teacher.first_name} {teacher.last_name})")

        res = client.get("/teachers/dashboard-summary", headers=t_headers)
        assert res.status_code == 200, f"Dashboard summary failed: {res.text}"
        data = res.json()
        assert "metrics" in data
        metrics = data["metrics"]
        print(f"[PASS] 1. GET /teachers/dashboard-summary: {metrics['total_students_enrolled']} Students, {metrics['active_exams']} Published Exams, {metrics['questions_bank_count']} Question Bank Items, {metrics['proctoring_alerts_flagged']} Alerts Flagged")

        res = client.get("/teachers/mock-tests", headers=t_headers)
        assert res.status_code == 200, f"Get mock tests failed: {res.text}"
        mock_res = res.json()
        assert "attempts" in mock_res
        attempts = mock_res["attempts"]
        if len(attempts) == 0:
            student = db.query(models.Student).first()
            if student:
                import datetime
                sample_mock = models.Exam(
                    title="Practice Test - Data Structures & Algorithms",
                    subject="Computer Science",
                    topic="Binary Search Trees",
                    duration_minutes=30,
                    total_marks=10,
                    passing_marks=4,
                    number_of_questions=2,
                    is_mock=True,
                    created_by_student=student.email,
                    teacher_email=teacher.email,
                    is_published=True
                )
                db.add(sample_mock)
                db.flush()
                q1 = models.Question(
                    exam_id=sample_mock.id,
                    question_text="What is the average time complexity of searching a balanced BST?",
                    question_type="mcq",
                    options=["O(log N)", "O(N)", "O(1)", "O(N^2)"],
                    correct_answer="O(log N)",
                    marks=5
                )
                db.add(q1)
                db.flush()
                sample_att = models.ExamAttempt(
                    exam_id=sample_mock.id,
                    student_email=student.email,
                    status="evaluated",
                    score=5.0,
                    total_marks=5.0,
                    submit_time=datetime.datetime.utcnow(),
                    is_mock=True
                )
                db.add(sample_att)
                db.flush()
                ans1 = models.StudentAnswer(
                    attempt_id=sample_att.id,
                    question_id=q1.id,
                    answer_text="O(log N)",
                    is_correct=True,
                    awarded_marks=5.0,
                    evaluated_at=datetime.datetime.utcnow()
                )
                db.add(ans1)
                db.commit()
                res = client.get("/teachers/mock-tests", headers=t_headers)
                mock_res = res.json()
                attempts = mock_res.get("attempts", [])
        assert len(attempts) > 0, "Expected at least 1 mock test attempt for teacher scope!"
        target_attempt = attempts[0]
        att_id = target_attempt["attempt_id"]
        print(f"[PASS] 2. GET /teachers/mock-tests: Found {len(attempts)} attempts. Selected Attempt ID: {att_id} ({target_attempt['student_name']})")

        res_search = client.get(f"/teachers/mock-tests?search={target_attempt['student_name'].split()[0]}", headers=t_headers)
        assert res_search.status_code == 200
        assert any(a["attempt_id"] == att_id for a in res_search.json()["attempts"])
        print("[PASS] 3. GET /teachers/mock-tests search filtering verified")

        res_detail = client.get(f"/teachers/mock-tests/{att_id}", headers=t_headers)
        assert res_detail.status_code == 200, f"Get attempt detail failed: {res_detail.text}"
        detail = res_detail.json()
        assert detail["attempt_id"] == att_id
        assert detail["student_email"] == target_attempt["student_email"]
        assert "questions" in detail
        assert len(detail["questions"]) > 0
        assert "analytics" in detail
        assert "history" in detail
        print(f"[PASS] 4. GET /teachers/mock-tests/{att_id} returned detailed results with {len(detail['questions'])} questions, {len(detail['history'])} history records, and analytics")

        mcq_questions = [q for q in detail["questions"] if q["question_type"] == "mcq"]
        subj_questions = [q for q in detail["questions"] if q["question_type"] != "mcq"]
        print(f"       Questions breakdown: {len(mcq_questions)} MCQ, {len(subj_questions)} Subjective")

        if subj_questions:
            target_q = subj_questions[0]
            res_invalid = client.post(
                f"/teachers/mock-tests/{att_id}/evaluate-answer",
                headers=t_headers,
                json={"question_id": target_q["question_id"], "awarded_marks": target_q["max_marks"] + 5.0, "feedback": "Too generous"}
            )
            assert res_invalid.status_code == 400, f"Expected 400 for excessive marks, got {res_invalid.status_code}"
            print(f"[PASS] 5. Subjective evaluation rejects awarded marks > max_marks ({target_q['max_marks']})")

            res_neg = client.post(
                f"/teachers/mock-tests/{att_id}/evaluate-answer",
                headers=t_headers,
                json={"question_id": target_q["question_id"], "awarded_marks": -1.0, "feedback": "Negative marks"}
            )
            assert res_neg.status_code in [400, 422], f"Expected 400/422 for negative marks, got {res_neg.status_code}"
            print("[PASS] 6. Subjective evaluation rejects negative marks")

            awarded = float(min(target_q["max_marks"], 3.5))
            eval_feedback = "Good conceptual understanding with clear explanation."
            res_eval = client.post(
                f"/teachers/mock-tests/{att_id}/evaluate-answer",
                headers=t_headers,
                json={"question_id": target_q["question_id"], "awarded_marks": awarded, "feedback": eval_feedback}
            )
            assert res_eval.status_code == 200, f"Evaluation failed: {res_eval.text}"
            eval_data = res_eval.json()
            eval_q = next(q for q in eval_data["questions"] if q["question_id"] == target_q["question_id"])
            assert eval_q["awarded_marks"] == awarded
            assert eval_q["teacher_feedback"] == eval_feedback
            assert eval_q["evaluation_status"] == "evaluated"
            print(f"[PASS] 7. Successfully evaluated subjective question: awarded {awarded}/{target_q['max_marks']} marks, new attempt score: {eval_data['score']}/{eval_data['total_marks']}")

            res_check = client.get(f"/teachers/mock-tests/{att_id}", headers=t_headers)
            assert res_check.status_code == 200
            persisted_q = next(q for q in res_check.json()["questions"] if q["question_id"] == target_q["question_id"])
            assert persisted_q["awarded_marks"] == awarded
            assert persisted_q["teacher_feedback"] == eval_feedback
            print("[PASS] 8. Evaluation change persists in PostgreSQL across subsequent requests")

        unauth_teacher = db.query(models.Teacher).filter(models.Teacher.email == "prof.unauth@example.edu").first()
        if not unauth_teacher:
            unauth_teacher = db.query(models.Teacher).filter(models.Teacher.email != teacher.email).first()
        if not unauth_teacher:
            unauth_teacher = models.Teacher(
                first_name="Isolated",
                last_name="Professor",
                email="prof.unauth@example.edu",
                institute="Different Institute",
                department="Mechanical Engineering",
                password="HashedPassword123!",
                approval_status="approved",
                is_active=True
            )
            db.add(unauth_teacher)
            db.commit()
        assert unauth_teacher is not None, "Need a second teacher to test authorization isolation!"
        unauth_token = create_access_token(data={"sub": unauth_teacher.email, "role": "teacher"})
        unauth_headers = {"Authorization": f"Bearer {unauth_token}"}
        res_unauth = client.get(f"/teachers/mock-tests/{att_id}", headers=unauth_headers)
        assert res_unauth.status_code == 403, f"Expected 403 for unauthorized teacher, got {res_unauth.status_code}"
        print(f"[PASS] 9. Security: Teacher {unauth_teacher.email} outside instructional scope cannot access Attempt #{att_id} (403 Forbidden)")

        res_proc = client.get("/teachers/proctoring-incidents", headers=t_headers)
        assert res_proc.status_code == 200, f"Proctoring incidents failed: {res_proc.text}"
        incidents = res_proc.json()
        print(f"[PASS] 10. GET /teachers/proctoring-incidents returned {len(incidents)} incidents")

        print("\n==================================================")
        print("ALL TEACHER DASHBOARD & EVALUATION TESTS PASSED!")
        print("==================================================")
    finally:
        db.close()

if __name__ == "__main__":
    run_teacher_results_verification()
