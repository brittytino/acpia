"use client";
import { useState } from "react";
import QRCode from "react-qr-code";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:47802` : "http://localhost:47802");

export function PairPanel({ caseId }: { caseId: string }) {
  const [pairing, setPairing] = useState<{ url: string; expires_in: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const createPairing = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/cases/${caseId}/pair`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPairing(await res.json());
    } finally {
      setLoading(false);
    }
  };

  if (!pairing) {
    return (
      <div className="premium-glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
        <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.5rem" }}>📱 Add evidence from a phone</div>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginBottom: "1rem" }}>
          No cable, no account. Scan a QR code and seal directly from the device, live.
        </p>
        <button onClick={createPairing} disabled={loading}
          style={{ background: "var(--steel)", border: "none", color: "white", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600 }}>
          {loading ? "Generating..." : "Generate QR code"}
        </button>
      </div>
    );
  }

  return (
    <div className="premium-glass-card" style={{ padding: "1.5rem", textAlign: "center" }}>
      <div style={{ display: "inline-block", background: "white", padding: "0.75rem", borderRadius: "var(--radius-sm)", marginBottom: "0.75rem" }}>
        <QRCode value={pairing.url} size={160} />
      </div>
      <p className="mono" style={{ fontSize: "0.7rem", color: "var(--text-faint)", wordBreak: "break-all" }}>{pairing.url}</p>
      <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: "0.5rem" }}>
        Expires in {Math.round(pairing.expires_in / 60)} minutes
      </p>
      <button onClick={() => setPairing(null)} style={{ marginTop: "0.75rem", background: "transparent", border: "1px solid var(--rule)", color: "var(--ink-soft)", padding: "0.4rem 0.9rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.8rem" }}>
        New code
      </button>
    </div>
  );
}
