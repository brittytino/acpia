"""Hash-chained, append-only custody ledger (VERITAS §6.1).

Each entry embeds the previous entry's hash. Altering or deleting any row
breaks every hash that follows it — detectably, forever. Combined with the
database-level REVOKE on UPDATE/DELETE (app/database.py), this is an
architectural answer to "what if you take a bribe?", not a promise.
"""
import hashlib
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import CustodyLog

GENESIS = "0" * 64


def _payload(prev_hash, case_id, actor_id, action, target_type, target_id, detail, at) -> str:
    return json.dumps({
        "prev": prev_hash,
        "case": str(case_id),
        "actor": str(actor_id) if actor_id else None,
        "action": action,
        "target_type": target_type,
        "target_id": str(target_id) if target_id else None,
        "detail": detail or {},
        "at": at.isoformat(),
    }, sort_keys=True, separators=(",", ":"), default=str)


async def write_custody(
    db: AsyncSession,
    case_id,
    actor_id,
    action: str,
    target_type: str,
    target_id=None,
    detail: dict | None = None,
) -> str:
    """Append a tamper-evident entry, chained to the previous one for this case."""
    # Serialize concurrent writers for the same case within this transaction.
    # Without this, two requests touching the same case (e.g. two officers
    # uploading evidence at once) can both read the same "last hash" and
    # both insert with the same prev_hash, forking the chain — verify_chain
    # would then report a false tamper alarm on what was really just a race.
    # pg_advisory_xact_lock auto-releases at commit/rollback of this txn.
    await db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": str(case_id)})

    prev = (await db.execute(
        select(CustodyLog.entry_hash)
        .where(CustodyLog.case_id == case_id)
        .order_by(CustodyLog.id.desc())
        .limit(1)
    )).scalar_one_or_none()

    prev_hash = prev or GENESIS
    at = datetime.now(timezone.utc)
    payload = _payload(prev_hash, case_id, actor_id, action, target_type, target_id, detail, at)
    entry_hash = hashlib.sha256(payload.encode()).hexdigest()

    db.add(CustodyLog(
        case_id=case_id, actor_id=actor_id, action=action,
        target_type=target_type, target_id=target_id, detail=detail or {},
        at=at, prev_hash=prev_hash, entry_hash=entry_hash,
    ))
    return entry_hash


async def verify_chain(db: AsyncSession, case_id) -> dict:
    """Walk the chain from genesis. Any tampering — an altered field, a
    deleted row, a reordered entry — shows up here as a broken link."""
    rows = (await db.execute(
        select(CustodyLog).where(CustodyLog.case_id == case_id).order_by(CustodyLog.id)
    )).scalars().all()

    expected_prev = GENESIS
    for i, row in enumerate(rows):
        if row.prev_hash != expected_prev:
            return {
                "intact": False, "entries": len(rows), "broken_at": i,
                "reason": "previous-hash mismatch — an entry was altered, removed, or reordered",
            }

        payload = _payload(
            row.prev_hash, row.case_id, row.actor_id, row.action,
            row.target_type, row.target_id, row.detail, row.at,
        )
        if hashlib.sha256(payload.encode()).hexdigest() != row.entry_hash:
            return {
                "intact": False, "entries": len(rows), "broken_at": i,
                "reason": "entry content does not match its recorded hash",
            }
        expected_prev = row.entry_hash

    return {
        "intact": True,
        "entries": len(rows),
        "head": expected_prev,
        "first_at": rows[0].at.isoformat() if rows else None,
        "last_at": rows[-1].at.isoformat() if rows else None,
    }
