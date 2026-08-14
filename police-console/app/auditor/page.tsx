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
      .then((r) => (r.ok ? r.json() : []))
      .then(setCases);
  }, []);

  const runAudit = async (id: string) => {
    setCaseId(id);
    setLoading(true);
    setError(null);
    setAudit(null);
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/cases/${id}/audit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          res.status === 403
            ? "This view requires auditor, supervisor, or admin privileges."
            : body.detail || "Could not execute audit check on this case."
        );
      }
      setAudit(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="Cryptographic Custody Auditor">
      <div className="page-header">
        <div>
          <h1>Custody Ledger Verification & Audit Console</h1>
          <p>
            Read-only zero-knowledge inspection. Verifies genesis-to-head cryptographic hash chains and investigator confirm/reject ratios without exposing protected payload content.
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="alert alert-info" style={{ marginBottom: "20px" }}>
          <strong>Statutory Auditor Isolation:</strong>
          <br />
          Auditor privileges grant access to cryptographic proofs and governance decision metrics only.
          Protected raw evidence payloads and multimedia streams are structurally shielded from this console.
        </div>

        {/* Case Selector */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <label className="form-label" style={{ marginBottom: "8px" }}>
            Select Case Ledger for Independent Audit:
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {cases.map((c) => (
              <button
                key={c.id}
                onClick={() => runAudit(c.id)}
                className={`btn ${caseId === c.id ? "btn-primary" : "btn-secondary"} btn-sm`}
              >
                {c.reference} &bull; {c.title}
              </button>
            ))}
            {cases.length === 0 && <span style={{ color: "var(--gray-500)", fontSize: "0.8125rem" }}>No cases available for audit.</span>}
          </div>
        </div>

        {loading && <p style={{ color: "var(--gray-500)", padding: "16px" }}>Executing cryptographic audit...</p>}

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "20px" }}>
            {error}
          </div>
        )}

        {audit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Hash Chain Integrity */}
            <div className="card">
              <div className="card-header">
                <h2>Cryptographic Hash Chain</h2>
                <span className={`badge ${audit.chain.intact ? "badge-success" : "badge-danger"}`}>
                  {audit.chain.intact ? "✓ CHAIN INTACT" : "✕ INTEGRITY BROKEN"}
                </span>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <tbody>
                    <tr>
                      <th style={{ width: "180px" }}>Custody Ledger Entries</th>
                      <td><strong>{audit.chain.entries}</strong></td>
                    </tr>
                    {audit.chain.intact ? (
                      <>
                        <tr>
                          <th>Genesis Timestamp</th>
                          <td style={{ fontSize: "0.75rem" }}>
                            {audit.chain.first_at ? new Date(audit.chain.first_at).toLocaleString() : "—"}
                          </td>
                        </tr>
                        <tr>
                          <th>Head Timestamp</th>
                          <td style={{ fontSize: "0.75rem" }}>
                            {audit.chain.last_at ? new Date(audit.chain.last_at).toLocaleString() : "—"}
                          </td>
                        </tr>
                        <tr>
                          <th>Ledger Head Hash</th>
                          <td className="hash">{audit.chain.head}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <th>Failure Point</th>
                        <td style={{ color: "var(--danger)", fontWeight: 700 }}>
                          Entry #{audit.chain.broken_at} — {audit.chain.reason}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <th>Autonomous AI Findings</th>
                      <td>
                        <span className="badge badge-success">
                          {audit.ai_written_findings} &bull; Structurally Prohibited
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Human Decisions Governance */}
            <div className="card">
              <div className="card-header">
                <h2>Investigator Decision Governance</h2>
                <span className="badge badge-neutral">Human Oversight Audit</span>
              </div>

              <div className="table-container" style={{ marginBottom: "16px" }}>
                <table className="data-table">
                  <tbody>
                    <tr>
                      <th style={{ width: "180px" }}>Total Decisions Logged</th>
                      <td><strong>{audit.human_decisions}</strong></td>
                    </tr>
                    <tr>
                      <th>Confirmed Leads</th>
                      <td>{audit.confirmed}</td>
                    </tr>
                    <tr>
                      <th>Rejected / Dismissed</th>
                      <td>{audit.rejected_or_dismissed}</td>
                    </tr>
                    <tr>
                      <th>Confirmation Ratio</th>
                      <td>
                        <strong>
                          {audit.confirm_ratio !== null ? audit.confirm_ratio.toFixed(2) : "—"}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {audit.flag_high_confirm_ratio && (
                <div className="alert alert-warning" style={{ margin: "0 0 16px" }}>
                  ⚠️ <strong>Automated Compliance Flag:</strong> Confirmation ratio exceeds 0.95. Requires supervisory oversight review for rubber-stamping compliance.
                </div>
              )}

              {audit.per_investigator?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--gray-600)", marginBottom: "8px" }}>
                    Breakdown by Investigating Officer:
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Officer Username</th>
                          <th>Confirmed / Total</th>
                          <th>Confirm Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.per_investigator.map((p: any) => (
                          <tr key={p.username}>
                            <td><strong>{p.username}</strong></td>
                            <td>{p.confirmed} / {p.total}</td>
                            <td>
                              <span className="mono">{(p.ratio * 100).toFixed(0)}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
