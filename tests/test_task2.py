"""
Unit & Functional Tests for Task 2: CSM Practice Test Generator
"""

import sys
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT_DIR = Path(__file__).resolve().parent.parent
TASK2_DIR = ROOT_DIR / "Milestone 1" / "Task 2"
sys.path.insert(0, str(TASK2_DIR))

import task2

def test_task2_subjects_list():
    """Verify that all 25 B.Tech CSM curriculum subjects are present."""
    assert len(task2.CSM_SUBJECTS) == 25
    assert "Machine Learning" in task2.CSM_SUBJECTS
    assert "Artificial Intelligence" in task2.CSM_SUBJECTS
    assert "Data Structures" in task2.CSM_SUBJECTS
    assert "Computer Vision" in task2.CSM_SUBJECTS

def test_task2_generate_csm_mcqs_validation():
    """Verify JSON schema validation and parsing in Task 2."""
    sample_response = {
        "questions": [
            {
                "question": "What is the primary objective of gradient descent in machine learning?",
                "options": {
                    "A": "To maximize loss function",
                    "B": "To minimize loss function",
                    "C": "To normalize datasets",
                    "D": "To encode categorical features"
                },
                "answer": "B",
                "explanation": "Gradient descent minimizes the cost/loss function iteratively."
            }
        ]
    }

    with patch("langchain_openai.ChatOpenAI") as mock_chat:
        mock_instance = MagicMock()
        mock_instance.invoke.return_value.content = json.dumps(sample_response)
        mock_chat.return_value = mock_instance

        result = task2.generate_csm_mcqs(
            subject_name="Machine Learning",
            topic_focus="Optimization",
            diff_level="Medium",
            count=1
        )

        assert len(result) == 1
        assert result[0]["answer"] == "B"
        assert len(result[0]["options"]) == 4
        assert "minimize" in result[0]["options"]["B"].lower()
