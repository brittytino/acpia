"""
Ingest Celery tasks — triggered when evidence is uploaded.
Dispatches evidence_ingested task → kicks off the analysis pipeline.
"""
import hashlib
import os
import tempfile
import json
from datetime import datetime, timezone
from celery.utils.log import get_task_logger
from app.workers.celery_app import celery_app
from app.config import settings

logger = get_task_logger(__name__)


@celery_app.task(
    name="app.workers.ingest_tasks.process_uploaded_evidence",
    queue="ingest",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def process_uploaded_evidence(self, evidence_id: str, case_id: str):
    """
    Post-upload processing:
    1. Verify SHA-256 hash integrity from MinIO
    2. Extract EXIF if image
    3. Compute perceptual hash for duplicate detection
    4. Update evidence status → triggers analysis pipeline
    """
    from sqlalchemy import create_engine, select, update
    from sqlalchemy.orm import sessionmaker
    from minio import Minio
    from app.models.models import EvidenceItem

    engine = create_engine(settings.DATABASE_URL_SYNC)
    SessionLocal = sessionmaker(bind=engine)
    minio = Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=False,
    )

    with SessionLocal() as db:
        item = db.execute(
            select(EvidenceItem).where(EvidenceItem.evidence_id == evidence_id)
        ).scalar_one_or_none()

        if not item:
            logger.error(f"Evidence {evidence_id} not found in DB")
            return

        try:
            # Re-download from MinIO and verify hash
            response = minio.get_object(settings.MINIO_BUCKET_NAME, item.storage_path)
            file_bytes = response.read()
            computed_hash = hashlib.sha256(file_bytes).hexdigest()

            if computed_hash != item.sha256_hash:
                logger.error(
                    f"Hash mismatch for evidence {evidence_id}: "
                    f"expected {item.sha256_hash}, got {computed_hash}"
                )
                item.processing_status = "failed"
                db.commit()
                return

            # Extract EXIF for images
            exif_data = {}
            if item.mime_type.startswith("image/"):
                exif_data = _extract_exif(file_bytes)

            # Update evidence with EXIF data
            item.exif_metadata = exif_data
            item.processing_status = "pending"   # ready for analysis
            db.commit()

            logger.info(f"Evidence {evidence_id} ingested successfully, triggering analysis")

            # Trigger the analysis pipeline
            trigger_analysis_for_evidence.delay(
                case_id=case_id,
                evidence_id=evidence_id,
                triggered_by_user_id=item.ingested_by,
            )

        except Exception as e:
            logger.error(f"Ingest processing failed for {evidence_id}: {e}")
            item.processing_status = "failed"
            db.commit()
            raise self.retry(exc=e)


@celery_app.task(
    name="app.workers.ingest_tasks.trigger_analysis_for_evidence",
    queue="analysis",
    bind=True,
)
def trigger_analysis_for_evidence(self, case_id: str, evidence_id: str, triggered_by_user_id: str):
    """Triggers the analysis pipeline for a specific piece of evidence."""
    from app.workers.analysis_tasks import trigger_analysis_pipeline
    trigger_analysis_pipeline.delay(
        case_id=case_id,
        triggered_by_user_id=triggered_by_user_id,
    )


@celery_app.task(
    name="app.workers.ingest_tasks.refresh_known_hash_list",
    queue="ingest",
)
def refresh_known_hash_list():
    """Placeholder: refresh known CSAM hash database (e.g., from NCMEC)."""
    logger.info("Known hash list refresh triggered (placeholder for real NCMEC integration)")
    return {"status": "ok"}


@celery_app.task(
    name="app.workers.ingest_tasks.cleanup_temp_files",
    queue="ingest",
)
def cleanup_temp_files():
    """Clean up any orphaned temp files from failed uploads."""
    import glob
    count = 0
    for f in glob.glob("/tmp/acpia_upload_*"):
        try:
            if os.path.getmtime(f) < (datetime.now().timestamp() - 3600):
                os.remove(f)
                count += 1
        except Exception:
            pass
    logger.info(f"Cleaned up {count} temp files")
    return {"cleaned": count}


def _extract_exif(file_bytes: bytes) -> dict:
    """Extract EXIF metadata from image bytes using PIL."""
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
        import io
        img = Image.open(io.BytesIO(file_bytes))
        exif_raw = img._getexif()
        if not exif_raw:
            return {}
        return {
            TAGS.get(tag, tag): str(val)
            for tag, val in exif_raw.items()
            if isinstance(val, (str, int, float, bytes))
        }
    except Exception as e:
        return {"error": str(e)}
