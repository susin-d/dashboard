import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import documents
from app.schemas.document import DocumentResponse, DocumentUpsert

router = APIRouter(prefix="/documents")


@router.get("")
async def list_documents(
    cursor: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=50),
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if cursor is not None or limit is not None:
        eff_limit = limit or 20
        items, next_cursor, has_more = await asyncio.to_thread(documents.list_documents_page, database, user["uid"], cursor, eff_limit)
        return {"items": items, "next_cursor": next_cursor, "has_more": has_more}
    return await asyncio.to_thread(documents.list_documents, database, user["uid"])


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    document = await asyncio.to_thread(documents.get_document, database, user["uid"], document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document


@router.put("/{document_id}", response_model=DocumentResponse)
async def save_document(
    document_id: str,
    document: DocumentUpsert,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if "/" in document_id or not document_id.strip():
        raise HTTPException(status_code=400, detail="Invalid document ID.")
    return await asyncio.to_thread(documents.upsert_document, database, user["uid"], document_id, document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    ok = await asyncio.to_thread(documents.delete_document, database, user["uid"], document_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Document not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{document_id}/restore", response_model=DocumentResponse)
async def restore_document(
    document_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    ok = await asyncio.to_thread(documents.restore_document, database, user["uid"], document_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Document not found.")
    document = await asyncio.to_thread(documents.get_document, database, user["uid"], document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document
