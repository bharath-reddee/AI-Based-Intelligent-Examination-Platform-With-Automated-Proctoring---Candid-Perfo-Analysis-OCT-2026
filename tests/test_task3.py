"""
Unit & Functional Tests for Task 3: Interactive MCQ Quiz Platform
"""

import json
from unittest.mock import MagicMock, patch
from conftest import load_task_module

mcq_generator_t3 = load_task_module(3, "mcq_generator.py")

def test_task3_generate_mcqs():
    """Verify Task 3 MCQ generator handles options dict and validation."""
    sample_response = {
        "questions": [
            {
                "question": "What is the time complexity of binary search on a sorted array?",
                "options": {
                    "A": "O(n)",
                    "B": "O(log n)",
                    "C": "O(n^2)",
                    "D": "O(1)"
                },
                "answer": "B",
                "explanation": "Binary search divides the search space in half each step."
            }
        ]
    }

    with patch("langchain_openai.ChatOpenAI") as mock_chat:
        mock_instance = MagicMock()
        mock_instance.invoke.return_value.content = json.dumps(sample_response)
        mock_chat.return_value = mock_instance

        mcqs = mcq_generator_t3.generate_mcqs(
            topic="Data Structures",
            difficulty="Medium",
            number_of_questions=1
        )

        assert len(mcqs) == 1
        assert mcqs[0]["answer"] == "B"
        assert mcqs[0]["options"]["B"] == "O(log n)"
        assert "explanation" in mcqs[0]

def test_task3_empty_topic_error():
    """Verify ValueError is raised for blank or whitespace topics."""
    try:
        mcq_generator_t3.generate_mcqs(topic="   ", difficulty="Easy", number_of_questions=5)
        assert False, "Should have raised ValueError"
    except ValueError as err:
        assert "topic" in str(err).lower()
