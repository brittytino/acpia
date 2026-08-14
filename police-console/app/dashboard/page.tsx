"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:47802";

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", padding: "2rem 2rem 0" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontFamily: "'IBM Plex Sans', sans-serif", color: "var(--ink)", marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>Intelligence Dashboard</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>System status: <span style={{ color: "var(--verified)", fontWeight: 600 }}>● Secure</span> &middot; VERITAS Forensic Workstation</p>
        </div>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "3rem", padding: "0 2rem" }}>
        <div className="premium-glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ width: "32px", height: "32px", background: "rgba(11, 27, 54, 0.05)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)" }}>📥</div>
            <div className="label" style={{ color: "var(--ink-soft)", fontSize: "0.75rem" }}>Inbound Citizen Reports</div>
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: "var(--ink)", lineHeight: 1 }}>{inbound.length}</div>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "var(--text-faint)" }}>Awaiting forensic verification</p>
        </div>

        <div className="premium-glass-card" style={{ padding: "1.5rem", borderColor: "rgba(180, 134, 58, 0.3)", background: "linear-gradient(180deg, var(--card) 0%, rgba(180, 134, 58, 0.05) 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ width: "32px", height: "32px", background: "var(--pending-bg)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pending)" }}>⚠️</div>
            <div className="label" style={{ color: "var(--pending)", fontSize: "0.75rem" }}>Leads Pending Judgment</div>
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: "var(--ink)", lineHeight: 1 }}>{totalLeads}</div>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "var(--pending)", fontWeight: 500 }}>High priority across all active cases</p>
        </div>

        <div className="premium-glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ width: "32px", height: "32px", background: "rgba(11, 27, 54, 0.05)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)" }}>📁</div>
            <div className="label" style={{ color: "var(--ink-soft)", fontSize: "0.75rem" }}>Active Cases</div>
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: "var(--ink)", lineHeight: 1 }}>{cases.length}</div>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "var(--text-faint)" }}>{totalEv} secured evidence artifacts</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", padding: "0 2rem 2rem" }}>
        <div className="panel" style={{ background: "transparent", border: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid var(--rule)", paddingBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", color: "var(--ink)", fontWeight: 600 }}>Recent Inbound Reports</h2>
            <Link href="/inbound" style={{ fontSize: "0.85rem", color: "var(--steel)", textDecoration: "none", fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {inbound.length === 0 ? <div className="premium-glass-card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-faint)" }}>No pending inbound reports.</div> : inbound.map(r => (
              <div key={r.reference} className="premium-glass-card" onClick={() => router.push(`/inbound/${r.reference}`)} style={{ padding: "1.25rem", cursor: "pointer", borderLeft: "3px solid var(--steel)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span className="mono" style={{ color: "var(--ink)", fontWeight: 600, fontSize: "0.95rem" }}>{r.reference}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", background: "rgba(11, 27, 54, 0.05)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: 500 }}>{new Date(r.sealed_at).toLocaleDateString()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                  <span style={{ color: "var(--steel)", fontWeight: 600 }}>↳</span> Path: <span style={{ color: "var(--ink)", fontWeight: 500 }}>{r.path_taken.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ background: "transparent", border: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid var(--rule)", paddingBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", color: "var(--ink)", fontWeight: 600 }}>Active Cases</h2>
            <Link href="/cases" style={{ fontSize: "0.85rem", color: "var(--steel)", textDecoration: "none", fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {cases.length === 0 ? <div className="premium-glass-card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-faint)" }}>No active cases.</div> : cases.map(c => (
              <div key={c.id} className="premium-glass-card" onClick={() => router.push(`/cases/${c.id}`)} style={{ padding: "1.25rem", cursor: "pointer", borderLeft: c.leads_pending > 0 ? "3px solid var(--pending)" : "3px solid var(--rule)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div>
                    <span className="mono" style={{ color: "var(--ink-soft)", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem", fontWeight: 600 }}>{c.reference}</span>
                    <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: "1.05rem" }}>{c.title}</span>
                  </div>
                  {c.leads_pending > 0 && <span style={{ background: "var(--pending-bg)", color: "var(--pending)", fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "100px", fontWeight: 700 }}>{c.leads_pending} PENDING</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.8rem", color: "var(--text-faint)", marginTop: "0.75rem", fontWeight: 500 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>📎 {c.evidence_count} artifacts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
