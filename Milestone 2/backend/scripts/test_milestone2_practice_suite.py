import os
import sys
import json
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
from services.validation_service import (
    validate_and_refine_question,
    grade_objective_question,
    detect_scientific_ambiguity_in_mcq
)

client = TestClient(app)

def run_practice_verification_suite():
    print("=====================================================================")
    print("  MILESTONE 2: AI PRACTICE TESTS & ASSESSMENT QUALITY VERIFICATION")
    print("=====================================================================")

    print("\n--- 1. Testing Scientific Ambiguity & Answer-Key Validation ---")
    ambiguous_q = {
        "question_text": "For a reversible adiabatic process of an ideal gas, which path equation holds true?",
        "question_type": "mcq",
        "options": [
            "PV^\\gamma = \\text{constant}",
            "TV^{\\gamma-1} = \\text{constant}",
            "P/T = \\text{constant}",
            "V/T = \\text{constant}"
        ],
        "correct_answer": "PV^\\gamma = \\text{constant}",
        "marks": 1,
    }
    refined = validate_and_refine_question(ambiguous_q)
    assert refined["question_type"] == "multi_select", f"Expected promotion to multi_select, got {refined['question_type']}"
    assert refined["validation_status"] == "ambiguity_resolved_to_multi_select"
    parsed_corr = json.loads(refined["correct_answer"])
    assert len(parsed_corr) == 2, f"Expected 2 correct options, got {parsed_corr}"
    print("[PASS] Ambiguous thermodynamic equation question correctly promoted to multi_select with both valid relations.")

    print("\n--- 2. Testing Objective Scoring & Multi-Select Partial Credit ---")
    is_c, marks, fb = grade_objective_question("mcq", "K-Means", "K-Means", 2.0)
    assert is_c is True and marks == 2.0
    print("[PASS] MCQ exact match: Full marks awarded.")

    correct_json = json.dumps(["Option A", "Option B"])
    is_c, marks, fb = grade_objective_question("multi_select", '["Option A", "Option B"]', correct_json, 2.0)
    assert is_c is True and marks == 2.0
    print("[PASS] Multi-select full set match: 2.0 / 2.0 marks awarded.")

    is_c, marks, fb = grade_objective_question("multi_select", '["Option A"]', correct_json, 2.0, allow_partial=True)
    assert marks == 1.0, f"Expected partial credit 1.0, got {marks}"
    print("[PASS] Multi-select partial credit: 1.0 / 2.0 awarded for partial selection.")

    is_c, marks, fb = grade_objective_question("multi_select", '["Option A", "Option C"]', correct_json, 2.0, allow_partial=True)
    assert marks == 0.0, f"Expected 0.0 when incorrect option selected, got {marks}"
    print("[PASS] Multi-select with wrong choice: 0 marks awarded.")

    print("\n--- 3. Setting Up Student Authentication ---")
    db = SessionLocal()
    student = db.query(models.Student).filter(models.Student.approval_status == "approved").first()
    if not student:
        student = models.Student(
            first_name="Test",
            last_name="Student",
            email="practice.student@platform.edu",
            institute="Engineering College",
            roll_number="PRAC-001",
            class_year="4th Year",
            password="hashedpassword123",
            approval_status="approved",
            is_active=True,
        )
        db.add(student)
        db.commit()
    db.close()

    token = create_access_token(data={"sub": student.email, "role": "student"})
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Student Authenticated: {student.email}")

    print("\n--- 4. Testing Suggested Topics API ---")
    res = client.get("/mocks/topics", headers=headers)
    assert res.status_code == 200, f"Get topics failed: {res.text}"
    categories = res.json()["categories"]
    assert "Computer Science & Engineering" in categories
    assert "Physics & Engineering Thermodynamics" in categories
    print(f"[PASS] GET /mocks/topics returned {len(categories)} rich subject categories with topic suggestions.")

    print("\n--- 5. Testing Practice Test Generation & Input Validation ---")
    res_zero = client.post("/mocks/generate", headers=headers, json={
        "subject": "Physics",
        "mcq_count": 0,
        "multi_select_count": 0,
        "short_answer_count": 0,
        "long_answer_count": 0,
    })
    assert res_zero.status_code == 422, f"Expected 422 for zero questions, got {res_zero.status_code}"
    print("[PASS] Zero question count rejected with HTTP 422.")

    res_gen = client.post("/mocks/generate", headers=headers, json={
        "subject": "Physics & Engineering Thermodynamics",
        "topic": "Reversible Adiabatic & Isothermal Processes",
        "difficulty": "Medium",
        "mcq_count": 2,
        "multi_select_count": 1,
        "short_answer_count": 1,
        "long_answer_count": 0,
        "is_timed": True,
        "duration_minutes": 20,
    })
    assert res_gen.status_code == 200, f"Generate practice test failed: {res_gen.text}"
    gen_data = res_gen.json()
    attempt_id = gen_data["attempt_id"]
    exam_id = gen_data["exam_id"]
    questions = gen_data["questions"]
    assert len(questions) == 4, f"Expected 4 questions, got {len(questions)}"
    assert gen_data["is_timed"] is True
    assert gen_data["remaining_seconds"] == 20 * 60
    assert all("correct_answer" not in q or q.get("correct_answer") is None for q in questions), "Protected answer keys leaked!"
    print(f"[PASS] Practice test #{attempt_id} created with 4 questions and sanitized keys.")

    print("\n--- 6. Testing Attempt State & Server Timer ---")
    res_att = client.get(f"/mocks/attempts/{attempt_id}", headers=headers)
    assert res_att.status_code == 200
    att_data = res_att.json()
    assert att_data["remaining_seconds"] is not None and att_data["remaining_seconds"] <= 20 * 60
    print(f"[PASS] Server authoritative timer active: {att_data['remaining_seconds']}s remaining.")

    print("\n--- 7. Testing Autosave & Question Flagging ---")
    q0 = questions[0]
    q1 = questions[1]
    res_save = client.post(f"/mocks/attempts/{attempt_id}/save-answer", headers=headers, json={
        "question_id": q0["id"],
        "answer_text": q0["options"][0] if q0["options"] else "Sample Answer",
        "is_flagged": True,
    })
    assert res_save.status_code == 200, f"Save answer failed: {res_save.text}"

    res_verify = client.get(f"/mocks/attempts/{attempt_id}", headers=headers)
    saved_answers = res_verify.json()["saved_answers"]
    flagged_qs = res_verify.json()["flagged_questions"]
    assert str(q0["id"]) in saved_answers
    assert q0["id"] in flagged_qs
    print("[PASS] Answers and question flags persisted reliably across server calls.")

    print("\n--- 8. Testing Submission & Detailed Score Breakdown ---")
    submit_payload = {
        "answers": [
            {"question_id": q0["id"], "answer_text": q0["options"][0] if q0["options"] else ""},
            {"question_id": q1["id"], "answer_text": json.dumps([q1["options"][0]]) if q1["options"] else ""},
        ]
    }
    res_sub = client.post(f"/mocks/attempts/{attempt_id}/submit", headers=headers, json=submit_payload)
    assert res_sub.status_code == 200, f"Submit failed: {res_sub.text}"
    result = res_sub.json()
    assert result["attempt_id"] == attempt_id
    assert result["total_questions"] == 4
    assert result["answered_count"] == 2
    assert result["unanswered_count"] == 2
    assert "objective_marks" in result and "written_marks" in result
    print(f"[PASS] Detailed scoring: {result['score']}/{result['total_marks']} ({result['percentage']}%) | Status: {result['status']}")

    res_sub_repeat = client.post(f"/mocks/attempts/{attempt_id}/submit", headers=headers, json=submit_payload)
    assert res_sub_repeat.status_code == 200
    assert res_sub_repeat.json()["attempt_id"] == attempt_id
    print("[PASS] Duplicate submission safely handled with idempotent response.")

    print("\n--- 9. Testing Practice History Retrieval ---")
    res_hist = client.get("/mocks/history", headers=headers)
    assert res_hist.status_code == 200
    history_items = res_hist.json()
    assert any(h["attempt_id"] == attempt_id for h in history_items)
    print(f"[PASS] Practice history returned {len(history_items)} attempt entries including attempt #{attempt_id}.")

    print("\n--- 10. Testing Retake Workflow ---")
    res_retake = client.post(f"/mocks/attempts/{attempt_id}/retake", headers=headers)
    assert res_retake.status_code == 200, f"Retake failed: {res_retake.text}"
    retake_data = res_retake.json()
    new_attempt_id = retake_data["new_attempt_id"]
    assert new_attempt_id != attempt_id, "Retake must spawn a NEW distinct attempt!"

    res_hist_after = client.get("/mocks/history", headers=headers)
    assert any(h["attempt_id"] == attempt_id for h in res_hist_after.json())
    print(f"[PASS] Retake created new Attempt #{new_attempt_id} preserving prior Attempt #{attempt_id}.")

    print("\n--- 11. Testing Secure Attempt Deletion ---")
    unauth_headers = {"Authorization": f"Bearer {create_access_token(data={'sub': 'intruder@other.edu', 'role': 'student'})}"}
    res_del_cross = client.delete(f"/mocks/attempts/{attempt_id}", headers=unauth_headers)
    assert res_del_cross.status_code in [403, 404], f"Expected 403 or 404 for cross-user deletion, got {res_del_cross.status_code}"
    print("[PASS] Cross-user practice attempt deletion strictly blocked.")

    res_del = client.delete(f"/mocks/attempts/{attempt_id}", headers=headers)
    assert res_del.status_code == 200, f"Deletion failed: {res_del.text}"
    res_hist_del = client.get("/mocks/history", headers=headers)
    assert not any(h["attempt_id"] == attempt_id for h in res_hist_del.json())
    print(f"[PASS] Attempt #{attempt_id} deleted cleanly and verified removed from history.")

    client.delete(f"/mocks/attempts/{new_attempt_id}", headers=headers)

    print("\n=====================================================================")
    print("  ALL 11 MILESTONE 2 PRACTICE TEST CHECKS PASSED (100% SUCCESS)!")
    print("=====================================================================")

if __name__ == "__main__":
    run_practice_verification_suite()
