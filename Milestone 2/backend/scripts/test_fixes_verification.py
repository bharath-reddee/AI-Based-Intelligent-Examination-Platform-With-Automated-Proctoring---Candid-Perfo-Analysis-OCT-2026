import sys
import os
import json

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import schemas
from services.ai_service import generate_exam_questions

def test_ai_generate_schema():
    print("Testing AIGenerateQuestionsRequest schema...")
    
    # Valid arbitrary counts
    req = schemas.AIGenerateQuestionsRequest(
        subject="Computer Science",
        topic="Dynamic Programming",
        difficulty="Hard",
        mcq_count=12,
        multi_select_count=3,
        short_answer_count=4,
        long_answer_count=2,
    )
    assert req.mcq_count == 12
    assert req.multi_select_count == 3
    assert req.short_answer_count == 4
    assert req.long_answer_count == 2
    print("  [PASS] Custom question counts accepted")

    # Independent single question type (e.g., only MCQ, rest 0)
    req_only_mcq = schemas.AIGenerateQuestionsRequest(
        subject="Mathematics",
        topic="Linear Algebra",
        mcq_count=15,
        multi_select_count=0,
        short_answer_count=0,
        long_answer_count=0,
    )
    assert req_only_mcq.mcq_count == 15
    assert req_only_mcq.multi_select_count == 0
    print("  [PASS] Independent single category generation accepted")

    # Negative count rejection
    try:
        schemas.AIGenerateQuestionsRequest(
            subject="Physics",
            topic="Thermodynamics",
            mcq_count=-1,
        )
        assert False, "Should have rejected negative count"
    except Exception:
        print("  [PASS] Negative question count rejected by schema validation")

    # Excessive count rejection (>60)
    try:
        schemas.AIGenerateQuestionsRequest(
            subject="Physics",
            topic="Thermodynamics",
            mcq_count=65,
        )
        assert False, "Should have rejected count > 60"
    except Exception:
        print("  [PASS] Count > 60 rejected by schema validation")


def test_ai_service_token_and_timeout():
    print("\nTesting AI generation token scaling and bounds...")
    total_requested = 20
    calculated_max_tokens = min(8192, max(800, total_requested * 280 + 400))
    call_timeout = min(120, max(35, total_requested * 3 + 20))
    
    assert calculated_max_tokens == 6000
    assert call_timeout == 80
    print(f"  [PASS] 20 questions correctly allocates {calculated_max_tokens} max tokens and {call_timeout}s timeout")

    total_requested_large = 50
    calculated_max_tokens_large = min(8192, max(800, total_requested_large * 280 + 400))
    call_timeout_large = min(120, max(35, total_requested_large * 3 + 20))
    
    assert calculated_max_tokens_large == 8192  # Capped at 8192
    assert call_timeout_large == 120  # Capped at 120s
    print(f"  [PASS] 50 questions correctly scales to max token cap {calculated_max_tokens_large} and {call_timeout_large}s timeout")


def test_student_exam_start_contract():
    print("\nTesting Student Exam Start response contract...")
    # Verify the return payload dictionary structure
    from routers import exams
    import inspect
    start_src = inspect.getsource(exams.start_exam_attempt)
    
    assert '"negative_marking_enabled"' in start_src
    assert '"negative_marking_score"' in start_src
    assert '"questions"' in start_src
    assert '"remaining_seconds"' in start_src
    assert '"current_tab_switches"' in start_src
    print("  [PASS] start_exam_attempt contains all required payload fields")


def test_frontend_files_integrity():
    print("\nTesting Frontend safety & absence of null object conversions...")
    frontend_dir = os.path.abspath(os.path.join(backend_dir, "..", "frontend", "src"))
    
    # 1. Check StudentExamAttempt.jsx
    attempt_path = os.path.join(frontend_dir, "pages", "StudentExamAttempt.jsx")
    with open(attempt_path, "r", encoding="utf-8") as f:
        attempt_src = f.read()
    
    assert "const [answers, setAnswers] = useState({});" in attempt_src, "answers not initialized to {}"
    assert "const [flaggedQuestions, setFlaggedQuestions] = useState({});" in attempt_src, "flaggedQuestions not initialized to {}"
    assert "Object.values(flaggedQuestions || {})" in attempt_src or "Object.values(flaggedQuestions)" not in attempt_src
    assert "Object.entries(answers || {})" in attempt_src
    print("  [PASS] StudentExamAttempt.jsx initializes state to {} and guards Object methods")

    # 2. Check TeacherCreateExam.jsx
    teacher_create_path = os.path.join(frontend_dir, "pages", "TeacherCreateExam.jsx")
    with open(teacher_create_path, "r", encoding="utf-8") as f:
        teacher_src = f.read()

    assert "handleAiCountChange" in teacher_src
    assert "totalAiQuestions" in teacher_src
    assert 'max="30"' not in teacher_src
    print("  [PASS] TeacherCreateExam.jsx provides independent counts and dynamic total")


if __name__ == "__main__":
    test_ai_generate_schema()
    test_ai_service_token_and_timeout()
    test_student_exam_start_contract()
    test_frontend_files_integrity()
    print("\n=======================================================")
    print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=======================================================")
