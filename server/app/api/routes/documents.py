from fastapi import APIRouter, Depends, HTTPException, Response, status
from google.cloud.firestore_v1 import Client

from app.core.auth import get_current_user
from app.db import get_firestore
from app.repositories import documents
from app.schemas.document import DocumentResponse, DocumentUpsert

router = APIRouter(prefix="/documents")


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    return documents.list_documents(database, user["uid"])


@router.put("/{document_id}", response_model=DocumentResponse)
def save_document(
    document_id: str,
    document: DocumentUpsert,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if "/" in document_id or not document_id.strip():
        raise HTTPException(status_code=400, detail="Invalid document ID.")
    return documents.upsert_document(database, user["uid"], document_id, document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    database: Client = Depends(get_firestore),
    user: dict = Depends(get_current_user),
):
    if not documents.delete_document(database, user["uid"], document_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
