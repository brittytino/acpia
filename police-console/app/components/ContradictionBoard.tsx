"use client";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:48802` : "http://localhost:48802");

interface Contradiction {
  id: string;
  kind: string;
  summary: string;
  severity: "high" | "medium" | "low";
  confidence: number;
  caveat: string;
  status: string;
  source_ids: string[];
}

export function ContradictionBoard({
  contradictions,
  onJudged,
}: {
  contradictions: Contradiction[];
  onJudged: () => void;
}) {
  const judge = async (id: string, action: "confirm" | "dismiss") => {
    const token = localStorage.getItem("acpia_token");
    await fetch(`${API}/api/v1/contradictions/${id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    onJudged();
  };

  const highCount = contradictions.filter((c) => c.severity === "high").length;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2>⚖️ Contradiction Board — Blind Cross-Analysis</h2>
            <span className="badge badge-gold">{contradictions.length} Surfaced</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--gray-600)", margin: "4px 0 0" }}>
            Automated conflict detection across complainant and respondent statements, timestamps, and metadata.
          </p>
        </div>
        {highCount > 0 && (
          <span className="badge badge-danger">
            ⚠️ {highCount} High Severity Conflict(s)
          </span>
        )}
      </div>

      <div className="alert alert-info" style={{ marginBottom: "16px", padding: "10px 14px", fontSize: "0.8125rem" }}>
        <strong>Impartiality Notice:</strong> Contradictions are surfaced mathematically across all sealed submissions.
        VERITAS does not determine which party is truthful. Materiality judgments rest strictly with human investigators.
      </div>

      {contradictions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--gray-500)" }}>
          <div style={{ fontSize: "1.75rem", marginBottom: "6px" }}>🔍</div>
          <p style={{ fontWeight: 700, margin: 0 }}>No Material Contradictions Surfaced</p>
          <p style={{ fontSize: "0.75rem", marginTop: "4px" }}>
            Requires both parties&apos; submissions to execute automated cross-analysis.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {contradictions.map((c) => (
            <div
              key={c.id}
              style={{
                background: "var(--gray-50)",
                border: "var(--border)",
                borderLeft: `4px solid ${
                  c.severity === "high"
                    ? "var(--danger)"
                    : c.severity === "medium"
                    ? "var(--warning)"
                    : "var(--info)"
                }`,
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    className={`badge ${
                      c.severity === "high"
                        ? "badge-danger"
                        : c.severity === "medium"
                        ? "badge-warning"
                        : "badge-info"
                    }`}
                  >
                    {c.severity.toUpperCase()} &bull; {c.kind?.replace(/_/g, " ")}
                  </span>
                  <span className="mono" style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                    AI Confidence: {c.confidence?.toFixed(2)}
                  </span>
                </div>

                <div>
                  {c.status !== "proposed" && (
                    <span className={`badge ${c.status === "confirmed" ? "badge-success" : "badge-neutral"}`}>
                      {c.status?.toUpperCase()} BY INVESTIGATOR
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontWeight: 700, color: "var(--gray-900)", fontSize: "0.9375rem", marginBottom: "6px", lineHeight: 1.4 }}>
                {c.summary}
              </div>

              <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: "0.75rem", color: "var(--gray-600)", fontStyle: "italic", marginBottom: "12px" }}>
                <strong>Caveat:</strong> {c.caveat}
              </div>

              {c.status === "proposed" && (
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-confirm btn-sm"
                    onClick={() => judge(c.id, "confirm")}
                  >
                    ✓ Confirm as Material
                  </button>
                  <button
                    className="btn btn-reject btn-sm"
                    onClick={() => judge(c.id, "dismiss")}
                  >
                    ✕ Dismiss Conflict
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
