import mimetypes
import os
from datetime import datetime, timezone

from google.cloud.firestore_v1 import Client

from app.core.config import settings


def _workspace_root(user_id: str) -> str:
    """Return the absolute disk path for a user's workspace storage."""
    base = os.path.abspath(settings.workspace_storage_path)
    return os.path.join(base, user_id)


def _safe_path(user_id: str, relative_path: str) -> str:
    """Resolve a relative path inside the user workspace, rejecting traversal."""
    root = _workspace_root(user_id)
    resolved = os.path.normpath(os.path.join(root, relative_path))
    if not resolved.startswith(root + os.sep) and resolved != root:
        raise ValueError("Path traversal is not allowed.")
    return resolved


def _metadata_collection(database: Client, user_id: str):
    return database.collection("users").document(user_id).collection("workspace-files")


def list_tree(user_id: str) -> list[dict]:
    """Walk the user's workspace directory and return a flat list of file nodes."""
    root = _workspace_root(user_id)
    if not os.path.isdir(root):
        return []
    nodes = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root)
        if rel_dir == ".":
            rel_dir = ""
        for dirname in dirnames:
            path = os.path.join(rel_dir, dirname).replace("\\", "/") if rel_dir else dirname
            nodes.append({"path": path, "name": dirname, "is_directory": True, "size": 0})
        for filename in filenames:
            path = os.path.join(rel_dir, filename).replace("\\", "/") if rel_dir else filename
            full_path = os.path.join(dirpath, filename)
            stat = os.stat(full_path)
            mime, _ = mimetypes.guess_type(filename)
            nodes.append({
                "path": path,
                "name": filename,
                "is_directory": False,
                "size": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                "mime_type": mime,
            })
    return nodes


def read_file(user_id: str, relative_path: str) -> tuple[str, int]:
    """Read file content as UTF-8 text. Returns (content, size)."""
    full_path = _safe_path(user_id, relative_path)
    if not os.path.isfile(full_path):
        raise FileNotFoundError(f"File not found: {relative_path}")
    with open(full_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    return content, os.path.getsize(full_path)


def write_file(user_id: str, relative_path: str, content: str, encoding: str = "utf-8") -> int:
    """Write content to a file. Creates parent directories as needed. Returns bytes written."""
    import base64
    full_path = _safe_path(user_id, relative_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    if encoding == "base64":
        data = base64.b64decode(content)
        with open(full_path, "wb") as f:
            f.write(data)
        return len(data)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    return len(content.encode("utf-8"))


def delete_file(user_id: str, relative_path: str) -> bool:
    """Delete a file from the workspace. Returns True if deleted."""
    full_path = _safe_path(user_id, relative_path)
    if not os.path.isfile(full_path):
        return False
    os.remove(full_path)
    # Clean up empty parent directories
    parent = os.path.dirname(full_path)
    root = _workspace_root(user_id)
    while parent != root and os.path.isdir(parent) and not os.listdir(parent):
        os.rmdir(parent)
        parent = os.path.dirname(parent)
    return True


def search_files(user_id: str, query: str, file_glob: str | None = None) -> list[dict]:
    """Search for text content across workspace files. Returns matching file paths and line numbers."""
    import fnmatch
    root = _workspace_root(user_id)
    if not os.path.isdir(root):
        return []
    matches = []
    query_lower = query.lower()
    TEXT_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json", ".md", ".txt", ".yaml", ".yml", ".toml", ".cfg", ".ini", ".sh", ".bat", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".hpp", ".rb", ".php", ".sql", ".xml", ".csv", ".env", ".gitignore", ".sdignore"}
    for dirpath, _, filenames in os.walk(root):
        for filename in filenames:
            _, ext = os.path.splitext(filename)
            if ext.lower() not in TEXT_EXTENSIONS:
                continue
            rel_path = os.path.relpath(os.path.join(dirpath, filename), root).replace("\\", "/")
            if file_glob and not fnmatch.fnmatch(rel_path, file_glob):
                continue
            full_path = os.path.join(dirpath, filename)
            try:
                with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                    for line_num, line in enumerate(f, 1):
                        if query_lower in line.lower():
                            matches.append({
                                "path": rel_path,
                                "line": line_num,
                                "content": line.strip()[:200],
                            })
                            if len(matches) >= 100:
                                return matches
            except OSError:
                continue
    return matches
