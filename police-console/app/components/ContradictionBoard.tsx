"use client";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:47802";

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

const SEVERITY_COLOR: Record<string, string> = {
  high: "var(--rejected)",
  medium: "var(--pending)",
  low: "var(--text-faint)",
};
const SEVERITY_ICON: Record<string, string> = { high: "▲", medium: "◆", low: "○" };

export function ContradictionBoard({ contradictions, onJudged }: { contradictions: Contradiction[]; onJudged: () => void }) {
  const judge = async (id: string, action: "confirm" | "dismiss") => {
    const token = localStorage.getItem("acpia_token");
    await fetch(`${API}/api/v1/contradictions/${id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    onJudged();
  };

  const highCount = contradictions.filter(c => c.severity === "high").length;

  return (
    <div className="panel" style={{ background: "transparent", border: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem", borderBottom: "1px solid var(--rule)", paddingBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "1.25rem", color: "var(--ink)", fontWeight: 600 }}>Contradiction Board</h2>
        <span style={{ fontSize: "0.8rem", color: "var(--text-faint)", fontWeight: 600 }}>
          {contradictions.length} conflict{contradictions.length !== 1 ? "s" : ""}
          {highCount > 0 && <> · {highCount} high severity</>}
        </span>
      </div>

      {contradictions.length === 0 ? (
        <div className="premium-glass-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-faint)" }}>
          No contradictions surfaced. Requires both parties' submissions to run.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {contradictions.map(c => (
            <div key={c.id} className="premium-glass-card" style={{ padding: "1.25rem", borderLeft: `3px solid ${SEVERITY_COLOR[c.severity]}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ color: SEVERITY_COLOR[c.severity], fontWeight: 700 }}>{SEVERITY_ICON[c.severity]}</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SEVERITY_COLOR[c.severity] }}>
                  {c.severity} · {c.kind.replace(/_/g, " ")}
                </span>
                <span style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
                  {c.confidence.toFixed(2)}
                </span>
              </div>
              <div style={{ color: "var(--ink)", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "0.6rem" }}>{c.summary}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", fontStyle: "italic", background: "var(--slate-hi)", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", marginBottom: "0.85rem" }}>
                Caveat: {c.caveat}
              </div>
              {c.status === "proposed" ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => judge(c.id, "confirm")} style={{ flex: 1, background: "rgba(158,57,53,0.08)", border: "1px solid rgba(158,57,53,0.3)", color: "var(--rejected)", padding: "0.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    Confirm as material
                  </button>
                  <button onClick={() => judge(c.id, "dismiss")} style={{ flex: 1, background: "var(--slate-hi)", border: "1px solid var(--rule)", color: "var(--ink-soft)", padding: "0.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    Dismiss
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-faint)", background: "rgba(11,27,54,0.05)", padding: "0.5rem", textAlign: "center", borderRadius: "var(--radius-sm)" }}>
                  {c.status.replace(/_/g, " ").toUpperCase()} BY HUMAN
                </div>
              )}
            </div>
          ))}
          <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-faint)", padding: "0.5rem" }}>
            Contradictions are surfaced impartially across all submissions. VERITAS does not determine which party is truthful.
          </div>
        </div>
      )}
    </div>
  );
}
