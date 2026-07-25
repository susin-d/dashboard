import logging
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "email"


def render_template(template_name: str, context: dict) -> str:
    template_path = TEMPLATES_DIR / template_name
    if not template_path.exists():
        raise FileNotFoundError(f"Email template not found: {template_path}")

    content = template_path.read_text(encoding="utf-8")
    for key, value in context.items():
        content = content.replace(f"{{{{ {key} }}}}", str(value))
        content = content.replace(f"{{{{{key}}}}}", str(value))
    return content


def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: str | None = None,
) -> bool:
    if not settings.smtp_host:
        logger.warning("SMTP host is not configured. Skipping email delivery to %s", to_email)
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    if body_text:
        msg.set_content(body_text)
    msg.add_alternative(body_html, subtype="html")

    try:
        if settings.smtp_use_tls:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.starttls()
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
        logger.info("Successfully sent SMTP email to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Failed to send SMTP email to %s: %s", to_email, exc)
        return False


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    reset_url = f"{settings.frontend_url}/#reset-token={reset_token}"
    subject = "Password Reset Request - StarWaves"
    body_html = render_template(
        "password_reset.html",
        {"reset_url": reset_url},
    )
    body_text = f"Reset your StarWaves password using this link: {reset_url}"
    return send_email(to_email, subject, body_html, body_text)


def send_welcome_email(to_email: str, user_name: str) -> bool:
    subject = "Welcome to StarWaves"
    body_html = render_template(
        "welcome.html",
        {"user_name": user_name, "app_url": settings.frontend_url},
    )
    body_text = f"Welcome to StarWaves, {user_name}! Visit {settings.frontend_url} to get started."
    return send_email(to_email, subject, body_html, body_text)


async def async_send_email(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: str | None = None,
) -> bool:
    import asyncio

    return await asyncio.to_thread(send_email, to_email, subject, body_html, body_text)
