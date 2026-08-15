"use client";
import { useEffect, useState } from "react";
import { sealFile, formatHash, type SealResult } from "@/lib/seal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:48802` : "http://localhost:48802");

export default function PairPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<"loading" | "ready" | "expired" | "error">("loading");
  const [caseReference, setCaseReference] = useState<string | null>(null);
  const [sealed, setSealed] = useState<SealResult[]>([]);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/pair/${params.token}`)
      .then((res) => {
        if (res.status === 410) { setStatus("expired"); return null; }
        if (!res.ok) { setStatus("error"); return null; }
        return res.json();
      })
      .then((data) => {
        if (data) { setCaseReference(data.case_reference); setStatus("ready"); }
      })
      .catch(() => setStatus("error"));
  }, [params.token]);

  const handleFile = async (f: File) => {
    setSealing(true);
    try {
      const sealedRes = await sealFile(f);
      setSealed((prev) => [...prev, sealedRes]);
    } catch (err: any) {
      alert(err.message || "Failed to fingerprint file.");
    } finally {
      setSealing(false);
    }
  };

  const send = async () => {
    if (sealed.length === 0) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/pair/${params.token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifacts: sealed.map((s) => ({
            filename: s.filename,
            sha256: s.sha256,
            size_bytes: s.sizeBytes,
            mime_type: s.mimeType,
          })),
        }),
      });
      if (res.ok) {
        setSentCount((c) => c + sealed.length);
        setSealed([]);
      }
    } finally {
      setSending(false);
    }
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)", padding: "20px" }}>
        <div className="card" style={{ maxWidth: "420px", textAlign: "center" }}>
          <p>Verifying secure pairing session...</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)", padding: "20px" }}>
        <div className="card" style={{ maxWidth: "420px", textAlign: "center" }}>
          <h2 style={{ color: "var(--danger)", marginBottom: "8px" }}>Pairing Session Expired</h2>
          <p>This QR session has timed out. Please request a new pairing QR code from the investigator.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-app)", padding: "20px" }}>
        <div className="card" style={{ maxWidth: "420px", textAlign: "center" }}>
          <h2 style={{ color: "var(--danger)", marginBottom: "8px" }}>Invalid QR Session</h2>
          <p>Pairing link not found or invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px" }}>
      <div style={{ maxWidth: "460px", width: "100%" }}>
        {/* Header */}
        <div className="card card-gold-accent" style={{ marginBottom: "20px", textAlign: "center" }}>
          <img src="/logo.png" alt="VERITAS Logo" style={{ height: "40px", margin: "0 auto 12px", display: "block" }} />
          <span className="badge badge-gold" style={{ marginBottom: "8px" }}>Direct Device Sealing</span>
          <h1 style={{ fontSize: "1.35rem", color: "var(--primary)", marginBottom: "4px" }}>
            Paired to Case {caseReference}
          </h1>
          <p style={{ fontSize: "0.8125rem", margin: 0 }}>
            Files are fingerprinted in memory on this device. Only cryptographic hashes are sent to the case ledger.
          </p>
        </div>

        {/* Upload Action */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div
            onClick={() => document.getElementById("pair-file-input")?.click()}
            style={{
              border: "2px dashed var(--secondary)",
              borderRadius: "var(--radius-sm)",
              padding: "32px 16px",
              textAlign: "center",
              cursor: "pointer",
              background: "var(--secondary-light)",
            }}
          >
            <input
              id="pair-file-input"
              type="file"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📱</div>
            <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9375rem" }}>
              Tap to select photo or evidence file
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", marginTop: "4px" }}>
              No cables or software installation required
            </div>
          </div>
        </div>

        {sealed.length > 0 && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "0.875rem" }}>
              Sealed Files ({sealed.length}):
            </div>
            {sealed.map((s, i) => (
              <div key={i} style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px", marginBottom: "8px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--gray-900)" }}>{s.filename}</div>
                <div className="mono" style={{ fontSize: "0.6875rem", color: "var(--gray-600)" }}>
                  {formatHash(s.sha256).slice(0, 32)}...
                </div>
              </div>
            ))}
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={send}
              disabled={sending}
            >
              {sending ? "Transmitting Hashes..." : `Transmit ${sealed.length} Hash${sealed.length !== 1 ? "es" : ""} to Case Ledger →`}
            </button>
          </div>
        )}

        {sentCount > 0 && (
          <div className="alert alert-success" style={{ textAlign: "center" }}>
            ✓ <strong>{sentCount} evidence artifact{sentCount !== 1 ? "s" : ""}</strong> successfully recorded into Case {caseReference}. You may add more or close this tab.
          </div>
        )}
      </div>
    </div>
  );
}
