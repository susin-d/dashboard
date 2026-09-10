"""SQLAlchemy Declarative Models for Starwaves.

One module per domain (`user`, `workspace`, `calls`, `eve`, `settings`,
`workspace_files`, `whatsapp`, `sessions`, `usage` plus shared helpers in
`_shared`); this package entry point is a thin facade re-exporting the public
API so existing `from app.models import X` call sites keep working.
"""

from app.models._shared import generate_uuid, utc_now
from app.models.calls import Call
from app.models.eve import EveMemory, EveSchedule, EveSession
from app.models.sessions import UserSession
from app.models.settings import UserSetting
from app.models.usage import AiUsage
from app.models.user import User
from app.models.whatsapp import WhatsAppChat, WhatsAppMessage
from app.models.workspace import Contact, Document, Hackathon, Job, Notification, Project, Todo
from app.models.workspace_files import WorkspaceFile

__all__ = [
    "AiUsage",
    "Call",
    "Contact",
    "Document",
    "EveMemory",
    "EveSchedule",
    "EveSession",
    "Hackathon",
    "Job",
    "Notification",
    "Project",
    "Todo",
    "User",
    "UserSession",
    "UserSetting",
    "WhatsAppChat",
    "WhatsAppMessage",
    "WorkspaceFile",
    "generate_uuid",
    "utc_now",
]
