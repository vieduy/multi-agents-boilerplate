"""
Tools package for my_fastapi_agent (Room Finder Agent).
Auto-imports all tool functions from the tools folder.
"""

import importlib
import inspect
import os
from pathlib import Path

current_dir = Path(__file__).parent
__all__ = []

for file_path in current_dir.glob("*.py"):
    if file_path.name not in ["__init__.py", "utils.py"]:
        module_name = file_path.stem
        module = importlib.import_module(f".{module_name}", package=__package__)
        for name, obj in inspect.getmembers(module):
            if (
                inspect.isfunction(obj)
                and not name.startswith("_")
                and obj.__module__ == module.__name__
            ):
                globals()[name] = obj
                if name not in __all__:
                    __all__.append(name)
