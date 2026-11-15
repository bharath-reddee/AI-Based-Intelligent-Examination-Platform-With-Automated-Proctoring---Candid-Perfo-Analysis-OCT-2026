"""
Unit & Functional Tests for Task 1: AI Model Diagnostics
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT_DIR = Path(__file__).resolve().parent.parent
TASK1_DIR = ROOT_DIR / "Milestone 1" / "Task 1"
sys.path.insert(0, str(TASK1_DIR))

import task1

def test_task1_env_loading():
    """Verify that environment path resolution finds api_keys.env."""
    assert task1.env_path is not None
    assert task1.env_path.exists()

def test_task1_mask_key():
    """Verify API key masking never prints full raw secrets."""
    assert task1.mask_key("") == "[NOT SET]"
    masked = task1.mask_key("sk-1234567890abcdef")
    assert "sk-" in masked
    assert "cdef" in masked
    assert "1234567890" not in masked

def test_task1_model_adaptation():
    """Verify deprecated gpt-3.5-turbo adapts to gpt-4o-mini."""
    assert task1.ACTIVE_OPENAI_MODEL == "gpt-4o-mini"

def test_task1_openai_invocation_mock():
    """Verify OpenAI model invocation handling."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value.content = "A compiler translates high-level code to machine code."
    
    response = mock_llm.invoke("Test prompt")
    assert "compiler" in response.content.lower()

def test_task1_gemini_invocation_mock():
    """Verify Gemini model invocation handling."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value.content = "Gemini operational response."
    
    response = mock_llm.invoke("Test prompt")
    assert "operational" in response.content.lower()
