"""
Layer 1 — Evidence Ingest Service
Handles SHA-256 hashing, MIME detection, MinIO storage,
deduplication, known-hash-list checking, and chain-of-custody.
"""
import hashlib
import magic
import structlog
import os
import io
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import imagededup.methods as dedup_methods

from app.config import settings
from app.database import get_minio_client
from app.models.models import EvidenceItem, ChainOfCustodyLog, Case

logger = structlog.get_logger(__name__)


class IngestService:
    """
    Handles the complete evidence ingest pipeline:
    1. SHA-256 hash computation
    2. MIME type detection
    3. Known-hash-list check (hash-only, no content viewing)
    4. MinIO object storage
    5. Deduplication check
    6. Chain-of-custody log entry
    7. Database record creation
    """

    KNOWN_HASH_LIST: set[str] = set()

    @classmethod
    def load_known_hash_list(cls):
        """Load known bad-hash list from file (hash-only, no content)."""
        hash_file = Path(settings.HASH_LIST_PATH)
        if hash_file.exists():
            with open(hash_file, "r") as f:
                cls.KNOWN_HASH_LIST = {
                    line.strip().lower()
                    for line in f
                    if line.strip() and not line.startswith("#")
                }
            logger.info("Loaded known hash list", count=len(cls.KNOWN_HASH_LIST))
        else:
            logger.warning("Known hash list file not found", path=str(hash_file))

    @staticmethod
    def compute_sha256(file_bytes: bytes) -> str:
        """Compute SHA-256 hash of file bytes."""
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    def detect_mime_type(file_bytes: bytes, filename: str) -> str:
        """Detect MIME type using libmagic (not file extension)."""
        mime = magic.from_buffer(file_bytes, mime=True)
        return mime

    @classmethod
    def check_known_hash(cls, sha256_hash: str) -> bool:
        """Check if hash appears in known-bad hash list. Hash comparison only."""
        return sha256_hash.lower() in cls.KNOWN_HASH_LIST

    @staticmethod
    def generate_storage_path(case_id: str, evidence_id: str, mime_type: str) -> str:
        """Generate a deterministic, organized storage path."""
        # e.g. evidence/2024/01/case-uuid/evidence-uuid.bin
        now = datetime.now(timezone.utc)
        ext = _mime_to_ext(mime_type)
        return f"evidence/{now.year}/{now.month:02d}/{case_id}/{evidence_id}{ext}"

    async def ingest_evidence(
        self,
        db: AsyncSession,
        file_bytes: bytes,
        original_filename: str,
        case_id: str,
        ingested_by_user_id: str,
        actor_ip: Optional[str] = None,
    ) -> EvidenceItem:
        """
        Complete ingest pipeline for a single evidence file.
        Returns the created EvidenceItem with full chain-of-custody.
        """
        logger.info(
            "Starting evidence ingest",
            filename=original_filename,
            case_id=case_id,
            size_bytes=len(file_bytes),
        )

        # Step 1: Compute SHA-256 hash BEFORE any processing
        sha256_hash = self.compute_sha256(file_bytes)
        logger.info("Computed SHA-256", hash=sha256_hash[:16] + "...")

        # Step 2: Detect MIME type
        mime_type = self.detect_mime_type(file_bytes, original_filename)
        logger.info("Detected MIME type", mime_type=mime_type)

        # Step 3: Check for duplicate within this case
        existing = await db.execute(
            select(EvidenceItem).where(
                EvidenceItem.case_id == case_id,
                EvidenceItem.sha256_hash == sha256_hash,
            )
        )
        if existing.scalar_one_or_none():
            logger.warning("Duplicate evidence detected, skipping", hash=sha256_hash[:16])
            raise ValueError(f"Evidence with hash {sha256_hash[:16]}... already exists in this case")

        # Step 4: Check known-hash-list (hash-only, no content review)
        is_known_match = self.check_known_hash(sha256_hash)
        if is_known_match:
            logger.warning(
                "ALERT: Known hash match detected",
                hash=sha256_hash[:16],
                case_id=case_id,
            )

        # Step 5: Generate evidence ID and storage path
        evidence_id = str(uuid4())
        storage_path = self.generate_storage_path(case_id, evidence_id, mime_type)

        # Step 6: Upload to MinIO (immutable object storage)
        minio = get_minio_client()
        file_stream = io.BytesIO(file_bytes)
        minio.put_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=storage_path,
            data=file_stream,
            length=len(file_bytes),
            content_type=mime_type,
            metadata={
                "x-acpia-sha256": sha256_hash,
                "x-acpia-case-id": case_id,
                "x-acpia-evidence-id": evidence_id,
                "x-acpia-original-filename": original_filename,
            },
        )
        logger.info("Stored evidence in MinIO", path=storage_path)

        # Step 7: Create EvidenceItem record
        evidence = EvidenceItem(
            evidence_id=evidence_id,
            case_id=case_id,
            sha256_hash=sha256_hash,
            original_filename=original_filename,
            mime_type=mime_type,
            file_size_bytes=len(file_bytes),
            ingested_by=ingested_by_user_id,
            storage_path=storage_path,
            processing_status="pending",
            is_known_hash_match=is_known_match,
        )
        db.add(evidence)
        await db.flush()  # Get the ID without committing

        # Step 8: Create chain-of-custody log entry (append-only)
        custody_entry = ChainOfCustodyLog(
            evidence_id=evidence_id,
            actor_id=ingested_by_user_id,
            action="INGEST",
            prior_hash=None,  # First entry
            resulting_hash=sha256_hash,
            ip_address=actor_ip,
            notes=f"Initial ingest: {original_filename} ({len(file_bytes)} bytes, {mime_type})",
        )
        db.add(custody_entry)
        await db.commit()
        await db.refresh(evidence)

        logger.info(
            "Evidence ingest complete",
            evidence_id=evidence_id,
            hash=sha256_hash[:16],
            known_match=is_known_match,
        )
        return evidence

    async def verify_evidence_integrity(
        self,
        evidence: EvidenceItem,
        actor_id: str,
        db: AsyncSession,
    ) -> Tuple[bool, str]:
        """
        Verify evidence hasn't been tampered with by re-hashing from MinIO.
        Returns (is_valid, message).
        """
        minio = get_minio_client()
        response = minio.get_object(settings.MINIO_BUCKET, evidence.storage_path)
        current_bytes = response.read()
        current_hash = self.compute_sha256(current_bytes)

        is_valid = current_hash == evidence.sha256_hash

        # Log the verification (append-only)
        custody_entry = ChainOfCustodyLog(
            evidence_id=evidence.evidence_id,
            actor_id=actor_id,
            action="INTEGRITY_VERIFY",
            prior_hash=evidence.sha256_hash,
            resulting_hash=current_hash,
            notes=f"Integrity verification: {'PASS' if is_valid else 'FAIL'}",
        )
        db.add(custody_entry)
        await db.commit()

        if not is_valid:
            logger.error(
                "CRITICAL: Evidence integrity check FAILED",
                evidence_id=evidence.evidence_id,
                stored_hash=evidence.sha256_hash[:16],
                computed_hash=current_hash[:16],
            )
        else:
            logger.info("Evidence integrity verified", evidence_id=evidence.evidence_id)

        return is_valid, "PASS" if is_valid else f"FAIL: hash mismatch (stored: {evidence.sha256_hash[:8]}..., computed: {current_hash[:8]}...)"

    async def retrieve_evidence_bytes(
        self,
        evidence: EvidenceItem,
        actor_id: str,
        db: AsyncSession,
        purpose: str = "ANALYSIS",
    ) -> bytes:
        """Retrieve evidence bytes from MinIO, logging chain-of-custody access."""
        minio = get_minio_client()
        response = minio.get_object(settings.MINIO_BUCKET, evidence.storage_path)
        file_bytes = response.read()

        # Log the access
        custody_entry = ChainOfCustodyLog(
            evidence_id=evidence.evidence_id,
            actor_id=actor_id,
            action=f"ACCESS_{purpose}",
            prior_hash=evidence.sha256_hash,
            resulting_hash=evidence.sha256_hash,  # unchanged
            notes=f"Evidence accessed for: {purpose}",
        )
        db.add(custody_entry)
        await db.commit()

        return file_bytes


def _mime_to_ext(mime_type: str) -> str:
    """Map MIME type to file extension for storage naming."""
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/bmp": ".bmp",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/avi": ".avi",
        "video/quicktime": ".mov",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/ogg": ".ogg",
        "application/pdf": ".pdf",
        "text/plain": ".txt",
        "text/html": ".html",
        "application/json": ".json",
        "application/zip": ".zip",
        "application/x-tar": ".tar",
    }
    return mapping.get(mime_type, ".bin")


# Singleton
ingest_service = IngestService()
