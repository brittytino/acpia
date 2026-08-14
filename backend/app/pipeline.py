import asyncio
from functools import partial
from app.core.events import bus
from app.agents.narrative import narrative_agent
from app.agents.link import link_agent, lead_from_edge
from app.database import get_db

async def get_unprocessed(case_id: str):
    return []

async def artifact_agent(artifact):
    return {"id": artifact.id, "status": "processed"}

async def get_conversations(case_id: str):
    return []

async def impact_summary(case_id: str):
    return {"artifacts_processed": 0, "surfaced_for_review": 0, "exposure_avoided_pct": 0, "leads": {}}

async def run_pipeline(case_id: str) -> None:
    await bus.emit(case_id, "pipeline.started", {})
    emit = partial(bus.emit, case_id)

    sem = asyncio.Semaphore(3)
    async def one(a):
        async with sem:
            await emit("artifact.processed", await artifact_agent(a))
            
    unprocessed_artifacts = await get_unprocessed(case_id)
    if unprocessed_artifacts:
        await asyncio.gather(*(one(a) for a in unprocessed_artifacts))

    # We need db session for narrative agent
    async for db in get_db():
        for convo in await get_conversations(case_id):
            await narrative_agent(convo, emit, "storage_path_stub", db)

        for edge in await link_agent(case_id):
            await emit("link.proposed", edge.as_dict())
            lead = await lead_from_edge(edge)
            db.add(lead)
            await emit("lead.created", {"kind": lead.kind, "summary": lead.summary})
        
        await db.commit()

    await emit("pipeline.complete", await impact_summary(case_id))
