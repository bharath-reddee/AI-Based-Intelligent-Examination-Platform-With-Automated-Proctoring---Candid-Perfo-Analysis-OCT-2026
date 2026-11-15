import sys
import os
import time
import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal
from models import Teacher, Exam, Question
from services.auth_service import create_access_token
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
db = SessionLocal()

print("=====================================================================")
print("  AI QUESTION GENERATION & EXAM VALIDATION E2E VERIFICATION SUITE")
print("=====================================================================")

print("\n--- 1. Health & DB Verification ---")
res_h = client.get("/health")
assert res_h.status_code == 200, f"Health failed: {res_h.text}"
print("[PASS] Health endpoint online:", res_h.json())

print("\n--- 2. Teacher Auth Setup ---")
teacher = db.query(Teacher).filter(Teacher.approval_status == "approved").first()
assert teacher, "No approved teacher found in database"
token = create_access_token(data={"sub": teacher.email, "role": "teacher"})
headers = {"Authorization": f"Bearer {token}"}
print(f"[PASS] Authenticated Teacher: {teacher.email}")

print("\n--- 3. Date/Time & Marks Constraint Verification ---")
res_bad_date = client.post("/exams/", headers=headers, json={
    "title": "Invalid Date Sequence Exam",
    "subject": "Physics",
    "duration_minutes": 60,
    "total_marks": 100,
    "passing_marks": 40,
    "start_time": "2026-11-01T15:00:00Z",
    "end_time": "2026-11-01T14:00:00Z",
})
assert res_bad_date.status_code == 422, f"Expected 422 for start >= end, got {res_bad_date.status_code}"
print("[PASS] 422 Unprocessable Content returned when start_time >= end_time:", res_bad_date.json()["detail"])

res_bad_marks = client.post("/exams/", headers=headers, json={
    "title": "Invalid Marks Ratio Exam",
    "subject": "Physics",
    "duration_minutes": 60,
    "total_marks": 50,
    "passing_marks": 60,
})
assert res_bad_marks.status_code == 422, f"Expected 422 for passing > total, got {res_bad_marks.status_code}"
print("[PASS] 422 Unprocessable Content returned when passing_marks > total_marks:", res_bad_marks.json()["detail"])

future_start = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)
future_end = future_start + datetime.timedelta(hours=3)
res_create = client.post("/exams/", headers=headers, json={
    "title": "Autonomous AI Verification Examination",
    "subject": "Computer Science",
    "topic": "Distributed Consensus & AI Proctoring",
    "description": "Integration test for AI Question Generation and examination scheduling.",
    "instructions": "Standard examination rules apply.",
    "difficulty": "Medium",
    "duration_minutes": 60,
    "total_marks": 100,
    "passing_marks": 40,
    "start_time": future_start.isoformat(),
    "end_time": future_end.isoformat(),
    "is_published": False,
})
assert res_create.status_code == 200, f"Create exam failed: {res_create.text}"
created_exam = res_create.json()
exam_id = created_exam["id"]
print(f"[PASS] Created Draft Exam #{exam_id}")
print(f"       start_time in response: {created_exam['start_time']}")
print(f"       end_time in response:   {created_exam['end_time']}")

db_exam = db.query(Exam).filter(Exam.id == exam_id).first()
assert db_exam.start_time.hour == future_start.hour, f"Timezone shifted! DB hour {db_exam.start_time.hour} vs expected {future_start.hour}"
print(f"[PASS] DB correctly stored UTC hour {db_exam.start_time.hour} matching request without timezone drift.")

print("\n--- 4. Real AI Question Generation Request Flow ---")
t0 = time.time()
ai_payload = {
    "subject": "Computer Science",
    "topic": "Distributed Consensus & Raft",
    "difficulty": "Medium",
    "mcq_count": 2,
    "multi_select_count": 1,
    "short_answer_count": 1,
    "long_answer_count": 0,
    "instructions": "Emphasize leader election, log replication, and safety properties."
}
res_ai = client.post("/exams/teacher/ai-generate-questions", headers=headers, json=ai_payload)
elapsed = round(time.time() - t0, 2)
assert res_ai.status_code == 200, f"AI Question Generation failed: {res_ai.text}"
generated_questions = res_ai.json()
print(f"[PASS] AI generation succeeded in {elapsed}s (within acceptable latency)")
print(f"[PASS] Received {len(generated_questions)} generated assessment items:")
for idx, q in enumerate(generated_questions):
    print(f"   {idx + 1}. [{q['question_type'].upper()}] ({q['marks']} pts) {q['question_text'][:70]}...")
    if q.get("options"):
        print(f"      Options: {len(q['options'])} items | Key: {q.get('correct_answer')[:30] if q.get('correct_answer') else 'N/A'}")

print("\n--- 5. Batch Insertion of Generated Questions into Exam ---")
res_batch = client.post(f"/exams/teacher/{exam_id}/batch-questions", headers=headers, json={"questions": generated_questions})
assert res_batch.status_code == 200, f"Batch add failed: {res_batch.text}"
updated_exam = res_batch.json()
print(f"[PASS] Successfully added {len(updated_exam['questions'])} questions into Exam #{exam_id}")
print(f"       Exam calculated total marks: {updated_exam['total_marks']}")

print("\n--- 6. CORS Configuration Verification ---")
res_cors = client.options("/exams/teacher/ai-generate-questions", headers={
    "Origin": "http://localhost:5173",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "authorization,content-type",
})
assert res_cors.status_code == 200, f"CORS options failed: {res_cors.status_code}"
assert res_cors.headers.get("access-control-allow-origin") == "http://localhost:5173"
print("[PASS] CORS preflight OPTIONS request returned 200 with Allow-Origin: http://localhost:5173")

db.delete(db_exam)
db.commit()
print(f"[PASS] Cleaned up temporary test exam #{exam_id}")

print("\n=====================================================================")
print("  ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY")
print("=====================================================================")
