"""Workspace handlers — single responsibility: workspace records, search and generation."""

from google.cloud.firestore_v1 import Client

from app.services.eve.constants import SUPPORTED_RESOURCES
from app.services.eve.workspace_insights import _workspace_insight
from app.services.eve.workspace_records import (
    _bulk_update_records,
    _create_record,
    _explain_record,
    _generate_text_artifact,
    _list_records,
    _search_records,
    _update_record,
    delete_workspace_record,
    restore_workspace_record,
)


def handle_search_workspace(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    return _search_records(database, user_id, arguments["query"], arguments.get("resources")), None, None


def handle_workspace_insight(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    return _workspace_insight(database, user_id, arguments["kind"], arguments.get("date"), arguments.get("query")), None, None


def handle_explain_record(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    return _explain_record(database, user_id, arguments["resource"], arguments["record_id"]), None, None


def handle_generate_text_artifact(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    return _generate_text_artifact(
        database,
        user_id,
        arguments["kind"],
        arguments.get("resource"),
        arguments.get("record_id"),
        arguments.get("prompt"),
    ), None, None


def handle_bulk_update_records(database: Client, user_id: str, arguments: dict) -> tuple[dict, str | None, None]:
    resource = arguments["resource"]
    result = _bulk_update_records(database, user_id, resource, arguments["updates"])
    return result, resource if result["updated"] else None, None


def handle_delete_workspace_record(database: Client, user_id: str, arguments: dict) -> tuple[dict, str, None]:
    resource = arguments["resource"]
    msg, _ = delete_workspace_record(database, {"uid": user_id}, resource, arguments["record_id"])
    return {"message": msg}, resource, None


def handle_restore_workspace_record(database: Client, user_id: str, arguments: dict) -> tuple[dict, str, None]:
    resource = arguments["resource"]
    msg, _ = restore_workspace_record(database, {"uid": user_id}, resource, arguments["record_id"])
    return {"message": msg}, resource, None


def handle_list_workspace_records(database: Client, user_id: str, arguments: dict) -> tuple[dict, None, None]:
    resource = arguments.get("resource")
    if resource not in SUPPORTED_RESOURCES:
        raise ValueError("Unsupported workspace resource.")
    return {"records": _list_records(database, user_id, resource)}, None, None


def handle_create_workspace_record(database: Client, user_id: str, arguments: dict) -> tuple[dict, str, None]:
    resource = arguments.get("resource")
    if resource not in SUPPORTED_RESOURCES:
        raise ValueError("Unsupported workspace resource.")
    return {"record": _create_record(database, user_id, resource, arguments["data"])}, resource, None


def handle_update_workspace_record(database: Client, user_id: str, arguments: dict) -> tuple[dict, str, None]:
    resource = arguments.get("resource")
    if resource not in SUPPORTED_RESOURCES:
        raise ValueError("Unsupported workspace resource.")
    return {
        "record": _update_record(database, user_id, resource, arguments["record_id"], arguments["changes"])
    }, resource, None
