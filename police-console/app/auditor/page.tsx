"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:47802` : "http://localhost:47802");

export default function AuditorPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [caseId, setCaseId] = useState<string>("");
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("acpia_token");
    fetch(`${API}/api/v1/cases`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setCases);
  }, []);

  const runAudit = async (id: string) => {
    setCaseId(id);
    setLoading(true);
    setError(null);
    setAudit(null);
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/cases/${id}/audit`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(res.status === 403
          ? "This view requires the auditor, supervisor, or admin role."
          : body.detail || "Could not verify this case.");
      }
      setAudit(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="VERITAS CONSOLE — Auditor">
      <div style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", color: "var(--ink)", marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>Ledger Verification</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>
            Read-only. Verifies the custody chain and the confirm/reject ratio without ever exposing evidence content.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          {cases.map(c => (
            <button key={c.id} onClick={() => runAudit(c.id)}
              style={{
                background: caseId === c.id ? "var(--steel)" : "var(--slate-hi)",
                color: caseId === c.id ? "white" : "var(--ink)",
                border: "1px solid var(--rule)", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)",
                cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
              }}>
              {c.reference}
            </button>
          ))}
          {cases.length === 0 && <span style={{ color: "var(--text-faint)" }}>No cases yet.</span>}
        </div>

        {loading && <p style={{ color: "var(--text-faint)" }}>Verifying...</p>}
        {error && (
          <div style={{ background: "var(--rejected-bg)", border: "1px solid rgba(158,57,53,0.3)", color: "var(--rejected)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
            {error}
          </div>
        )}

        {audit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="premium-glass-card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--ink)", fontWeight: 600 }}>Hash Chain</h3>
                <span style={{
                  fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", padding: "0.3rem 0.7rem", borderRadius: "100px",
                  background: audit.chain.intact ? "var(--verified-bg)" : "var(--rejected-bg)",
                  color: audit.chain.intact ? "var(--verified)" : "var(--rejected)",
                }}>
                  {audit.chain.intact ? "✓ INTACT" : "✕ BROKEN"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
                <Row label="Custody entries" value={audit.chain.entries} />
                {audit.chain.intact ? (
                  <>
                    <Row label="First entry" value={audit.chain.first_at ? new Date(audit.chain.first_at).toLocaleString() : "—"} />
                    <Row label="Last entry" value={audit.chain.last_at ? new Date(audit.chain.last_at).toLocaleString() : "—"} />
                    <Row label="Chain head" value={<span className="mono" style={{ fontSize: "0.7rem" }}>{audit.chain.head?.slice(0, 16)}…</span>} />
                  </>
                ) : (
                  <Row label="Broken at entry" value={`#${audit.chain.broken_at} — ${audit.chain.reason}`} />
                )}
                <Row label="AI-written findings" value={<span style={{ color: "var(--verified)", fontWeight: 600 }}>{audit.ai_written_findings} — structurally impossible</span>} />
              </div>
            </div>

            <div className="premium-glass-card" style={{ padding: "1.75rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "var(--ink)", fontWeight: 600, marginBottom: "1.25rem" }}>Human Decisions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
                <Row label="Total judged" value={audit.human_decisions} />
                <Row label="Confirmed" value={audit.confirmed} />
                <Row label="Rejected / dismissed" value={audit.rejected_or_dismissed} />
                <Row label="Confirm ratio" value={audit.confirm_ratio !== null ? audit.confirm_ratio.toFixed(2) : "—"} />
                {audit.flag_high_confirm_ratio && (
                  <div style={{ background: "var(--pending-bg)", color: "var(--pending)", padding: "0.6rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 600 }}>
                    ⚠ Flagged: confirm ratio exceeds 0.95 — worth a second look.
                  </div>
                )}
              </div>

              {audit.per_investigator.length > 0 && (
                <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--rule)", paddingTop: "1rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-faint)", marginBottom: "0.6rem" }}>PER INVESTIGATOR</div>
                  {audit.per_investigator.map((p: any) => (
                    <div key={p.username} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "0.3rem 0" }}>
                      <span style={{ color: "var(--ink)" }}>{p.username}</span>
                      <span className="mono" style={{ color: "var(--ink-soft)" }}>{p.confirmed}/{p.total} ({p.ratio.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {audit && (
          <button onClick={() => runAudit(caseId)} style={{ marginTop: "1.5rem", background: "transparent", border: "1px solid var(--steel)", color: "var(--steel)", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600 }}>
            ↻ Re-verify chain from genesis
          </button>
        )}
      </div>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px dashed var(--rule)" }}>
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
