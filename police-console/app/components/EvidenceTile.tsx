"use client";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:47802` : "http://localhost:47802");

interface Indicator { kind: string; detail: string; caveat: string; severity: string }
interface Evidence {
  id: string;
  filename: string;
  mime_type: string;
  sha256: string;
  integrity_ok: boolean;
  revealed_count: number;
  submitter_role?: string | null;
  authenticity_indicators?: Indicator[];
}

const ROLE_COLOR: Record<string, string> = { complainant: "var(--rejected)", respondent: "var(--steel)" };

export function EvidenceTile({ e, onRevealed }: { e: Evidence; onRevealed: () => void }) {
  const indicators = e.authenticity_indicators || [];

  const reveal = async () => {
    await fetch(`${API}/api/v1/evidence/${e.id}/reveal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("acpia_token")}` },
    });
    onRevealed();
  };

  return (
    <div className="premium-glass-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--slate-hi)" }}>
      <div style={{ height: "100px", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {e.mime_type.startsWith("image") ? <span style={{ fontSize: "2.25rem" }}>🖼️</span> : <span style={{ fontSize: "2.25rem" }}>📄</span>}
        {e.submitter_role && (
          <span style={{ position: "absolute", top: "6px", left: "6px", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "white", color: ROLE_COLOR[e.submitter_role] || "var(--ink-soft)", border: `1px solid ${ROLE_COLOR[e.submitter_role] || "var(--rule)"}` }}>
            {e.submitter_role.toUpperCase()}
          </span>
        )}
        {e.revealed_count === 0 && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(253,251,247,0.85)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", color: "var(--pending)" }}>SEALED</span>
            <button style={{ background: "var(--steel)", border: "none", color: "white", padding: "0.3rem 0.7rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600 }} onClick={reveal}>
              Reveal (logs access)
            </button>
          </div>
        )}
      </div>
      <div style={{ padding: "0.9rem" }}>
        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.2rem" }}>{e.filename}</div>
        <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-faint)", marginBottom: "0.6rem" }}>{e.sha256.substring(0, 16)}…</div>

        {/* Two-score model — integrity and authenticity never merge into one number */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--ink-soft)", fontWeight: 600 }}>INTEGRITY</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.03em", padding: "0.12rem 0.4rem", borderRadius: "4px", background: e.integrity_ok ? "var(--verified-bg)" : "var(--rejected-bg)", color: e.integrity_ok ? "var(--verified)" : "var(--rejected)" }}>
              {e.integrity_ok ? "✓ VERIFIED" : "✕ FAILED"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--ink-soft)", fontWeight: 600 }}>AUTHENTICITY</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.03em", padding: "0.12rem 0.4rem", borderRadius: "4px", background: indicators.length ? "var(--pending-bg)" : "rgba(11,27,54,0.05)", color: indicators.length ? "var(--pending)" : "var(--text-faint)" }}>
              {indicators.length ? `${indicators.length} indicator${indicators.length > 1 ? "s" : ""}` : "none noted"}
            </span>
          </div>
        </div>

        {indicators.length > 0 && (
          <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {indicators.map((ind, i) => (
              <div key={i} style={{ fontSize: "0.68rem", color: "var(--ink-soft)", background: "var(--card)", border: "1px solid var(--rule)", borderRadius: "4px", padding: "0.4rem 0.5rem" }}>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>· {ind.detail}</div>
                <div style={{ fontStyle: "italic", color: "var(--text-faint)", marginTop: "0.15rem" }}>{ind.caveat}</div>
              </div>
            ))}
          </div>
        )}

        {e.revealed_count > 0 && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.68rem", color: "var(--ink-soft)" }}>👁️ revealed {e.revealed_count}×</div>
        )}
      </div>
    </div>
  );
}
