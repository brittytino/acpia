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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Active Cases</h1>
      </div>

      {loading ? (
        <p>Loading cases...</p>
      ) : cases.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <p style={{ color: "var(--text-faint)" }}>No active cases.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {cases.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card-hi" style={{ display: "flex", alignItems: "center", gap: "1.5rem", transition: "border 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--steel)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--rule)"}>
                <div style={{ minWidth: "140px" }}>
                  <div className="mono" style={{ color: "var(--text)", fontSize: "1rem" }}>{c.reference}</div>
                  <div className="label" style={{ marginTop: "0.25rem" }}>{new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "1rem" }}>{c.title}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                    {c.evidence_count} artifacts
                  </div>
                </div>
                <div>
                  {c.leads_pending > 0 ? (
                    <span className="badge badge-pending">{c.leads_pending} leads pending</span>
                  ) : (
                    <span className="badge badge-verified">Up to date</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
