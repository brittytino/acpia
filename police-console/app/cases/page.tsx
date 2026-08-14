"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:47802` : "http://localhost:47802");

export default function CasesList() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCases(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const openDispute = async () => {
    if (!disputeTitle || !disputeScope) return;
    setCreating(true);
    setError(null);
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/disputes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: disputeTitle, scope_summary: disputeScope }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Could not initialize FAIR dispute case");
      }
      setDisputeResult(await res.json());
      fetchCases();
    } catch (e: any) {
      setError(e.message || "Failed to initialize dispute.");
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

  const filtered = cases.filter((c) =>
    c.reference?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell title="Active Forensic Cases">
      <div className="page-header">
        <div>
          <h1>Active Forensic Cases Ledger</h1>
          <p>Complete custody ledger of GUARD investigations and FAIR dual-blind disputes.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-gold btn-sm"
            onClick={() => setShowDisputeForm(true)}
          >
            ⚖️ Open FAIR Dispute Case
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* FAIR Dispute Modal */}
        {showDisputeForm && (
          <div className="modal-overlay" onClick={resetDisputeForm}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>⚖️ Initialize Blind Dual Submission Dispute</h2>
                <button className="btn-signout" onClick={resetDisputeForm}>✕</button>
              </div>

              <div className="modal-body">
                {!disputeResult ? (
                  <div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--gray-600)", marginBottom: "16px" }}>
                      Issues two cryptographically isolated access codes — one per party. Each party seals digital evidence independently, completely blind to the other&apos;s submission.
                    </p>

                    <div className="form-group">
                      <label className="form-label">
                        Dispute Title / Department <span className="required">*</span>
                      </label>
                      <input
                        className="input"
                        value={disputeTitle}
                        onChange={(e) => setDisputeTitle(e.target.value)}
                        placeholder="e.g. Student grievance & cyber harassment inquiry"
                        autoFocus
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Case Scope (Shown Impartially to Both Parties) <span className="required">*</span>
                      </label>
                      <textarea
                        className="input"
                        value={disputeScope}
                        onChange={(e) => setDisputeScope(e.target.value)}
                        placeholder="e.g. Online communications, chat groups, and interactions occurring between 1 June and 15 August 2026."
                      />
                    </div>

                    {error && <div className="alert alert-danger">{error}</div>}
                  </div>
                ) : (
                  <div>
                    <div className="alert alert-success" style={{ marginBottom: "16px" }}>
                      ✓ <strong>Dispute Opened — Case Ref: {disputeResult.case_reference}</strong>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--gray-600)", marginBottom: "16px" }}>
                      Deliver these codes to the respective parties via separate official channels.
                    </p>

                    <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
                      <div style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "12px" }}>
                        <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase" }}>
                          Complainant Access Code:
                        </div>
                        <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>
                          {disputeResult.complainant_code}
                        </div>
                      </div>

                      <div style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "12px" }}>
                        <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase" }}>
                          Respondent Access Code:
                        </div>
                        <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--gold)", marginTop: "4px" }}>
                          {disputeResult.respondent_code}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {!disputeResult ? (
                  <>
                    <button className="btn btn-ghost" onClick={resetDisputeForm}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={creating || !disputeTitle || !disputeScope}
                      onClick={openDispute}
                    >
                      {creating ? "Generating Codes..." : "Issue Both Codes →"}
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={resetDisputeForm}>
                    Done & View Cases
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2>Registered Case Ledgers</h2>
                <span className="badge badge-info">{filtered.length} Cases</span>
              </div>
              <div style={{ width: "260px" }}>
                <input
                  className="input"
                  placeholder="Search by case ref or title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ fontSize: "0.8125rem", padding: "6px 10px" }}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "var(--gray-500)", padding: "24px" }}>Loading active case ledgers...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📁</div>
              <p style={{ fontWeight: 700, color: "var(--gray-900)" }}>No Cases Found</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--gray-500)" }}>
                Accept an inbound citizen report or initialize a FAIR dispute case to begin forensic analysis.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case Ref</th>
                    <th>Investigation Title</th>
                    <th>Case Type</th>
                    <th>Status</th>
                    <th>Artifacts</th>
                    <th>Human Judgment Queue</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>
                        {c.reference}
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.title}</td>
                      <td>
                        <span className={`badge ${c.case_type === "fair" ? "badge-fair" : "badge-guard"}`}>
                          {c.case_type === "fair" ? "FAIR Dispute" : "GUARD Single"}
                        </span>
                      </td>
                      <td>
                        {c.status === "awaiting_submissions" ? (
                          <span className="badge badge-warning">Awaiting Submissions</span>
                        ) : (
                          <span className="badge badge-success">Active Workspace</span>
                        )}
                      </td>
                      <td>
                        <strong>{c.evidence_count} artifacts</strong>
                      </td>
                      <td>
                        {c.leads_pending > 0 ? (
                          <span className="badge badge-danger">{c.leads_pending} Leads Pending</span>
                        ) : (
                          <span className="badge badge-success">✓ Up to Date</span>
                        )}
                      </td>
                      <td>
                        <span className="btn btn-secondary btn-sm">
                          Open Case →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
