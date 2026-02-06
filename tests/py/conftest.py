"""
Pytest configuration for TTS server tests
"""
import sys
from pathlib import Path

# Add src/py to Python path for imports
project_root = Path(__file__).parent.parent.parent
src_py_path = project_root / "src" / "py"
sys.path.insert(0, str(src_py_path))
