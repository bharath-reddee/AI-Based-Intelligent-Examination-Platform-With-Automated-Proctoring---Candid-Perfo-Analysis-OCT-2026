"""
Pytest configuration and dynamic task module loaders.
Ensures modules named 'mcq_generator.py' across Tasks 3, 4, and 5 can be tested
independently without colliding in sys.modules.
"""

import sys
import importlib.util
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def load_task_module(task_num: int, filename: str = "mcq_generator.py"):
    """Dynamically load module from a specific Task directory."""
    module_path = ROOT_DIR / "Milestone 1" / f"Task {task_num}" / filename
    if not module_path.exists():
        raise FileNotFoundError(f"Module not found at {module_path}")
    
    module_name = f"task{task_num}_{filename.replace('.py', '')}"
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module
