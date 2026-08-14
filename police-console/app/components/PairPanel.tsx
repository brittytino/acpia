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
      <div className="card" style={{ textAlign: "center", padding: "20px" }}>
        <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9375rem", marginBottom: "4px" }}>
          📱 Direct Mobile Device Sealing
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--gray-600)", marginBottom: "16px" }}>
          Generate a time-limited pairing session. Complainants or officers scan to hash evidence directly on mobile without cables.
        </p>
        <button
          className="btn btn-secondary btn-block btn-sm"
          onClick={createPairing}
          disabled={loading}
        >
          {loading ? "Generating Session..." : "Generate Pairing QR Code"}
        </button>
      </div>
    );
  }

  return (
    <div className="card card-gold-accent" style={{ textAlign: "center", padding: "20px" }}>
      <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.875rem", marginBottom: "12px" }}>
        Scan with Mobile Camera
      </div>
      <div style={{ display: "inline-block", background: "white", padding: "12px", borderRadius: "var(--radius-sm)", border: "var(--border)", marginBottom: "12px" }}>
        <QRCode value={pairing.url} size={150} />
      </div>
      <p className="mono" style={{ fontSize: "0.6875rem", color: "var(--gray-500)", wordBreak: "break-all", marginBottom: "6px" }}>
        {pairing.url}
      </p>
      <div className="badge badge-warning" style={{ fontSize: "0.6875rem", marginBottom: "12px" }}>
        Session Expires in {Math.round(pairing.expires_in / 60)} min
      </div>
      <div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPairing(null)}
        >
          Close / New QR Code
        </button>
      </div>
    </div>
  );
}
