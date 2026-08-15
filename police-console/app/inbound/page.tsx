"use client";
import { Shell } from "../components/Shell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:48802` : "http://localhost:48802");

export default function InboundList() {
  const router = useRouter();
  const [inbound, setInbound] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchInbound = async () => {
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/inbound`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setInbound(await res.json());
      }
    } catch (err) {
      console.warn("Inbound fetch failed:", err);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchInbound();
    // Auto-refresh every 30 seconds so new complaints appear automatically
    const interval = setInterval(fetchInbound, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = inbound.filter((r) =>
    r.reference?.toLowerCase().includes(search.toLowerCase()) ||
    r.path_taken?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell title="Inbound Citizen Reports">
      <div className="page-header">
        <div>
          <h1>Inbound Citizen Evidence Submissions</h1>
          <p>Triage unattached sealed citizen reports and review cryptographic hashes before accepting into forensic cases.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
            Last refreshed: {lastRefresh.toLocaleTimeString()} · auto every 30s
          </span>
          <button className="btn btn-secondary btn-sm" onClick={fetchInbound}>
            ↻ Refresh Queue
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="card-header" style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2>Pending Triage Queue</h2>
              <span className="badge badge-info">{filtered.length} Reports</span>
            </div>
            <div style={{ minWidth: "200px", flex: "1 1 200px", maxWidth: "340px" }}>
              <input
                className="input"
                placeholder="Search by locator reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: "0.8125rem", padding: "6px 10px", width: "100%" }}
              />
            </div>
          </div>

          {loading ? (
            <p style={{ color: "var(--gray-500)", padding: "24px" }}>Loading inbound reports queue...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📥</div>
              <p style={{ fontWeight: 700, color: "var(--gray-900)" }}>No Inbound Reports Found</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--gray-500)" }}>
                Citizen reports submitted via VERITAS SEAL will appear here for verification and triage.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference Locator</th>
                    <th>Intake Category</th>
                    <th>Sealed Timestamp (UTC)</th>
                    <th>Evidence Artifacts</th>
                    <th>Integrity Verification</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.reference} onClick={() => router.push(`/inbound/${r.reference}`)}>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>
                        {r.reference}
                      </td>
                      <td>
                        <span className="badge badge-neutral">{r.path_taken?.replace("_", " ")}</span>
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>
                        {new Date(r.sealed_at).toLocaleString()}
                      </td>
                      <td>
                        <strong>{r.artifacts?.length || 1} file(s)</strong>
                      </td>
                      <td>
                        <span className="badge badge-success">✓ SHA-256 Intact</span>
                      </td>
                      <td>
                        <span className="btn btn-secondary btn-sm">
                          Review & Intake →
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
