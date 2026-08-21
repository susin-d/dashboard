"""Studio preview service — single responsibility: signed preview URLs + static serving."""

import mimetypes
import os

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings
from app.repositories.workspace_files import _safe_path, _workspace_root
from app.services.studio.constants import (
    PREVIEW_BUILD_DIRS,
    PREVIEW_ENTRY_FILE,
    PREVIEW_TOKEN_MAX_AGE_SECONDS,
    PREVIEW_TOKEN_SALT,
    studio_preview_domain,
)


class PreviewTokenError(ValueError):
    """Raised when a preview token is invalid or expired."""


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.auth_secret_key, salt=PREVIEW_TOKEN_SALT)


def create_preview_token(user_id: str, workspace_id: str) -> str:
    """Sign a short payload token granting read-only preview access."""
    return _serializer().dumps({"u": user_id, "w": workspace_id})


def resolve_preview_token(token: str) -> tuple[str, str]:
    """Verify a preview token and return (user_id, workspace_id)."""
    try:
        payload = _serializer().loads(token, max_age=PREVIEW_TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired as error:
        raise PreviewTokenError("Preview link expired. Start the preview again.") from error
    except BadSignature as error:
        raise PreviewTokenError("Invalid preview link.") from error
    return payload["u"], payload["w"]


def build_preview_url(user_id: str, workspace_id: str) -> dict:
    """Build the iframe-ready preview URL for a studio project.

    Prefers ``{token}.{preview_domain}`` when configured (wildcard DNS + TLS),
    otherwise falls back to the API path URL which works everywhere.
    """
    token = create_preview_token(user_id, workspace_id)
    domain = studio_preview_domain()
    if domain:
        url = f"https://{token}.{domain.rstrip('/')}/{PREVIEW_ENTRY_FILE}"
    else:
        url = f"{settings.api_v1_prefix}/studio/preview/{token}/{PREVIEW_ENTRY_FILE}"
    return {"preview_url": url, "token": token}


def has_build_output(user_id: str, workspace_id: str) -> bool:
    """True when a build output directory with an entry file exists."""
    root = _workspace_root(user_id, workspace_id)
    for build_dir in PREVIEW_BUILD_DIRS:
        candidate = os.path.join(root, build_dir, PREVIEW_ENTRY_FILE)
        if os.path.isfile(candidate):
            return True
    return os.path.isfile(os.path.join(root, PREVIEW_ENTRY_FILE))


def _resolve_preview_file(user_id: str, workspace_id: str, file_path: str) -> bytes:
    """Resolve a preview request path to file bytes, preferring build output dirs.

    Resolution order for ``index.html``-style requests:
      1. dist/build/out/public/<path>
      2. <path> at the workspace root
    Asset requests (non-entry paths) hit build dirs first, then root.
    """
    clean_path = (file_path or "").lstrip("/")
    if not clean_path:
        clean_path = PREVIEW_ENTRY_FILE

    candidates: list[str] = []
    is_entry = clean_path == PREVIEW_ENTRY_FILE
    for build_dir in PREVIEW_BUILD_DIRS:
        candidates.append(os.path.join(build_dir, clean_path))
    candidates.append(clean_path)

    last_error: FileNotFoundError | None = None
    for candidate in candidates:
        try:
            full_path = _safe_path(user_id, candidate, workspace_id)
            if os.path.isfile(full_path):
                with open(full_path, "rb") as handle:
                    return handle.read()
        except ValueError as error:  # path traversal attempt
            last_error = FileNotFoundError(str(error))
        except FileNotFoundError as error:
            last_error = error

    # Entry fallback: any build dir index even when the exact path missed.
    if is_entry:
        for build_dir in PREVIEW_BUILD_DIRS:
            try:
                full_path = _safe_path(
                    user_id, os.path.join(build_dir, PREVIEW_ENTRY_FILE), workspace_id
                )
                if os.path.isfile(full_path):
                    with open(full_path, "rb") as handle:
                        return handle.read()
            except (ValueError, FileNotFoundError) as error:
                last_error = error

    raise last_error or FileNotFoundError(f"Preview file not found: {file_path}")


def read_preview_file(user_id: str, workspace_id: str, file_path: str) -> tuple[bytes, str]:
    """Return (bytes, media_type) for a preview path."""
    data = _resolve_preview_file(user_id, workspace_id, file_path)
    media_type, _ = mimetypes.guess_type(file_path or PREVIEW_ENTRY_FILE)
    return data, media_type or "application/octet-stream"
