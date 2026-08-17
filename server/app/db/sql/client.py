"""SQL client adapter dispatching Firestore operations to modular SQL handlers."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.sql._shared import clean_data
from app.db.sql.calls import delete_call_doc, get_call_doc, query_calls, set_call_doc
from app.db.sql.contacts import (
    delete_contact_doc,
    get_contact_doc,
    query_contacts,
    set_contact_doc,
)
from app.db.sql.documents import (
    delete_document_doc,
    get_document_doc,
    query_documents,
    set_document_doc,
)
from app.db.sql.eve import (
    delete_eve_memory_doc,
    delete_eve_session_doc,
    get_eve_memory_doc,
    get_eve_session_doc,
    query_eve_memories,
    query_eve_sessions,
    set_eve_memory_doc,
    set_eve_session_doc,
)
from app.db.sql.fallback import (
    delete_in_memory_doc,
    get_in_memory_doc,
    query_in_memory,
    set_in_memory_doc,
)
from app.db.sql.hackathons import (
    delete_hackathon_doc,
    get_hackathon_doc,
    query_hackathons,
    set_hackathon_doc,
)
from app.db.sql.jobs import delete_job_doc, get_job_doc, query_jobs, set_job_doc
from app.db.sql.notifications import (
    delete_notification_doc,
    get_notification_doc,
    query_notifications,
    set_notification_doc,
)
from app.db.sql.projects import (
    delete_project_doc,
    get_project_doc,
    query_projects,
    set_project_doc,
)
from app.db.sql.query import SqlBatch, SqlCollectionRef, SqlQuery, SqlSnapshot
from app.db.sql.settings import (
    delete_setting_doc,
    get_setting_doc,
    set_setting_doc,
)
from app.db.sql.todos import delete_todo_doc, get_todo_doc, query_todos, set_todo_doc
from app.db.sql.users import delete_user_doc, get_user_doc, query_users, set_user_doc
from app.db.sql.whatsapp import (
    delete_whatsapp_chat_doc,
    delete_whatsapp_message_doc,
    get_whatsapp_chat_doc,
    get_whatsapp_message_doc,
    query_whatsapp_chats,
    query_whatsapp_messages,
    set_whatsapp_chat_doc,
    set_whatsapp_message_doc,
)


class SqlClient:
    """PostgreSQL/SQLAlchemy-backed Firestore Client adapter."""

    def __init__(self):
        from app.db.session import sync_engine
        self._sync_engine = sync_engine
        self._in_memory_docs: dict[str, dict[str, Any]] = {}

    def collection(self, name: str) -> SqlCollectionRef:
        """Create a collection reference for a top-level collection."""
        return SqlCollectionRef(self, [name])

    def collection_group(self, name: str) -> SqlCollectionRef:
        """Create a collection group reference."""
        return SqlCollectionRef(self, ["__group__", name])

    def batch(self) -> SqlBatch:
        """Create a batched write instance."""
        return SqlBatch(self)

    def _get_doc(self, path_parts: list[str], doc_id: str) -> SqlSnapshot:
        """Route document retrieval to the matching entity handler."""
        with Session(self._sync_engine) as session:
            # users/
            if len(path_parts) == 1 and path_parts[0] == "users":
                return get_user_doc(session, doc_id)

            # calls/
            if len(path_parts) == 1 and path_parts[0] == "calls":
                return get_call_doc(session, doc_id)

            # users/{user_id}/todos
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "todos":
                return get_todo_doc(session, path_parts[1], doc_id)

            # users/{user_id}/jobs
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "jobs":
                return get_job_doc(session, path_parts[1], doc_id)

            # users/{user_id}/projects
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "projects":
                return get_project_doc(session, path_parts[1], doc_id)

            # users/{user_id}/hackathons
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "hackathons":
                return get_hackathon_doc(session, path_parts[1], doc_id)

            # users/{user_id}/documents
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "documents":
                return get_document_doc(session, path_parts[1], doc_id)

            # users/{user_id}/contacts
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "contacts":
                return get_contact_doc(session, path_parts[1], doc_id)

            # users/{user_id}/notifications
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "notifications":
                return get_notification_doc(session, path_parts[1], doc_id)

            # users/{user_id}/eve_sessions
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_sessions":
                return get_eve_session_doc(session, path_parts[1], doc_id)

            # users/{user_id}/eve_memories
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_memories":
                return get_eve_memory_doc(session, path_parts[1], doc_id)

            # users/{user_id}/settings/{category} or users/{user_id}/integrations/{integration}
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] in ("settings", "integrations"):
                return get_setting_doc(session, path_parts[1], path_parts[2], doc_id)

            # users/{user_id}/whatsapp_chats/{chat_id}
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "whatsapp_chats":
                return get_whatsapp_chat_doc(session, path_parts[1], doc_id)

            # users/{user_id}/whatsapp_chats/{chat_id}/messages/{message_id}
            if len(path_parts) == 5 and path_parts[0] == "users" and path_parts[2] == "whatsapp_chats" and path_parts[4] == "messages":
                return get_whatsapp_message_doc(session, path_parts[1], path_parts[3], doc_id)

        return get_in_memory_doc(self._in_memory_docs, path_parts, doc_id)

    def _set_doc(
        self,
        path_parts: list[str],
        doc_id: str,
        data: dict[str, Any],
        merge: bool = False,
    ) -> None:
        """Route document set/update to the matching entity handler."""
        data = clean_data(data)
        with Session(self._sync_engine) as session:
            # users/
            if len(path_parts) == 1 and path_parts[0] == "users":
                set_user_doc(session, doc_id, data, merge=merge)
                return

            # calls/
            if len(path_parts) == 1 and path_parts[0] == "calls":
                set_call_doc(session, doc_id, data, merge=merge)
                return

            # users/{user_id}/todos
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "todos":
                set_todo_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/jobs
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "jobs":
                set_job_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/projects
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "projects":
                set_project_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/hackathons
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "hackathons":
                set_hackathon_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/documents
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "documents":
                set_document_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/contacts
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "contacts":
                set_contact_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/notifications
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "notifications":
                set_notification_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/eve_sessions
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_sessions":
                set_eve_session_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/eve_memories
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_memories":
                set_eve_memory_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/settings/{category} or users/{user_id}/integrations/{integration}
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] in ("settings", "integrations"):
                set_setting_doc(session, path_parts[1], path_parts[2], doc_id, data, merge=merge)
                return

            # users/{user_id}/whatsapp_chats/{chat_id}
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "whatsapp_chats":
                set_whatsapp_chat_doc(session, path_parts[1], doc_id, data, merge=merge)
                return

            # users/{user_id}/whatsapp_chats/{chat_id}/messages/{message_id}
            if len(path_parts) == 5 and path_parts[0] == "users" and path_parts[2] == "whatsapp_chats" and path_parts[4] == "messages":
                set_whatsapp_message_doc(session, path_parts[1], path_parts[3], doc_id, data, merge=merge)
                return

        # Generic doc store fallback
        set_in_memory_doc(self._in_memory_docs, path_parts, doc_id, data, merge=merge)

    def _update_doc(self, path_parts: list[str], doc_id: str, updates: dict[str, Any]) -> None:
        """Update document fields with merge=True."""
        self._set_doc(path_parts, doc_id, updates, merge=True)

    def _delete_doc(self, path_parts: list[str], doc_id: str) -> None:
        """Route document deletion to the matching entity handler."""
        delete_in_memory_doc(self._in_memory_docs, path_parts, doc_id)

        with Session(self._sync_engine) as session:
            if len(path_parts) == 1 and path_parts[0] == "users":
                delete_user_doc(session, doc_id)
            elif len(path_parts) == 1 and path_parts[0] == "calls":
                delete_call_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "todos":
                delete_todo_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "jobs":
                delete_job_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "projects":
                delete_project_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "hackathons":
                delete_hackathon_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "documents":
                delete_document_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "contacts":
                delete_contact_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "notifications":
                delete_notification_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_sessions":
                delete_eve_session_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_memories":
                delete_eve_memory_doc(session, doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] in ("settings", "integrations"):
                delete_setting_doc(session, path_parts[1], path_parts[2], doc_id)
            elif len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "whatsapp_chats":
                delete_whatsapp_chat_doc(session, doc_id)
            elif len(path_parts) == 5 and path_parts[0] == "users" and path_parts[2] == "whatsapp_chats" and path_parts[4] == "messages":
                delete_whatsapp_message_doc(session, doc_id)

    def _query_coll(self, path_parts: list[str], query: SqlQuery) -> list[SqlSnapshot]:
        """Route collection queries to the matching entity handler."""
        with Session(self._sync_engine) as session:
            # users
            if len(path_parts) == 1 and path_parts[0] == "users":
                return query_users(session, query)

            # calls
            if len(path_parts) == 1 and path_parts[0] == "calls":
                return query_calls(session, query)

            # users/{user_id}/todos
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "todos":
                return query_todos(session, path_parts[1], query)

            # users/{user_id}/jobs
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "jobs":
                return query_jobs(session, path_parts[1], query)

            # users/{user_id}/projects
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "projects":
                return query_projects(session, path_parts[1], query)

            # users/{user_id}/hackathons
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "hackathons":
                return query_hackathons(session, path_parts[1], query)

            # users/{user_id}/documents
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "documents":
                return query_documents(session, path_parts[1], query)

            # users/{user_id}/contacts
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "contacts":
                return query_contacts(session, path_parts[1], query)

            # users/{user_id}/notifications
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "notifications":
                return query_notifications(session, path_parts[1], query)

            # users/{user_id}/eve_sessions
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_sessions":
                return query_eve_sessions(session, path_parts[1], query)

            # users/{user_id}/eve_memories
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "eve_memories":
                return query_eve_memories(session, path_parts[1], query)

            # users/{user_id}/whatsapp_chats
            if len(path_parts) == 3 and path_parts[0] == "users" and path_parts[2] == "whatsapp_chats":
                return query_whatsapp_chats(session, path_parts[1], query)

            # users/{user_id}/whatsapp_chats/{chat_id}/messages
            if len(path_parts) == 5 and path_parts[0] == "users" and path_parts[2] == "whatsapp_chats" and path_parts[4] == "messages":
                return query_whatsapp_messages(session, path_parts[1], path_parts[3], query)

        # Generic in-memory fallback for other collections
        return query_in_memory(self._in_memory_docs, path_parts, query)


_sql_client_instance: SqlClient | None = None


def get_db_client() -> SqlClient:
    """Get or create singleton SqlClient instance."""
    global _sql_client_instance
    if _sql_client_instance is None:
        _sql_client_instance = SqlClient()
    return _sql_client_instance


def get_firestore() -> SqlClient:
    """Alias for get_db_client for backward compatibility across existing routes."""
    return get_db_client()
