from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from bson import ObjectId
from datetime import datetime, timezone
from core.db import get_db
from core.permissions import IsHR
from .services.cloudinary_service import upload_file, delete_file
from .services.text_extraction import extract_text
from .services.chunking import chunk_text
from .services.structured_extraction import extract_structured_data
from search.services.embedding_service import embed_and_store_chunks


@api_view(["POST"])
@permission_classes([IsHR])
@parser_classes([MultiPartParser])
def upload_resume(request):
    file = request.FILES.get("file")
    candidate_name = request.data.get("candidate_name")

    if not file or not candidate_name:
        return Response(
            {"error": "File and candidate_name are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Determine file type
    filename = file.name.lower()
    if filename.endswith(".pdf"):
        file_type = "pdf"
    elif filename.endswith(".docx"):
        file_type = "docx"
    else:
        return Response(
            {"error": "Only PDF and DOCX files are supported"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Upload to Cloudinary
    cloud_result = upload_file(file)

    # Extract text
    file.seek(0)
    raw_text = extract_text(file, file_type)

    # Chunk text
    chunks = chunk_text(raw_text)

    db = get_db()

    # Extract structured data using Gemini
    structured_data = extract_structured_data(raw_text)

    # Save document
    doc = {
        "candidate_name": candidate_name,
        "file_url": cloud_result["url"],
        "file_type": file_type,
        "cloudinary_public_id": cloud_result["public_id"],
        "uploaded_by": request.user.username,
        "raw_text": raw_text,
        "structured_data": structured_data,
        "created_at": datetime.now(timezone.utc),
    }
    result = db.documents.insert_one(doc)
    doc_id = result.inserted_id

    # Save chunks with embeddings
    embed_and_store_chunks(doc_id, chunks, candidate_name)

    return Response(
        {
            "id": str(doc_id),
            "candidate_name": candidate_name,
            "file_url": cloud_result["url"],
            "file_type": file_type,
            "chunks_count": len(chunks),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_resumes(request):
    db = get_db()
    documents = list(
        db.documents.find({}, {"raw_text": 0}).sort("created_at", -1)
    )
    for doc in documents:
        doc["_id"] = str(doc["_id"])
    return Response(documents)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resume_detail(request, resume_id):
    db = get_db()

    try:
        doc = db.documents.find_one({"_id": ObjectId(resume_id)})
    except Exception:
        return Response({"error": "Invalid ID"}, status=status.HTTP_400_BAD_REQUEST)

    if not doc:
        return Response({"error": "Resume not found"}, status=status.HTTP_404_NOT_FOUND)

    doc["_id"] = str(doc["_id"])

    # Fetch chunks (exclude embedding vector)
    chunks = list(
        db.chunks.find(
            {"document_id": ObjectId(resume_id)}, {"embedding": 0}
        ).sort("chunk_index", 1)
    )
    for chunk in chunks:
        chunk["_id"] = str(chunk["_id"])
        chunk["document_id"] = str(chunk["document_id"])

    doc["chunks"] = chunks

    return Response(doc)


@api_view(["POST"])
@permission_classes([IsHR])
def reextract_all(request):
    """Re-extract structured data for all existing resumes."""
    db = get_db()
    documents = list(db.documents.find({}, {"_id": 1, "raw_text": 1}))
    count = 0

    for doc in documents:
        if not doc.get("raw_text"):
            continue
        structured_data = extract_structured_data(doc["raw_text"])
        db.documents.update_one(
            {"_id": doc["_id"]},
            {"$set": {"structured_data": structured_data}},
        )
        count += 1

    return Response({"message": f"Re-extracted structured data for {count} resumes"})


@api_view(["DELETE"])
@permission_classes([IsHR])
def delete_resume(request, resume_id):
    db = get_db()

    try:
        doc = db.documents.find_one({"_id": ObjectId(resume_id)})
    except Exception:
        return Response({"error": "Invalid ID"}, status=status.HTTP_400_BAD_REQUEST)

    if not doc:
        return Response({"error": "Resume not found"}, status=status.HTTP_404_NOT_FOUND)

    # Delete from Cloudinary
    if doc.get("cloudinary_public_id"):
        delete_file(doc["cloudinary_public_id"])

    # Delete chunks
    db.chunks.delete_many({"document_id": ObjectId(resume_id)})

    # Delete document
    db.documents.delete_one({"_id": ObjectId(resume_id)})

    return Response({"message": "Resume deleted"}, status=status.HTTP_200_OK)
