"""
Negative & Edge Case Tests for Examination Engine
"""

from unittest.mock import MagicMock, patch
from conftest import load_task_module

t3_gen = load_task_module(3, "mcq_generator.py")
t4_gen = load_task_module(4, "mcq_generator.py")
t5_gen = load_task_module(5, "mcq_generator.py")

def test_negative_task3_clamped_counts():
    """Verify number of questions is clamped safely."""
    with patch("langchain_openai.ChatOpenAI") as mock_chat:
        mock_instance = MagicMock()
        mock_instance.invoke.return_value.content = '{"questions": [{"question": "Q1", "options": {"A":"1","B":"2","C":"3","D":"4"}, "answer":"A", "explanation":"Ex"}]}'
        mock_chat.return_value = mock_instance

        res = t3_gen.generate_mcqs("Python", "Easy", -5)
        assert len(res) == 1

def test_negative_task4_invalid_json():
    """Verify ValueError is raised when AI returns unparseable content."""
    with patch.object(t4_gen, "get_ai_json_response", side_effect=ValueError("AI returned non-JSON content.")):
        try:
            t4_gen.generate_mcqs("Operating Systems", "Hard", 3)
            assert False, "Expected ValueError"
        except ValueError as e:
            assert "non-JSON" in str(e)

def test_negative_task5_empty_written_answer():
    """Verify empty written answer receives 0 marks and all missing points."""
    res = t5_gen.evaluate_written_answer(
        question="What is an API?",
        expected_answer="Application Programming Interface allowing applications to communicate.",
        key_points=["Interface definition", "System communication"],
        answer="   \n\t  "
    )
    assert res["marks"] == 0.0
    assert len(res["missing_points"]) == 2
    assert "No answer was provided" in res["feedback"]

def test_negative_task5_normalize():
    """Verify normalization strips punctuation and lowercases text."""
    t1 = "What is Python 3.14?!?"
    t2 = "what is python 3 14"
    assert t5_gen.normalize(t1) == t5_gen.normalize(t2)
