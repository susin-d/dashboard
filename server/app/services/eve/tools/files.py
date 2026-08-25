"""Eve files tool definitions — single responsibility: files domain."""

_WORKSPACE_ID_PARAM = {
    "type": "string",
    "minLength": 1,
    "description": "Id of the code workspace to operate on. Use the workspace_id given in the user's message context, or 'default' when unknown.",
}

FILES_TOOLS = [
    {
        "type": "function",
        "name": "read_workspace_file",
        "description": "Read the content of a file in the user's code workspace by its relative path.",
        "parameters": {
            "type": "object",
            "properties": {"path": {"type": "string", "minLength": 1}, "workspace_id": _WORKSPACE_ID_PARAM},
            "required": ["path", "workspace_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "write_workspace_file",
        "description": "Create or overwrite a file in the user's code workspace. Provide the relative path and full content.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "minLength": 1},
                "content": {"type": "string"},
                "workspace_id": _WORKSPACE_ID_PARAM,
            },
            "required": ["path", "content", "workspace_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "list_workspace_files",
        "description": "List files and directories in the user's code workspace. Optionally specify a subdirectory.",
        "parameters": {
            "type": "object",
            "properties": {"directory": {"type": "string"}, "workspace_id": _WORKSPACE_ID_PARAM},
            "required": ["workspace_id"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "search_workspace_files",
        "description": "Search for text content across all files in the user's code workspace. Returns matching file paths and line numbers.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 1},
                "file_glob": {"type": "string"},
                "workspace_id": _WORKSPACE_ID_PARAM,
            },
            "required": ["query", "workspace_id"],
            "additionalProperties": False,
        },
        "strict": False,
    },
    {
        "type": "function",
        "name": "run_workspace_command",
        "description": "Run a shell command in the user's code workspace directory. Only available on the self-hosted server.",
        "parameters": {
            "type": "object",
            "properties": {"command": {"type": "string", "minLength": 1}, "workspace_id": _WORKSPACE_ID_PARAM},
            "required": ["command", "workspace_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]
