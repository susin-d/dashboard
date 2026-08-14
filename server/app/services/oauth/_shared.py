"""Provider-agnostic OAuth helpers shared by Google and GitHub integrations."""

import hashlib

import httpx
from fastapi.responses import HTMLResponse
from google.cloud.firestore_v1 import Client
from itsdangerous import URLSafeTimedSerializer


def create_oauth_state_serializer(secret: str, salt: str) -> URLSafeTimedSerializer:
    """Build a timed serializer for OAuth ``state`` tokens using the given salt."""
    return URLSafeTimedSerializer(secret, salt=salt)


def format_oauth_error(error: Exception, provider: str = "Google") -> str:
    if isinstance(error, httpx.HTTPStatusError):
        try:
            data = error.response.json()
            desc = data.get("error_description") or data.get("error") or str(error)
            return f"{provider} HTTP {error.response.status_code}: {desc}"
        except Exception:
            return f"{provider} HTTP {error.response.status_code}: {error.response.text[:100]}"
    elif isinstance(error, httpx.HTTPError):
        return f"Network error connecting to {provider}: {error}"
    return str(error) or error.__class__.__name__


def integration_account_id(identifier: str) -> str:
    """Stable Firestore document id for a connected integration account."""
    return hashlib.sha256(identifier.lower().strip().encode()).hexdigest()


def integration_accounts_reference(database: Client, user_id: str, integration_name: str):
    return (
        database.collection("users")
        .document(user_id)
        .collection("integrations")
        .document(integration_name)
        .collection("accounts")
    )


def oauth_callback_html(frontend_url: str, feature: str, error_reason: str | None = None) -> HTMLResponse:
    """HTML close-and-redirect snippet used by OAuth callback routes."""
    if error_reason:
        return HTMLResponse(
            f"""<!DOCTYPE html><html><body><script>
            if (window.opener) {{ window.close(); }}
            else {{ window.location.href = "{frontend_url}/app/setting?{feature}=error&reason={error_reason}"; }}
            </script></body></html>"""
        )
    return HTMLResponse(
        f"""<!DOCTYPE html><html><body><script>
        if (window.opener) {{ window.close(); }}
        else {{ window.location.href = "{frontend_url}/app/setting?{feature}=connected"; }}
        </script></body></html>"""
    )
