"use client";
import { Shell } from "../../components/Shell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

export default function InboundDetail({ params }: { params: { ref: string } }) {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("acpia_token");
        const res = await fetch(`${API}/api/v1/inbound/${params.ref}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setReport(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [params.ref]);

  const acceptIntoCase = async () => {
    setAccepting(true);
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/inbound/${params.ref}/accept`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ case_id: null }) // Create new case
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/cases/${data.case_id}`);
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <Shell><div className="container">Loading...</div></Shell>;
  if (!report) return <Shell><div className="container">Report not found</div></Shell>;

  return (
    <Shell title={`INBOUND: ${report.reference}`}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: "1.5rem", padding: 0 }}>
          ← Back to queue
        </button>

        <div className="card-hi" style={{ marginBottom: "1.5rem" }}>
          <div className="panel-header" style={{ marginBottom: "1.5rem", borderBottom: "none", paddingBottom: 0 }}>
            <div>
              <div className="label">Reference</div>
              <div className="mono" style={{ fontSize: "1.5rem", color: "var(--text)" }}>{report.reference}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="label">Sealed At</div>
              <div className="mono">{new Date(report.sealed_at).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginBottom: "2rem" }}>
            <div>
              <div className="label">Path Taken</div>
              <div style={{ color: "var(--text)" }}>{report.path_taken.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="label">Declarant Statement</div>
              <div style={{ color: "var(--text-dim)", fontStyle: "italic", background: "var(--void)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule)" }}>
                {report.statement || "No statement provided."}
              </div>
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: "1rem" }}>Sealed Artifacts ({report.artifacts.length})</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
          {report.artifacts.map((art: any, i: number) => (
            <div key={i} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>{art.filename}</div>
                <div className="mono" style={{ color: "var(--text-faint)" }}>{(art.size_bytes / 1024).toFixed(1)} KB</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                <div className="label">Sealed</div>
                <div className="hash">{art.sha256_groups}</div>
              </div>
              {art.body_stored && (
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div className="label">Received</div>
                  <div className="hash">{art.sha256_groups}</div>
                </div>
              )}
              <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {art.integrity === "VERIFIED" || art.integrity === "HASH_ONLY" ? (
                  <span className="badge badge-verified">✓ INTEGRITY VERIFIED</span>
                ) : (
                  <span className="badge badge-alarm">⚠️ INTEGRITY FAILED</span>
                )}
                {art.integrity === "HASH_ONLY" && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>Hash-only record (illegal material path)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {!report.claimed ? (
          <div className="card-hi" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--void)" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>Accept into Intelligence Platform</div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>This will create a new case and continue the chain of custody.</div>
            </div>
            <button className="btn btn-primary" onClick={acceptIntoCase} disabled={accepting} style={{ padding: "0.75rem 1.5rem" }}>
              {accepting ? "Accepting..." : "Accept into new case →"}
            </button>
          </div>
        ) : (
          <div className="info-box" style={{ textAlign: "center", padding: "1.5rem", background: "var(--void)", border: "1px solid var(--rule)", borderRadius: "var(--radius-md)" }}>
            This report has already been claimed and attached to a case.
          </div>
        )}
      </div>
    </Shell>
  );
}
