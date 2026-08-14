"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

export default function CasesList() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const token = localStorage.getItem("acpia_token");
        const res = await fetch(`${API}/api/v1/cases`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setCases(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  return (
    <Shell title="ACPIA CONSOLE — Active Cases">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem", padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--rule)" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontFamily: "'IBM Plex Sans', sans-serif", color: "var(--ink)", marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>Active Cases</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>Intelligence ledgers and forensic workspaces.</p>
        </div>
      </div>

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
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "1.15rem", marginBottom: "0.25rem" }}>{c.title}</div>
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
