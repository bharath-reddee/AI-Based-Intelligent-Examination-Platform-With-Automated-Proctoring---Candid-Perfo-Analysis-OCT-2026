"""
Unit & Functional Tests for Task 5: Multimodal Intelligent Examination Platform
"""

from unittest.mock import MagicMock, patch
from conftest import load_task_module

mcq_generator_t5 = load_task_module(5, "mcq_generator.py")

def test_task5_generate_mcqs():
    """Verify Task 5 MCQ generation, validation, and deduplication."""
    sample_response = {
        "questions": [
            {
                "question": "What is the role of the activation function in a neural network?",
                "options": {
                    "A": "To introduce non-linearity",
                    "B": "To decrease model parameters",
                    "C": "To store dataset features",
                    "D": "To perform matrix inversion"
                },
                "answer": "A",
                "explanation": "Activation functions introduce non-linear properties to capture complex patterns.",
                "concept": "Neural Network Fundamentals"
            }
        ]
    }

    with patch.object(mcq_generator_t5, "ask_ai", return_value=sample_response):
        mcqs = mcq_generator_t5.generate_mcqs("Deep Learning", "Medium", 1)
        assert len(mcqs) == 1
        assert mcqs[0]["answer"] == "A"
        assert mcqs[0]["concept"] == "Neural Network Fundamentals"
        assert set(mcqs[0]["options"].keys()) == {"A", "B", "C", "D"}

def test_task5_generate_qa_questions_anti_overlap():
    """Verify Task 5 excludes concepts already tested in MCQs."""
    sample_mcqs = [
        {"question": "What is activation function?", "concept": "Activation Functions"}
    ]
    sample_qa_response = {
        "questions": [
            {
                "question": "Explain the vanishing gradient problem in deep backpropagation networks.",
                "expected_answer": "Gradients shrink exponentially as they propagate backward through layers.",
                "key_points": ["Exponential shrinkage", "Sigmoid saturation", "ReLU mitigates this"],
                "concept": "Backpropagation & Optimization",
                "max_marks": 5
            }
        ]
    }

    with patch.object(mcq_generator_t5, "ask_ai", return_value=sample_qa_response):
        qa = mcq_generator_t5.generate_qa_questions("Deep Learning", "Hard", 1, sample_mcqs)
        assert len(qa) == 1
        assert qa[0]["concept"] == "Backpropagation & Optimization"
        assert len(qa[0]["key_points"]) == 3

def test_task5_evaluate_written_answer():
    """Verify Task 5 rubric scoring and feedback."""
    sample_eval = {
        "marks": 4.75,
        "feedback": "Comprehensive and accurate discussion of gradient propagation.",
        "missing_points": ["Could mention residual connections (ResNet)."]
    }

    with patch.object(mcq_generator_t5, "ask_ai", return_value=sample_eval):
        res = mcq_generator_t5.evaluate_written_answer(
            question="Explain vanishing gradient problem.",
            expected_answer="Gradients shrink exponentially.",
            key_points=["Exponential decay", "Sigmoid saturation"],
            answer="Vanishing gradients happen when small derivatives multiply through many layers, leading to near-zero updates."
        )
        assert res["marks"] == 4.75
        assert len(res["missing_points"]) == 1
        assert "residual" in res["missing_points"][0].lower()

def test_task5_extract_text_from_image_mock():
    """Verify vision OCR extraction with mock image bytes."""
    dummy_image_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    expected_transcription = "Gradient descent minimizes the cost function by taking steps in the direction of steepest descent."

    with patch("langchain_openai.ChatOpenAI") as mock_chat:
        mock_instance = MagicMock()
        mock_instance.invoke.return_value.content = expected_transcription
        mock_chat.return_value = mock_instance

        text = mcq_generator_t5.extract_text_from_image(
            image_bytes=dummy_image_bytes,
            mime_type="image/png"
        )
        assert "Gradient descent" in text
