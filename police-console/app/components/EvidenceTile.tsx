"use client";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:47802` : "http://localhost:47802");

interface Indicator {
  kind: string;
  detail: string;
  caveat: string;
  severity: string;
}

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
    <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* File Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.5rem" }}>
            {e.mime_type?.startsWith("image") ? "🖼️" : "📄"}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--gray-900)", wordBreak: "break-all" }}>
              {e.filename}
            </div>
            <div style={{ fontSize: "0.6875rem", color: "var(--gray-500)" }}>
              {e.mime_type || "application/octet-stream"}
            </div>
          </div>
        </div>

        {e.submitter_role && (
          <span className={`badge ${e.submitter_role === "complainant" ? "badge-info" : "badge-gold"}`}>
            {e.submitter_role.toUpperCase()}
          </span>
        )}
      </div>

      {/* SHA-256 Digest */}
      <div className="hash" style={{ background: "var(--gray-50)", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "var(--border)", marginBottom: "12px" }}>
        SHA-256: {e.sha256?.substring(0, 24)}...
      </div>

      {/* Two-Score Model */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
        {/* 1. Integrity Score */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: e.integrity_ok ? "var(--success-bg)" : "var(--danger-bg)", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${e.integrity_ok ? "var(--success-border)" : "var(--danger-border)"}` }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-900)" }}>INTEGRITY</span>
          <span style={{ fontSize: "0.6875rem", fontWeight: 900, color: e.integrity_ok ? "var(--success)" : "var(--danger)" }}>
            {e.integrity_ok ? "✓ VERIFIED (UNTOUCHED)" : "✕ FAILED SEAL"}
          </span>
        </div>

        {/* 2. Authenticity Score */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: indicators.length > 0 ? "var(--warning-bg)" : "var(--gray-100)", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${indicators.length > 0 ? "var(--warning-border)" : "var(--gray-200)"}` }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-900)" }}>AUTHENTICITY</span>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: indicators.length > 0 ? "var(--warning)" : "var(--gray-600)" }}>
            {indicators.length > 0 ? `⚠️ ${indicators.length} Indicator(s)` : "None Flagged"}
          </span>
        </div>
      </div>

      {/* Authenticity Indicators Breakdown */}
      {indicators.length > 0 && (
        <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {indicators.map((ind, idx) => (
            <div key={idx} style={{ background: "var(--gray-50)", border: "var(--border)", padding: "6px 8px", borderRadius: "var(--radius-sm)", fontSize: "0.6875rem" }}>
              <strong style={{ color: "var(--gray-900)" }}>&bull; {ind.detail}</strong>
              <div style={{ fontStyle: "italic", color: "var(--gray-500)", marginTop: "2px" }}>
                Caveat: {ind.caveat}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reveal Action / Custody Log */}
      <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.6875rem", color: "var(--gray-500)" }}>
          {e.revealed_count > 0 ? `👁️ Viewed ${e.revealed_count}×` : "🔒 Unrevealed Payload"}
        </span>

        {e.revealed_count === 0 ? (
          <button className="btn btn-secondary btn-sm" onClick={reveal}>
            Reveal (Logs Access)
          </button>
        ) : (
          <span className="badge badge-neutral">Audited</span>
        )}
      </div>
    </div>
  );
}
