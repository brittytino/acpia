"use client";
import { Shell } from "../../components/Shell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:47802";

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
      <div style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "4rem" }}>
        <button onClick={() => router.back()} style={{ background: "transparent", border: "none", color: "var(--steel)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem", marginTop: "2rem" }}>
          <span>←</span> Back to queue
        </button>

        <div className="premium-glass-card" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "1.5rem 2rem", borderBottom: "1px solid var(--rule)", background: "var(--slate-hi)" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-faint)", marginBottom: "0.25rem" }}>Reference Locator</div>
              <div className="mono" style={{ fontSize: "1.75rem", color: "var(--ink)", fontWeight: 600 }}>{report.reference}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-faint)", marginBottom: "0.25rem" }}>Sealed Timestamp</div>
              <div className="mono" style={{ fontSize: "1rem", color: "var(--ink-soft)" }}>{new Date(report.sealed_at).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", padding: "2rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-faint)", marginBottom: "0.5rem" }}>Path Taken</div>
              <div style={{ color: "var(--ink)", fontWeight: 600, background: "rgba(11,27,54,0.05)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", display: "inline-block" }}>{report.path_taken.replace('_', ' ')}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-faint)", marginBottom: "0.5rem" }}>Declarant Statement</div>
              <div style={{ color: "var(--ink-soft)", fontStyle: "italic", background: "var(--slate-hi)", padding: "1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule)", lineHeight: 1.6 }}>
                "{report.statement || "No statement provided."}"
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.25rem", color: "var(--ink)", fontWeight: 600 }}>Sealed Artifacts ({report.artifacts.length})</h3>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
          {report.artifacts.map((art: any, i: number) => (
            <div key={i} className="premium-glass-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--rule)" }}>
                <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "1.1rem" }}>{art.filename}</div>
                <div className="mono" style={{ color: "var(--text-dim)", background: "rgba(11,27,54,0.05)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>{(art.size_bytes / 1024).toFixed(1)} KB</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "1rem", alignItems: "center", marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-faint)" }}>Sealed</div>
                <div className="mono" style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>{art.sha256_groups}</div>
              </div>
              {art.body_stored && (
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-faint)" }}>Received</div>
                  <div className="mono" style={{ fontSize: "0.85rem", color: "var(--ink)" }}>{art.sha256_groups}</div>
                </div>
              )}
              <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {art.integrity === "VERIFIED" || art.integrity === "HASH_ONLY" ? (
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", padding: "0.3rem 0.6rem", borderRadius: "4px", background: "var(--verified-bg)", color: "var(--verified)", border: "1px solid rgba(29,89,86,0.2)" }}>
                    ✓ INTEGRITY VERIFIED
                  </span>
                ) : (
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", padding: "0.3rem 0.6rem", borderRadius: "4px", background: "var(--rejected-bg)", color: "var(--rejected)", border: "1px solid rgba(158,57,53,0.2)" }}>
                    ⚠️ INTEGRITY FAILED
                  </span>
                )}
                {art.integrity === "HASH_ONLY" && (
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontStyle: "italic" }}>Hash-only record (illegal material path)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {!report.claimed ? (
          <div className="premium-glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2rem", borderLeft: "4px solid var(--steel)", background: "var(--slate-hi)" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.35rem", fontSize: "1.1rem" }}>Accept into Intelligence Platform</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>This will create a new forensic case workspace and continue the chain of custody.</div>
            </div>
            <button style={{ background: "var(--steel)", border: "none", color: "white", padding: "0.85rem 1.75rem", borderRadius: "var(--radius-sm)", cursor: accepting ? "not-allowed" : "pointer", fontSize: "0.95rem", fontWeight: 600, opacity: accepting ? 0.7 : 1, transition: "background 0.2s" }} onMouseOver={e => !accepting && (e.currentTarget.style.background = "var(--steel-hi)")} onMouseOut={e => !accepting && (e.currentTarget.style.background = "var(--steel)")} onClick={acceptIntoCase} disabled={accepting}>
              {accepting ? "Accepting..." : "Accept into new case →"}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", background: "var(--slate-hi)", border: "1px dashed var(--rule)", borderRadius: "var(--radius-md)", color: "var(--ink-soft)" }}>
            🔒 This report has already been claimed and attached to an active case.
          </div>
        )}
      </div>
    </Shell>
  );
}
