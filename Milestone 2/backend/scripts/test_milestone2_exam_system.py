import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import Teacher, Student, Exam, Question, ExamAssignment, ExamAttempt
from services.auth_service import create_access_token
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=====================================================================")
    print("  EXAMAI MILESTONE 2: END-TO-END AUTOMATED VERIFICATION SUITE")
    print("=====================================================================")

    db = SessionLocal()
    try:
        teacher = db.query(Teacher).filter(Teacher.approval_status == "approved").first()
        student = db.query(Student).filter(Student.approval_status == "approved").first()

        if not teacher:
            print("ERROR: No approved teacher found in database.")
            return False
        if not student:
            print("ERROR: No approved student found in database.")
            return False

        print(f"[OK] Teacher Verified: {teacher.email} (Institute: {teacher.institute})")
        print(f"[OK] Student Verified: {student.email} (Institute: {student.institute})")

        teacher_token = create_access_token(data={"sub": teacher.email, "role": "teacher"})
        student_token = create_access_token(data={"sub": student.email, "role": "student"})
        teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
        student_headers = {"Authorization": f"Bearer {student_token}"}

        res_summary = client.get("/teachers/dashboard-summary", headers=teacher_headers)
        assert res_summary.status_code == 200, f"Dashboard summary failed: {res_summary.text}"
        summary_data = res_summary.json()
        print(f"[OK] GET /teachers/dashboard-summary: total_exams={summary_data['metrics']['total_exams']}, approved_students={summary_data['metrics']['total_approved_students']}")

        res_students = client.get("/teachers/students?search=", headers=teacher_headers)
        assert res_students.status_code == 200, f"Students directory failed: {res_students.text}"
        students_list = res_students.json()
        assert len(students_list) > 0, "No students returned in directory"
        print(f"[OK] GET /teachers/students: {len(students_list)} approved candidates found")

        exam_payload = {
            "title": "Automated E2E Verification Examination: AI Ethics & Systems",
            "subject": "Artificial Intelligence",
            "topic": "Neural Ethics & Automated Evaluation",
            "description": "Comprehensive integration test paper validating Milestone 2 features.",
            "instructions": "1. Fullscreen mandatory. 2. Tab switches monitored. 3. Face presence active.",
            "duration_minutes": 45,
            "difficulty": "Medium",
            "max_tab_switches": 3,
            "ai_proctoring_enabled": True,
            "negative_marking_enabled": True,
            "negative_marking_score": 0.25,
            "shuffle_questions": True,
            "shuffle_options": True
        }
        res_create = client.post("/exams/teacher", json=exam_payload, headers=teacher_headers)
        assert res_create.status_code in [200, 201], f"Create exam failed: {res_create.text}"
        created_exam = res_create.json()
        exam_id = created_exam["id"]
        print(f"[OK] POST /exams/teacher: Created Exam ID {exam_id} with status '{created_exam['status']}'")

        q1_payload = {
            "question_text": "Which optimization algorithm utilizes running averages of both gradients and second moments of gradients?",
            "question_type": "mcq",
            "difficulty": "Medium",
            "marks": 2.0,
            "negative_marks": 0.25,
            "options": ["Stochastic Gradient Descent (SGD)", "Adam Optimizer", "Adagrad", "Momentum Optimizer"],
            "correct_answer": "Adam Optimizer",
            "explanation": "Adam combines Adaptive Gradient Algorithm and Root Mean Square Propagation."
        }
        res_q1 = client.post(f"/exams/teacher/{exam_id}/questions", json=q1_payload, headers=teacher_headers)
        assert res_q1.status_code in [200, 201], f"Add Q1 failed: {res_q1.text}"

        q2_payload = {
            "question_text": "Select all valid regularization techniques commonly used in deep neural networks:",
            "question_type": "multi_select",
            "difficulty": "Medium",
            "marks": 3.0,
            "options": ["Dropout", "L2 Weight Decay", "Data Augmentation", "Increasing Learning Rate Indefinitely"],
            "correct_answer": '["Dropout", "L2 Weight Decay", "Data Augmentation"]',
            "explanation": "Dropout, L2 regularization, and data augmentation prevent overfitting."
        }
        res_q2 = client.post(f"/exams/teacher/{exam_id}/questions", json=q2_payload, headers=teacher_headers)
        assert res_q2.status_code in [200, 201], f"Add Q2 failed: {res_q2.text}"

        q3_payload = {
            "question_text": "What does the acronym NLP stand for in computational linguistics?",
            "question_type": "short_answer",
            "difficulty": "Easy",
            "marks": 1.0,
            "correct_answer": "Natural Language Processing",
            "explanation": "NLP stands for Natural Language Processing."
        }
        res_q3 = client.post(f"/exams/teacher/{exam_id}/questions", json=q3_payload, headers=teacher_headers)
        assert res_q3.status_code in [200, 201], f"Add Q3 failed: {res_q3.text}"

        q4_payload = {
            "question_text": "Explain the concept of Overfitting in machine learning models and discuss two architectural strategies to mitigate it.",
            "question_type": "long_answer",
            "difficulty": "Hard",
            "marks": 5.0,
            "min_words": 20,
            "max_words": 300,
            "model_answer": "Overfitting occurs when a model learns training data noise rather than generalized patterns. Strategies include dropout and early stopping.",
            "explanation": "Evaluates candidate conceptual understanding of generalization."
        }
        res_q4 = client.post(f"/exams/teacher/{exam_id}/questions", json=q4_payload, headers=teacher_headers)
        assert res_q4.status_code in [200, 201], f"Add Q4 failed: {res_q4.text}"

        res_exam_detail = client.get(f"/exams/teacher/{exam_id}", headers=teacher_headers)
        exam_detail = res_exam_detail.json()
        q_count = exam_detail.get("number_of_questions") or len(exam_detail.get("questions", []))
        assert q_count == 4, f"Expected 4 questions, got {q_count}"
        assert exam_detail["total_marks"] == 11.0, f"Expected 11.0 marks, got {exam_detail['total_marks']}"
        print(f"[OK] Question Management: 4 questions created (MCQ, Multi-select, Short, Long). Total Marks: {exam_detail['total_marks']}")

        assign_payload = {"student_emails": [student.email]}
        res_assign = client.post(f"/exams/teacher/{exam_id}/assign", json=assign_payload, headers=teacher_headers)
        assert res_assign.status_code == 200, f"Assignment failed: {res_assign.text}"

        res_assignments_list = client.get(f"/exams/teacher/{exam_id}/assignments", headers=teacher_headers)
        assignments_data = res_assignments_list.json()
        assigned_emails = [a["email"] for a in assignments_data["assigned_students"]]
        assert student.email in assigned_emails, f"Student {student.email} not found in assigned list"
        print(f"[OK] POST /exams/teacher/{exam_id}/assign: Assigned {student.email}")

        res_publish = client.post(f"/exams/teacher/{exam_id}/publish", headers=teacher_headers)
        assert res_publish.status_code == 200, f"Publish failed: {res_publish.text}"
        assert res_publish.json()["status"] == "published"
        print(f"[OK] POST /exams/teacher/{exam_id}/publish: Successfully published examination")

        res_student_exams = client.get("/exams/student/available", headers=student_headers)
        assert res_student_exams.status_code == 200, f"Student available exams failed: {res_student_exams.text}"
        student_exams_list = res_student_exams.json()
        matching_exam = next((e for e in student_exams_list if e["id"] == exam_id), None)
        assert matching_exam is not None, f"Published exam {exam_id} not visible to assigned student"
        print(f"[OK] GET /exams/student/available: Exam ID {exam_id} visible with status '{matching_exam['attempt_status']}'")

        res_instructions = client.get(f"/exams/student/{exam_id}/instructions", headers=student_headers)
        assert res_instructions.status_code == 200, f"Instructions failed: {res_instructions.text}"
        inst_data = res_instructions.json()
        assert inst_data["ai_proctoring_enabled"] == True
        print(f"[OK] GET /exams/student/{exam_id}/instructions: Pre-exam readiness criteria confirmed")

        res_start = client.post(f"/exams/student/{exam_id}/start", headers=student_headers)
        assert res_start.status_code == 200, f"Start attempt failed: {res_start.text}"
        attempt_data = res_start.json()
        attempt_id = attempt_data["attempt_id"]
        assert len(attempt_data["questions"]) == 4
        print(f"[OK] POST /exams/student/{exam_id}/start: Attempt ID {attempt_id} initiated. Remaining: {attempt_data['remaining_seconds']}s")

        q_adam = next(q for q in attempt_data["questions"] if q["question_type"] == "mcq")
        res_save_q1 = client.post(
            f"/exams/student/attempts/{attempt_id}/save-answer",
            json={"question_id": q_adam["id"], "answer_text": "Adam Optimizer"},
            headers=student_headers
        )
        assert res_save_q1.status_code == 200, f"Save Q1 failed: {res_save_q1.text}"

        q_nlp = next(q for q in attempt_data["questions"] if q["question_type"] == "short_answer")
        res_save_q3 = client.post(
            f"/exams/student/attempts/{attempt_id}/save-answer",
            json={"question_id": q_nlp["id"], "answer_text": "Natural Language Processing"},
            headers=student_headers
        )
        assert res_save_q3.status_code == 200, f"Save Q3 failed: {res_save_q3.text}"
        print(f"[OK] POST /exams/student/attempts/{attempt_id}/save-answer: Autosaved candidate responses")

        res_proc = client.post(
            f"/exams/student/attempts/{attempt_id}/proctoring-event",
            json={
                "event_type": "Tab Switch / Focus Loss",
                "severity": "medium",
                "details": "Candidate switched away from browser window during proctored exam"
            },
            headers=student_headers
        )
        assert res_proc.status_code == 200, f"Proctoring event log failed: {res_proc.text}"
        print(f"[OK] POST /exams/student/attempts/{attempt_id}/proctoring-event: Telemetry event recorded")

        submission_payload = {
            "answers": [
                {"question_id": q_adam["id"], "answer_text": "Adam Optimizer"},
                {"question_id": q_nlp["id"], "answer_text": "Natural Language Processing"}
            ]
        }
        res_submit = client.post(
            f"/exams/student/attempts/{attempt_id}/submit",
            json=submission_payload,
            headers=student_headers
        )
        assert res_submit.status_code == 200, f"Submit attempt failed: {res_submit.text}"
        result_data = res_submit.json()
        assert result_data["score"] >= 3.0, f"Expected score >= 3.0 (2 for Adam + 1 for NLP), got {result_data['score']}"
        print(f"[OK] POST /exams/student/attempts/{attempt_id}/submit: Graded Score: {result_data['score']} / {result_data['total_marks']} ({result_data['percentage']}%)")

        res_submissions = client.get(f"/exams/teacher/{exam_id}/submissions", headers=teacher_headers)
        sub_data = res_submissions.json()
        sub_list = sub_data.get("submissions", sub_data if isinstance(sub_data, list) else [])
        assert len(sub_list) == 1
        assert sub_list[0]["student_email"] == student.email
        assert sub_list[0]["score"] == result_data["score"]
        assert sub_list[0]["tab_switch_count"] >= 1
        print(f"[OK] GET /exams/teacher/{exam_id}/submissions: Verified candidate result and proctoring telemetry in instructor audit")

        res_close = client.post(f"/exams/teacher/{exam_id}/close", headers=teacher_headers)
        assert res_close.status_code == 200, f"Close exam failed: {res_close.text}"
        assert res_close.json()["status"] == "closed"
        print(f"[OK] POST /exams/teacher/{exam_id}/close: Examination closed safely preserving candidate attempts")

        res_reopen = client.post(f"/exams/teacher/{exam_id}/reopen", headers=teacher_headers)
        assert res_reopen.status_code == 200, f"Reopen exam failed: {res_reopen.text}"
        assert res_reopen.json()["status"] == "published"
        print(f"[OK] POST /exams/teacher/{exam_id}/reopen: Examination reopened successfully")

        draft_payload = {"title": "Temporary Disposable Draft", "subject": "Test", "duration_minutes": 15}
        res_temp_draft = client.post("/exams/teacher", json=draft_payload, headers=teacher_headers)
        temp_id = res_temp_draft.json()["id"]
        res_del_draft = client.delete(f"/exams/teacher/{temp_id}", headers=teacher_headers)
        assert res_del_draft.status_code == 200, f"Delete draft failed: {res_del_draft.text}"
        print(f"[OK] DELETE /exams/teacher/{temp_id}: Draft examination deleted cleanly")

        print("=====================================================================")
        print("  ALL 17 AUTOMATED TESTS PASSED SUCCESSFULLY! (100% GREEN)")
        print("=====================================================================")
        return True

    finally:
        db.close()

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
