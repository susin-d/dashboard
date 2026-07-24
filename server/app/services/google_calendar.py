import base64
import hashlib
from datetime import datetime, timezone
from urllib.parse import quote

import httpx
from cryptography.fernet import Fernet
from itsdangerous import URLSafeTimedSerializer

from app.core.config import settings


def require_google_oauth_config() -> None:
    if not all(
        (
            settings.google_oauth_client_id,
            settings.google_oauth_client_secret,
            settings.google_oauth_state_secret,
        ),
    ):
        raise RuntimeError("Google Calendar OAuth is not configured on the server.")


def google_state_serializer() -> URLSafeTimedSerializer:
    require_google_oauth_config()
    return URLSafeTimedSerializer(
        settings.google_oauth_state_secret,
        salt="starwaves-google-calendar-oauth",
    )


def google_token_cipher() -> Fernet:
    require_google_oauth_config()
    digest = hashlib.sha256(settings.google_oauth_state_secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_google_token(token: str) -> str:
    return google_token_cipher().encrypt(token.encode()).decode()


def decrypt_google_token(token: str) -> str:
    return google_token_cipher().decrypt(token.encode()).decode()


async def exchange_google_code(code: str) -> dict:
    require_google_oauth_config()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.google_oauth_callback_url,
            },
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("access_token"):
            raise ValueError("Google did not return an access token.")
        return payload


async def refresh_google_token(refresh_token: str) -> str:
    require_google_oauth_config()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("access_token"):
            raise ValueError("Google could not refresh Calendar access.")
        return payload["access_token"]


async def google_profile(access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


async def google_calendar_data(access_token: str) -> dict:
    headers = {"Authorization": f"Bearer {access_token}"}
    now = datetime.now(timezone.utc)
    time_min = datetime(now.year - 1, 1, 1, tzinfo=timezone.utc).isoformat()
    time_max = datetime(now.year + 2, 12, 31, 23, 59, 59, tzinfo=timezone.utc).isoformat()

    async with httpx.AsyncClient(
        base_url="https://www.googleapis.com/calendar/v3",
        headers=headers,
        timeout=30,
    ) as client:
        calendars = []
        page_token = None
        while True:
            response = await client.get(
                "/users/me/calendarList",
                params={
                    "minAccessRole": "reader",
                    "showHidden": "false",
                    **({"pageToken": page_token} if page_token else {}),
                },
            )
            response.raise_for_status()
            payload = response.json()
            calendars.extend(payload.get("items", []))
            page_token = payload.get("nextPageToken")
            if not page_token:
                break

        events = []
        for calendar in calendars:
            page_token = None
            while True:
                response = await client.get(
                    f"/calendars/{quote(calendar['id'], safe='')}/events",
                    params={
                        "timeMin": time_min,
                        "timeMax": time_max,
                        "singleEvents": "true",
                        "orderBy": "startTime",
                        "showDeleted": "false",
                        "maxResults": "2500",
                        **({"pageToken": page_token} if page_token else {}),
                    },
                )
                response.raise_for_status()
                payload = response.json()
                for event in payload.get("items", []):
                    if event.get("status") == "cancelled" or not event.get("start"):
                        continue
                    start = event["start"]
                    end = event.get("end", start)
                    events.append(
                        {
                            "id": f"{calendar['id']}:{event['id']}",
                            "googleEventId": event["id"],
                            "calendarId": calendar["id"],
                            "calendarName": calendar.get("summaryOverride")
                            or calendar.get("summary", "Calendar"),
                            "calendarColor": calendar.get("backgroundColor", "#4285f4"),
                            "title": event.get("summary", "(Untitled event)"),
                            "description": event.get("description", ""),
                            "location": event.get("location", ""),
                            "htmlLink": event.get("htmlLink", ""),
                            "start": start.get("dateTime") or start.get("date"),
                            "end": end.get("dateTime") or end.get("date"),
                            "allDay": "date" in start,
                        },
                    )
                page_token = payload.get("nextPageToken")
                if not page_token:
                    break

    return {
        "calendars": [
            {
                "id": calendar["id"],
                "name": calendar.get("summaryOverride")
                or calendar.get("summary", "Calendar"),
                "color": calendar.get("backgroundColor", "#4285f4"),
                "primary": bool(calendar.get("primary")),
            }
            for calendar in calendars
        ],
        "events": events,
    }
