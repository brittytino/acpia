"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:48802";

export default function Dashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [inbound, setInbound] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("acpia_token");
        const headers = { Authorization: `Bearer ${token}` };

        const [casesRes, inboundRes] = await Promise.all([
          fetch(`${API}/api/v1/cases`, { headers }),
          fetch(`${API}/api/v1/inbound`, { headers }),
        ]);

        if (casesRes.ok) {
          const data = await casesRes.json();
          setCases(data);
        }
        if (inboundRes.ok) {
          const data = await inboundRes.json();
          setInbound(data);
        }
      } catch (e) {
        console.error("Dashboard data load error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const totalEv = cases.reduce((sum, c) => sum + (c.evidence_count || 0), 0);
  const totalLeads = cases.reduce((sum, c) => sum + (c.leads_pending || 0), 0);

  return (
    <Shell title="Operational Intelligence Dashboard">
      <div className="page-header">
        <div>
          <h1>Forensic Operations & Triage Dashboard</h1>
          <p>Real-time oversight of sealed citizen reports, active case ledgers, and human judgment queues.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
            ↻ Refresh Data
          </button>
          <Link href="/cases" className="btn btn-primary btn-sm">
            View All Cases →
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Operational Metrics */}
        <div className="summary-grid">
          <div className="metric-panel">
            <div className="metric-label">Inbound Reports</div>
            <div className="metric-value">{inbound.length}</div>
            <div className="metric-sub">Awaiting forensic triage</div>
          </div>

          <div className="metric-panel highlight">
            <div className="metric-label">Leads Pending Judgment</div>
            <div className="metric-value" style={{ color: "var(--warning)" }}>{totalLeads}</div>
            <div className="metric-sub">Human decision gate required</div>
          </div>

          <div className="metric-panel">
            <div className="metric-label">Active Cases</div>
            <div className="metric-value">{cases.length}</div>
            <div className="metric-sub">GUARD & FAIR ledgers</div>
          </div>

          <div className="metric-panel">
            <div className="metric-label">Secured Evidence</div>
            <div className="metric-value">{totalEv}</div>
            <div className="metric-sub">SHA-256 verified artifacts</div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Recent Inbound Reports */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2>Recent Inbound Reports</h2>
                <span className="badge badge-info">{inbound.length}</span>
              </div>
              <Link href="/inbound" style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                View All Inbound →
              </Link>
            </div>

            {loading ? (
              <p style={{ color: "var(--gray-500)", padding: "16px" }}>Loading inbound reports...</p>
            ) : inbound.length === 0 ? (
              <p style={{ color: "var(--gray-500)", padding: "16px" }}>No new inbound reports in queue.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Locator Ref</th>
                      <th>Intake Path</th>
                      <th>Sealed At</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inbound.slice(0, 6).map((r) => (
                      <tr key={r.reference} onClick={() => router.push(`/inbound/${r.reference}`)}>
                        <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>{r.reference}</td>
                        <td>
                          <span className="badge badge-neutral">{r.path_taken?.replace("_", " ")}</span>
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>
                          {new Date(r.sealed_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="badge badge-warning">Awaiting Review</span>
                        </td>
                        <td>
                          <span style={{ color: "var(--secondary)", fontWeight: 700, fontSize: "0.75rem" }}>
                            Triage →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Case Ledgers */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2>Active Forensic Cases</h2>
                <span className="badge badge-info">{cases.length}</span>
              </div>
              <Link href="/cases" style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                View All Cases →
              </Link>
            </div>

            {loading ? (
              <p style={{ color: "var(--gray-500)", padding: "16px" }}>Loading cases...</p>
            ) : cases.length === 0 ? (
              <p style={{ color: "var(--gray-500)", padding: "16px" }}>No active forensic cases.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Case Ref</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Evidence</th>
                      <th>Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.slice(0, 6).map((c) => (
                      <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                        <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>{c.reference}</td>
                        <td style={{ fontWeight: 600 }}>{c.title}</td>
                        <td>
                          <span className={`badge ${c.case_type === "fair" ? "badge-fair" : "badge-guard"}`}>
                            {c.case_type === "fair" ? "FAIR" : "GUARD"}
                          </span>
                        </td>
                        <td>{c.evidence_count} files</td>
                        <td>
                          {c.leads_pending > 0 ? (
                            <span className="badge badge-warning">{c.leads_pending} Pending</span>
                          ) : (
                            <span className="badge badge-success">✓ Clear</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
