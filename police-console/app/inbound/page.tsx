"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:47802";

export default function InboundList() {
  const [inbound, setInbound] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInbound = async () => {
      try {
        const token = localStorage.getItem("acpia_token");
        const res = await fetch(`${API}/api/v1/inbound`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setInbound(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };
    fetchInbound();
  }, []);

  return (
    <Shell title="VERITAS CONSOLE — Inbound Reports">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem", padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--rule)" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontFamily: "'IBM Plex Sans', sans-serif", color: "var(--ink)", marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>Inbound Citizen Reports</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>Secure, anonymized tips awaiting triage.</p>
        </div>
      </div>

      <div style={{ padding: "0 2rem" }}>

      {loading ? (
        <p style={{ color: "var(--text-faint)" }}>Loading reports...</p>
      ) : inbound.length === 0 ? (
        <div className="premium-glass-card" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <span style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", color: "var(--text-faint)" }}>📥</span>
          <p style={{ color: "var(--text-dim)", fontSize: "1.1rem" }}>No inbound reports pending.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "2rem" }}>
          {inbound.map((r) => (
            <Link key={r.reference} href={`/inbound/${r.reference}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="premium-glass-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem", transition: "border 0.2s, transform 0.2s", borderLeft: "4px solid var(--steel)" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ minWidth: "160px" }}>
                  <div className="mono" style={{ color: "var(--steel)", fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.25rem" }}>{r.reference}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Sealed {new Date(r.sealed_at).toLocaleDateString()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "1.15rem", marginBottom: "0.25rem" }}>Path: {r.path_taken.replace('_', ' ')}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>📎</span> Awaiting verification
                  </div>
                </div>
                <div>
                  <span style={{ border: "1px solid rgba(29, 89, 86, 0.3)", color: "var(--steel)", fontSize: "0.75rem", padding: "0.3rem 0.8rem", borderRadius: "100px", fontWeight: 600, display: "inline-block" }}>→ REVIEW</span>
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
