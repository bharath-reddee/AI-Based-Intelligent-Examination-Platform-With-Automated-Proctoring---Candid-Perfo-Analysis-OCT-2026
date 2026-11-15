"""
Unit & Functional Tests for Task 4: Dual-Format Examination Platform
"""

from unittest.mock import patch
from conftest import load_task_module

mcq_generator_t4 = load_task_module(4, "mcq_generator.py")

def test_task4_generate_mcqs():
    """Verify Task 4 MCQ generator returns options list and answer matching."""
    sample_response = {
        "questions": [
            {
                "question": "Which data structure uses LIFO order?",
                "options": ["Queue", "Stack", "Array", "Linked List"],
                "answer": "Stack",
                "explanation": "Stack operates on Last-In, First-Out principle.",
                "concept": "Stack Operations"
            }
        ]
    }

    with patch.object(mcq_generator_t4, "get_ai_json_response", return_value=sample_response):
        mcqs = mcq_generator_t4.generate_mcqs("Data Structures", "Easy", 1)
        assert len(mcqs) == 1
        assert mcqs[0]["answer"] == "Stack"
        assert len(mcqs[0]["options"]) == 4
        assert mcqs[0]["concept"] == "Stack Operations"

def test_task4_generate_qa_questions_with_mcq_context():
    """Verify Task 4 written question generator receives MCQ concepts to avoid repetition."""
    sample_mcqs = [
        {"question": "What is a Stack?", "concept": "Stack Operations"}
    ]
    sample_qa_response = {
        "questions": [
            {
                "question": "Explain collision resolution techniques in Hash Tables.",
                "expected_answer": "Separate chaining and open addressing (linear probing, quadratic probing).",
                "key_points": ["Separate chaining", "Open addressing", "Linear probing"],
                "concept": "Hashing"
            }
        ]
    }

    with patch.object(mcq_generator_t4, "get_ai_json_response", return_value=sample_qa_response):
        qa = mcq_generator_t4.generate_qa_questions("Data Structures", "Medium", 1, sample_mcqs)
        assert len(qa) == 1
        assert qa[0]["concept"] == "Hashing"
        assert len(qa[0]["key_points"]) == 3

def test_task4_evaluate_written_answer():
    """Verify Task 4 automated rubric grading."""
    sample_eval = {
        "marks": 4.5,
        "feedback": "Clear explanation with good examples of collision handling.",
        "missing_points": ["Double hashing not mentioned."]
    }

    with patch.object(mcq_generator_t4, "get_ai_json_response", return_value=sample_eval):
        res = mcq_generator_t4.evaluate_written_answer(
            question="Explain collision resolution in hashing.",
            expected_answer="Chaining and open addressing.",
            key_points=["Chaining", "Open addressing"],
            answer="Collisions occur when two keys hash to the same bucket. Resolved using chaining and linear probing."
        )
        assert res["marks"] == 4.5
        assert len(res["missing_points"]) == 1
        assert "collision" in res["feedback"].lower()

def test_task4_evaluate_empty_answer():
    """Verify 0 marks awarded when candidate submits empty response."""
    res = mcq_generator_t4.evaluate_written_answer(
        question="Explain recursion.",
        expected_answer="Function calling itself with base condition.",
        key_points=["Base condition", "Recursive step"],
        answer=""
    )
    assert res["marks"] == 0.0
    assert len(res["missing_points"]) == 2
