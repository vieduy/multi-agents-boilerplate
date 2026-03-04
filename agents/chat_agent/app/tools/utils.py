"""
Utility functions for tool management.
Copied from room_agent/configs/agent/tools/utils.py
"""

import inspect


def load_tools_from_config(config: dict, tools_module) -> tuple[list, dict]:
    """
    Load tools from config.yml and validate they exist in the tools folder.

    Args:
        config (dict): Configuration dictionary loaded from YAML
        tools_module: The imported tools module to scan for available functions

    Returns:
        tuple[list, dict]: (list of tool functions, dict mapping name -> function)
    """
    available_tools = {}
    for name, obj in inspect.getmembers(tools_module):
        if inspect.isfunction(obj) and not name.startswith("_"):
            available_tools[name] = obj

    print(f"\n{'='*60}")
    print("TOOL VALIDATION REPORT")
    print(f"{'='*60}")
    print(f"Available tools in folder: {list(available_tools.keys())}")
    print(f"{'='*60}\n")

    requested_tools = config.get("tools", [])
    if not requested_tools:
        print("⚠️  Warning: No tools specified in config.yml")
        return [], {}

    tool_map = {}
    valid_tools = []
    missing_tools = []

    for tool_name in requested_tools:
        if tool_name in available_tools:
            tool_map[tool_name] = available_tools[tool_name]
            valid_tools.append(available_tools[tool_name])
            print(f"✅ Tool '{tool_name}' loaded successfully")
        else:
            missing_tools.append(tool_name)
            print(f"❌ Tool '{tool_name}' NOT FOUND in tools folder")

    print(f"\n{'='*60}")
    print(f"Summary: {len(valid_tools)}/{len(requested_tools)} tools loaded")
    if missing_tools:
        print(f"Missing tools: {missing_tools}")
    print(f"{'='*60}\n")

    return valid_tools, tool_map
