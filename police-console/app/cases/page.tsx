"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:47802";

export default function CasesList() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeScope, setDisputeScope] = useState("");
  const [disputeResult, setDisputeResult] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setCases(await res.json());
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCases(); }, []);

  const openDispute = async () => {
    if (!disputeTitle || !disputeScope) return;
    setCreating(true);
    setError(null);
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/disputes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: disputeTitle, scope_summary: disputeScope }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Could not open dispute");
      }
      setDisputeResult(await res.json());
      fetchCases();
    } catch (e: any) {
      setError(e.message || "Could not open dispute");
    } finally {
      setCreating(false);
    }
  };

  const resetDisputeForm = () => {
    setShowDisputeForm(false);
    setDisputeTitle("");
    setDisputeScope("");
    setDisputeResult(null);
    setError(null);
  };

  return (
    <Shell title="VERITAS CONSOLE — Active Cases">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem", padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--rule)" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontFamily: "'IBM Plex Sans', sans-serif", color: "var(--ink)", marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>Active Cases</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>GUARD investigations and FAIR disputes, in one ledger.</p>
        </div>
        <button
          onClick={() => setShowDisputeForm(true)}
          style={{ background: "var(--steel)", border: "none", color: "white", padding: "0.75rem 1.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 }}
        >
          ⚖️ Open FAIR Dispute
        </button>
      </div>

      {showDisputeForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(11,27,54,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={resetDisputeForm}>
          <div className="premium-glass-card" style={{ width: "560px", maxWidth: "92vw", padding: "2rem", background: "var(--slate)" }} onClick={e => e.stopPropagation()}>
            {!disputeResult ? (
              <>
                <h2 style={{ fontSize: "1.4rem", color: "var(--ink)", marginBottom: "0.5rem" }}>Open a Blind Dual Submission</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                  Issues two codes — one per party. Each seals evidence independently, blind to the other's
                  submission, straight into this case. Neither can see the other's artifacts.
                </p>
                <div style={{ marginBottom: "1rem" }}>
                  <div className="label" style={{ marginBottom: "0.375rem" }}>Case title</div>
                  <input className="input" value={disputeTitle} onChange={e => setDisputeTitle(e.target.value)}
                    placeholder="e.g. Faculty complaint — Dept. of Physics" style={{ width: "100%" }} />
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <div className="label" style={{ marginBottom: "0.375rem" }}>Scope shown to both parties</div>
                  <textarea className="input" value={disputeScope} onChange={e => setDisputeScope(e.target.value)}
                    placeholder="Events between 1 July and 11 August 2026" style={{ width: "100%", minHeight: "80px" }} />
                </div>
                {error && <div style={{ color: "var(--rejected)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</div>}
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button onClick={resetDisputeForm} style={{ background: "transparent", border: "1px solid var(--rule)", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--ink-soft)" }}>Cancel</button>
                  <button onClick={openDispute} disabled={creating || !disputeTitle || !disputeScope}
                    style={{ background: "var(--steel)", border: "none", color: "white", padding: "0.6rem 1.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600, opacity: creating ? 0.6 : 1 }}>
                    {creating ? "Opening..." : "Issue both codes →"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: "1.4rem", color: "var(--verified)", marginBottom: "0.5rem" }}>✓ Dispute opened — {disputeResult.case_reference}</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                  Send each code to its party through a separate, verified channel — never through the other party.
                </p>
                <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{ background: "var(--slate-hi)", border: "1px solid var(--rule)", borderRadius: "var(--radius-sm)", padding: "1rem" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-faint)", marginBottom: "0.4rem" }}>COMPLAINANT CODE</div>
                    <div className="mono" style={{ fontSize: "1.1rem", color: "var(--ink)", fontWeight: 600 }}>{disputeResult.complainant_code}</div>
                  </div>
                  <div style={{ background: "var(--slate-hi)", border: "1px solid var(--rule)", borderRadius: "var(--radius-sm)", padding: "1rem" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-faint)", marginBottom: "0.4rem" }}>RESPONDENT CODE</div>
                    <div className="mono" style={{ fontSize: "1.1rem", color: "var(--ink)", fontWeight: 600 }}>{disputeResult.respondent_code}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={resetDisputeForm} style={{ background: "var(--ink)", border: "none", color: "white", padding: "0.6rem 1.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600 }}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: "0 2rem" }}>

      {loading ? (
        <p style={{ color: "var(--text-faint)" }}>Loading cases...</p>
      ) : cases.length === 0 ? (
        <div className="premium-glass-card" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <span style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", color: "var(--text-faint)" }}>📁</span>
          <p style={{ color: "var(--text-dim)", fontSize: "1.1rem" }}>No active cases found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "2rem" }}>
          {cases.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="premium-glass-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem", transition: "border 0.2s, transform 0.2s", borderLeft: c.leads_pending > 0 ? "4px solid var(--pending)" : "4px solid var(--rule)" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ minWidth: "160px" }}>
                  <div className="mono" style={{ color: "var(--steel)", fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.25rem" }}>{c.reference}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Opened {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "1.15rem" }}>{c.title}</span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", padding: "0.15rem 0.5rem", borderRadius: "4px",
                      background: c.case_type === "fair" ? "rgba(180,134,58,0.12)" : "rgba(29,89,86,0.1)",
                      color: c.case_type === "fair" ? "var(--pending)" : "var(--verified)",
                    }}>
                      {c.case_type === "fair" ? "FAIR" : "GUARD"}
                    </span>
                    {c.status === "awaiting_submissions" && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "var(--rejected-bg)", color: "var(--rejected)" }}>
                        AWAITING SUBMISSIONS
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>📎</span> {c.evidence_count} secured artifacts
                  </div>
                </div>
                <div>
                  {c.leads_pending > 0 ? (
                    <span style={{ background: "var(--pending-bg)", color: "var(--pending)", fontSize: "0.8rem", padding: "0.4rem 0.8rem", borderRadius: "100px", fontWeight: 700, display: "inline-block" }}>{c.leads_pending} LEADS PENDING</span>
                  ) : (
                    <span style={{ border: "1px solid rgba(29, 89, 86, 0.3)", color: "var(--verified)", fontSize: "0.75rem", padding: "0.3rem 0.8rem", borderRadius: "100px", fontWeight: 600, display: "inline-block" }}>✓ UP TO DATE</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </Shell>
  );
}
