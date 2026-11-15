"""
Streamlit AppTest Smoke Suite
Simulates headless browser rendering and execution for Tasks 2, 3, 4, and 5.
"""

from pathlib import Path
from streamlit.testing.v1 import AppTest

ROOT_DIR = Path(__file__).resolve().parent.parent

def test_task2_app_smoke():
    """Verify Task 2 Streamlit UI mounts without exceptions."""
    app_path = ROOT_DIR / "Milestone 1" / "Task 2" / "task2.py"
    at = AppTest.from_file(str(app_path))
    at.run()
    assert len(at.exception) == 0

def test_task3_app_smoke():
    """Verify Task 3 Streamlit UI mounts without exceptions."""
    app_path = ROOT_DIR / "Milestone 1" / "Task 3" / "app.py"
    at = AppTest.from_file(str(app_path))
    at.run()
    assert len(at.exception) == 0

def test_task4_app_smoke():
    """Verify Task 4 Streamlit UI mounts without exceptions."""
    app_path = ROOT_DIR / "Milestone 1" / "Task 4" / "app.py"
    at = AppTest.from_file(str(app_path))
    at.run()
    assert len(at.exception) == 0

def test_task5_app_smoke():
    """Verify Task 5 Streamlit UI mounts without exceptions."""
    app_path = ROOT_DIR / "Milestone 1" / "Task 5" / "app.py"
    at = AppTest.from_file(str(app_path))
    at.run()
    assert len(at.exception) == 0
