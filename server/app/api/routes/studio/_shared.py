"""Studio routes shared helpers — single responsibility: guards and lookups."""

from fastapi import HTTPException, status

from app.core.config import settings


def require_non_serverless() -> None:
    """Studio builds run processes and touch disk — unavailable on serverless."""
    if getattr(settings, "is_serverless", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Studio is not available in serverless mode.",
        )


def not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
