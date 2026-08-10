"""
Analysis tasks — triggers and coordinates the LangGraph agent pipeline.
These are Celery tasks that run in the agent worker container.
"""
import json
import asyncio
from datetime import datetime, timezone
from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
import redis as redis_sync

from app.config import settings
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    name="app.workers.analysis_tasks.trigger_analysis_pipeline",
    max_retries=2,
    default_retry_delay=30,
    queue="analysis",
)
def trigger_analysis_pipeline(self, case_id: str, triggered_by_user_id: str):
    """
    Orchestrate the full LangGraph agent pipeline for a case.
    This Celery task imports and runs the LangGraph orchestrator.
    Progress is streamed to the case's WebSocket channel via Redis pub/sub.
    """
    logger.info(f"Analysis pipeline starting for case {case_id}")

    # Sync DB engine for Celery worker
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.models import AnalysisRun, EvidenceItem, Case

    engine = create_engine(settings.DATABASE_URL_SYNC)
    SessionLocal = sessionmaker(bind=engine)

    r = redis_sync.Redis.from_url(settings.REDIS_URL)

    def publish(update: dict):
        r.publish(f"acpia:pipeline:{case_id}", json.dumps(update))

    with SessionLocal() as db:
        # Create analysis run record
        run = AnalysisRun(
            case_id=case_id,
            triggered_by=triggered_by_user_id,
            status="running",
            celery_task_id=self.request.id,
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        run_id = run.run_id

        # Get pending evidence
        evidence_items = db.execute(
            select(EvidenceItem).where(
                EvidenceItem.case_id == case_id,
                EvidenceItem.processing_status.in_(["pending", "failed"]),
            )
        ).scalars().all()

        run.evidence_count = len(evidence_items)
        db.commit()

        publish({
            "type": "pipeline_started",
            "run_id": run_id,
            "case_id": case_id,
            "evidence_count": len(evidence_items),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    try:
        # Import and run LangGraph orchestrator
        import sys
        sys.path.insert(0, "/agents")
        from orchestrator import run_pipeline

        result = asyncio.run(
            run_pipeline(
                case_id=case_id,
                run_id=run_id,
                user_id=triggered_by_user_id,
                progress_callback=publish,
            )
        )

        # Mark complete
        with SessionLocal() as db:
            run = db.execute(select(AnalysisRun).where(AnalysisRun.run_id == run_id)).scalar_one()
            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
            run.leads_generated = result.get("leads_generated", 0)
            run.agent_results = result.get("agent_summary", {})
            db.commit()

        publish({
            "type": "pipeline_completed",
            "run_id": run_id,
            "case_id": case_id,
            "leads_generated": result.get("leads_generated", 0),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        logger.info(f"Analysis pipeline completed for case {case_id}, leads: {result.get('leads_generated', 0)}")
        return result

    except Exception as e:
        logger.error(f"Analysis pipeline failed for case {case_id}: {e}")

        with SessionLocal() as db:
            run = db.execute(select(AnalysisRun).where(AnalysisRun.run_id == run_id)).scalar_one()
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.error_message = str(e)
            db.commit()

        publish({
            "type": "pipeline_failed",
            "run_id": run_id,
            "case_id": case_id,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        raise self.retry(exc=e)
