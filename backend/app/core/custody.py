from app.models.evidence import CustodyLog

async def write_custody(db, case_id: str, actor_id: str | None, action: str,
                        target_type: str, target_id: str | None = None, detail: dict | None = None):
    db.add(CustodyLog(
        case_id=case_id, 
        actor_id=actor_id, 
        action=action,
        target_type=target_type, 
        target_id=target_id,
        detail=detail or {}
    ))
