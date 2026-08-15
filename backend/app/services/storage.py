"""
Evidence file storage — Cloudinary.

Render's free-tier web service has no persistent disk: anything written to
the local filesystem is gone on the next restart/redeploy/spin-down. Every
evidence upload (police-console direct upload, forensic ZIP import) goes
through here instead, and `Evidence.storage_path` holds the returned
Cloudinary URL rather than a local path.
"""
import logging
import uuid

import cloudinary
import cloudinary.uploader
import httpx

from app.config import settings

log = logging.getLogger(__name__)

_configured = False


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
        _configured = True


def _resource_type(mime_type: str) -> str:
    if mime_type.startswith("image/"):
        return "image"
    if mime_type.startswith("video/"):
        return "video"
    # Cloudinary requires "raw" for anything else (text exports, PDFs,
    # zips) — "auto" only distinguishes between image/video/raw itself
    # unreliably for non-media types.
    return "raw"


async def upload_bytes(content: bytes, filename: str, mime_type: str, folder: str) -> dict:
    """Uploads to Cloudinary. Runs the (blocking) SDK call in a thread so it
    doesn't block the event loop."""
    import asyncio

    _ensure_configured()
    public_id = f"{folder}/{uuid.uuid4().hex}_{filename}"

    def _do_upload():
        return cloudinary.uploader.upload(
            content,
            public_id=public_id,
            resource_type=_resource_type(mime_type),
            folder=None,  # folder already baked into public_id
            overwrite=False,
            unique_filename=False,
            use_filename=False,
        )

    result = await asyncio.to_thread(_do_upload)
    return {"url": result["secure_url"], "public_id": result["public_id"]}


async def fetch_bytes(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content
