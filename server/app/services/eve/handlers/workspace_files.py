"""Workspace file handlers — single responsibility: code workspace file operations."""

from google.cloud.firestore_v1 import Client


def handle_read_workspace_file(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    from app.repositories import workspace_files as ws_repo

    ws_id = arguments.get("workspace_id", "default")
    try:
        content, size = ws_repo.read_file(user_id, arguments["path"], workspace_id=ws_id)
    except FileNotFoundError:
        raise ValueError(f"File not found: {arguments['path']}")
    return {"path": arguments["path"], "content": content, "size": size}, None, None


def handle_write_workspace_file(database: Client, user_id: str, arguments: dict) -> tuple[dict, str, None]:
    from app.repositories import workspace_files as ws_repo

    ws_id = arguments.get("workspace_id", "default")
    size = ws_repo.write_file(user_id, arguments["path"], arguments["content"], workspace_id=ws_id)
    return {"path": arguments["path"], "size": size, "written": True}, "workspace-files", None


def handle_list_workspace_files(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    from app.repositories import workspace_files as ws_repo

    ws_id = arguments.get("workspace_id", "default")
    files = ws_repo.list_tree(user_id, workspace_id=ws_id)
    directory = arguments.get("directory")
    if directory:
        prefix = directory.rstrip("/") + "/"
        files = [f for f in files if f["path"].startswith(prefix) or f["path"] == directory.rstrip("/")]
    return {"files": files, "total": len(files)}, None, None


def handle_search_workspace_files(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    from app.repositories import workspace_files as ws_repo

    ws_id = arguments.get("workspace_id", "default")
    matches = ws_repo.search_files(user_id, arguments["query"], arguments.get("file_glob"), workspace_id=ws_id)
    return {"matches": matches, "total": len(matches)}, None, None


def handle_run_workspace_command(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    from app.core.config import settings

    if getattr(settings, "is_serverless", False):
        raise ValueError("Command execution is not available in serverless mode.")
    import subprocess

    from app.repositories.workspace_files import _workspace_root

    ws_id = arguments.get("workspace_id", "default")
    cwd = _workspace_root(user_id, workspace_id=ws_id)
    try:
        result = subprocess.run(
            arguments["command"],
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=cwd,
        )
        return {
            "stdout": result.stdout[:5000],
            "stderr": result.stderr[:2000],
            "exit_code": result.returncode,
        }, None, None
    except subprocess.TimeoutExpired:
        raise ValueError("Command timed out after 30 seconds.")
