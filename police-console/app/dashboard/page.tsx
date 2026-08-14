"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

export default function Dashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [inbound, setInbound] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("acpia_token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const casesRes = await fetch(`${API}/api/v1/cases`, { headers });
        if (casesRes.ok) {
          const data = await casesRes.json();
          setCases(data.slice(0, 5));
        }

        const inboundRes = await fetch(`${API}/api/v1/inbound`, { headers });
        if (inboundRes.ok) {
          const data = await inboundRes.json();
          setInbound(data.slice(0, 5));
        }
      } catch (e) {
        console.error("Dashboard fetch error", e);
      }
    };
    fetchDashboard();
  }, []);

  const totalEv = cases.reduce((sum, c) => sum + c.evidence_count, 0);
  const totalLeads = cases.reduce((sum, c) => sum + c.leads_pending, 0);

  return (
    <Shell>
      <h1 style={{ marginBottom: "1.5rem" }}>Dashboard</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="card-hi">
          <div className="label" style={{ marginBottom: "0.5rem" }}>Inbound Citizen Reports</div>
          <div className="ledger-num">{inbound.length}</div>
          <p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>Awaiting verification</p>
        </div>
        <div className="card-hi">
          <div className="label" style={{ marginBottom: "0.5rem", color: "var(--pending)" }}>Leads Pending Judgment</div>
          <div className="ledger-num" style={{ color: "var(--pending)" }}>{totalLeads}</div>
          <p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>Across all active cases</p>
        </div>
        <div className="card-hi">
          <div className="label" style={{ marginBottom: "0.5rem" }}>Active Cases</div>
          <div className="ledger-num">{cases.length}</div>
          <p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>{totalEv} evidence artifacts</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div>
          <div className="panel-header">
            <h2>Recent Inbound Reports</h2>
            <Link href="/inbound" className="btn-ghost" style={{ fontSize: "0.8125rem" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {inbound.length === 0 ? <p>No pending inbound reports.</p> : inbound.map(r => (
              <div key={r.reference} className="card" onClick={() => router.push(`/inbound/${r.reference}`)} style={{ cursor: "pointer", transition: "border 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--steel)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--rule)"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono" style={{ color: "var(--text)" }}>{r.reference}</span>
                  <span className="label">{new Date(r.sealed_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Path: {r.path_taken.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="panel-header">
            <h2>Active Cases</h2>
            <Link href="/cases" className="btn-ghost" style={{ fontSize: "0.8125rem" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {cases.length === 0 ? <p>No active cases.</p> : cases.map(c => (
              <div key={c.id} className="card" onClick={() => router.push(`/cases/${c.id}`)} style={{ cursor: "pointer", transition: "border 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--steel)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--rule)"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono" style={{ color: "var(--text)" }}>{c.reference}</span>
                  {c.leads_pending > 0 && <span className="badge badge-pending">{c.leads_pending} pending</span>}
                </div>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem", color: "var(--text)" }}>{c.title}</p>
                <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: "0.5rem" }}>
                  {c.evidence_count} artifacts
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
