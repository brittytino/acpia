"""
Celery application configuration with Redis broker.
"""
from celery import Celery
from app.config import settings

celery_app = Celery(
    "acpia",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.ingest_tasks",
        "app.workers.analysis_tasks",
    ],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task settings
    task_track_started=True,
    task_send_sent_event=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # Important for long-running AI tasks

    # Result expiry (24 hours)
    result_expires=86400,

    # Queue routing
    task_routes={
        "app.workers.ingest_tasks.*": {"queue": "ingest"},
        "app.workers.analysis_tasks.*": {"queue": "analysis"},
    },

    # Beat schedule for recurring tasks
    beat_schedule={
        "refresh-hash-list-daily": {
            "task": "app.workers.ingest_tasks.refresh_known_hash_list",
            "schedule": 86400,  # Every 24 hours
        },
        "cleanup-temp-files": {
            "task": "app.workers.ingest_tasks.cleanup_temp_files",
            "schedule": 3600,  # Every hour
        },
    },
)
