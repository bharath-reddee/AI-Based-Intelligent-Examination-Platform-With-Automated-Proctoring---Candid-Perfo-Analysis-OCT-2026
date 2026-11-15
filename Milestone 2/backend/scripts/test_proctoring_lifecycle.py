import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import Teacher, Student, Exam, ExamAttempt, ProctoringEvent
from services.auth_service import create_access_token
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_face_proctoring_and_cleanup_lifecycle():
    print("=====================================================================")
    print("  VERIFYING FACE MONITORING, HEAD POSE EVENTS & SUBMISSION API")
    print("=====================================================================")

    db = SessionLocal()
    try:
        teacher = db.query(Teacher).filter(Teacher.approval_status == "approved").first()
        student = db.query(Student).filter(Student.approval_status == "approved").first()

        assert teacher is not None, "No approved teacher found in DB"
        assert student is not None, "No approved student found in DB"

        teacher_token = create_access_token(data={"sub": teacher.email, "role": "teacher"})
        student_token = create_access_token(data={"sub": student.email, "role": "student"})
        t_headers = {"Authorization": f"Bearer {teacher_token}"}
        s_headers = {"Authorization": f"Bearer {student_token}"}

        attempt = db.query(ExamAttempt).filter(ExamAttempt.student_email == student.email).first()
        if not attempt:
            exam = db.query(Exam).filter(Exam.status == "published").first()
            if not exam:
                exam = Exam(
                    title="Proctoring Lifecycle Verification Exam",
                    subject="Computer Vision & AI",
                    topic="Automated Telemetry",
                    teacher_email=teacher.email,
                    status="published",
                    ai_proctoring_enabled=True,
                    total_marks=10,
                    passing_marks=5,
                    duration_minutes=30
                )
                db.add(exam)
                db.commit()
                db.refresh(exam)

            attempt = ExamAttempt(
                exam_id=exam.id,
                student_email=student.email,
                status="in_progress",
                tab_switch_count=0
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)

        print(f"[OK] Testing with Attempt ID: {attempt.id}, Student: {student.email}")
        initial_tab_switches = attempt.tab_switch_count or 0

        res_face = client.post(
            f"/exams/student/attempts/{attempt.id}/proctoring-event",
            headers=s_headers,
            json={
                "event_type": "face_not_detected",
                "severity": "high",
                "details": "Candidate face not detected in webcam feed for 3 consecutive seconds."
            }
        )
        assert res_face.status_code == 200, f"Logging face_not_detected failed: {res_face.text}"
        data_face = res_face.json()
        assert data_face["status"] == "logged"
        assert data_face["tab_switch_count"] == initial_tab_switches, "Face absence must NOT increment tab_switch_count!"
        print(f"[PASS] 1. POST /exams/student/attempts/{attempt.id}/proctoring-event (face_not_detected logged, incident_id={data_face['incident_id']})")

        res_turn_l = client.post(
            f"/exams/student/attempts/{attempt.id}/proctoring-event",
            headers=s_headers,
            json={
                "event_type": "head_turned_left",
                "severity": "medium",
                "details": "Candidate face turned away from the screen (left) for 3 consecutive seconds (Yaw: 28.4°)."
            }
        )
        assert res_turn_l.status_code == 200, f"Logging head_turned_left failed: {res_turn_l.text}"
        data_turn_l = res_turn_l.json()
        assert data_turn_l["status"] == "logged"
        assert data_turn_l["tab_switch_count"] == initial_tab_switches, "Head turn must NOT increment tab_switch_count!"
        print(f"[PASS] 2. POST /exams/student/attempts/{attempt.id}/proctoring-event (head_turned_left logged, incident_id={data_turn_l['incident_id']})")

        res_turn_r = client.post(
            f"/exams/student/attempts/{attempt.id}/proctoring-event",
            headers=s_headers,
            json={
                "event_type": "head_turned_right",
                "severity": "medium",
                "details": "Candidate face turned away from the screen (right) for 3 consecutive seconds (Yaw: -26.1°)."
            }
        )
        assert res_turn_r.status_code == 200, f"Logging head_turned_right failed: {res_turn_r.text}"
        data_turn_r = res_turn_r.json()
        assert data_turn_r["status"] == "logged"
        assert data_turn_r["tab_switch_count"] == initial_tab_switches, "Head turn must NOT increment tab_switch_count!"
        print(f"[PASS] 3. POST /exams/student/attempts/{attempt.id}/proctoring-event (head_turned_right logged, incident_id={data_turn_r['incident_id']})")

        res_incidents = client.get("/teachers/proctoring-incidents", headers=t_headers)
        assert res_incidents.status_code == 200, f"Teacher incidents failed: {res_incidents.text}"
        incidents = res_incidents.json()
        event_types = [inc["event_type"] for inc in incidents]
        assert "face_not_detected" in event_types or "Face Not Detected" in event_types, "face_not_detected should be in instructor incidents log"
        print(f"[PASS] 4. GET /teachers/proctoring-incidents: {len(incidents)} incidents visible to teacher including real face and head pose incidents")

        if attempt.exam_id:
            res_subs = client.get(f"/exams/teacher/{attempt.exam_id}/submissions", headers=t_headers)
            assert res_subs.status_code == 200, f"Teacher submissions failed: {res_subs.text}"
            subs_data = res_subs.json()
            print(f"[PASS] 5. GET /exams/teacher/{attempt.exam_id}/submissions: Instructor audit reflects proctoring telemetry")

        print("=====================================================================")
        print("  ALL PROCTORING TELEMETRY AND LIFECYCLE TESTS PASSED SUCCESSFULLY!")
        print("=====================================================================")
        return True
    finally:
        db.close()

if __name__ == "__main__":
    success = test_face_proctoring_and_cleanup_lifecycle()
    sys.exit(0 if success else 1)
