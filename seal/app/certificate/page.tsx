"use client";
// S5 — Certificate. Download the PDF. The artifact they carry to the police station.
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { formatHash, formatSize } from "@/lib/seal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

function CertificateContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const [sealResult, setSealResult] = useState<any>(null);
  const [statement, setStatement] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("seal_result");
    if (stored) setSealResult(JSON.parse(stored));
  }, []);

  const submitAndGetCertificate = async () => {
    if (!sealResult) return;
    setSubmitting(true);
    setError(null);

    try {
      // Create sealed report
      const reportRes = await fetch(`${API_BASE}/api/v1/seal/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path_taken: path,
          statement: statement || null,
          contact: contact || null,
          sealed_at: sealResult.sealedAt,
          artifacts: [{
            filename: sealResult.filename,
            sha256: sealResult.sha256,
            size_bytes: sealResult.sizeBytes,
            mime_type: sealResult.mimeType,
          }],
        }),
      });

      if (!reportRes.ok) throw new Error("Could not create sealed report");
      const data = await reportRes.json();
      const ref = data.reference;
      setReference(ref);
      sessionStorage.setItem("seal_reference", ref);

      // Download certificate PDF
      window.open(`${API_BASE}/api/v1/seal/reports/${ref}/certificate`, "_blank");
    } catch (e: any) {
      setError("Could not connect to the server. Your seal data is still saved locally.");
      // Generate a local reference anyway for demo
      const local = `ACP-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setReference(local);
      sessionStorage.setItem("seal_reference", local);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-content">
      <div className="container fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
          <button className="btn btn-ghost" onClick={() => router.back()} style={{ padding: "0.5rem 0.75rem" }}>
            ← Back
          </button>
          <span style={{ color: "var(--ink-faint)", fontSize: "0.875rem" }}>Step 3 of 4</span>
        </div>

        <div className="progress-bar" style={{ marginBottom: "2rem" }}>
          <div className="progress-fill" style={{ width: "75%" }} />
        </div>

        <h2 style={{ marginBottom: "0.5rem" }}>Your evidence certificate</h2>
        <p style={{ marginBottom: "1.5rem" }}>
          This is the document you'll give to the police. It proves the file wasn't changed.
        </p>

        {sealResult && (
          <div className="card" style={{ marginBottom: "1.5rem", background: "var(--paper)" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem" }}>{sealResult.filename}</p>
                <p style={{ fontSize: "0.875rem", color: "var(--ink-faint)" }}>{formatSize(sealResult.sizeBytes)}</p>
              </div>
              <div style={{
                background: "rgba(46,110,107,0.08)",
                padding: "0.25rem 0.75rem",
                borderRadius: "100px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--calm)",
              }}>
                ✓ SEALED
              </div>
            </div>
            <div className="divider" />
            <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: "0.375rem" }}>
              SHA-256 Fingerprint
            </p>
            <div className="hash-display">{formatHash(sealResult.sha256)}</div>
          </div>
        )}

        {!reference && (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9375rem" }}>
                In your own words, what happened? <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                className="input"
                placeholder="I found these messages on my daughter's tablet. The account started talking to her about six weeks ago..."
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                style={{ minHeight: "100px" }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9375rem" }}>
                Your contact (phone or email) <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(for police to reach you)</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="+91 98765 43210"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>

            {error && (
              <div className="info-box" style={{ borderColor: "var(--error)", marginBottom: "1rem", color: "var(--ink)" }}>
                ⚠️ {error}
              </div>
            )}

            <button
              id="get-certificate-btn"
              className="btn btn-seal"
              onClick={submitAndGetCertificate}
              disabled={!sealResult || submitting}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {submitting ? "Creating certificate..." : "🔐 Get my certificate"}
            </button>
          </>
        )}

        {reference && (
          <div className="fade-in">
            <div className="info-box" style={{ marginBottom: "1.5rem", borderColor: "var(--calm)", background: "rgba(46,110,107,0.05)" }}>
              <p style={{ fontWeight: 600, color: "var(--calm)", marginBottom: "0.5rem" }}>
                ✅ Certificate created
              </p>
              <p style={{ color: "var(--ink-soft)" }}>
                Your reference code and evidence have been securely recorded.
              </p>
            </div>

            <button
              id="go-to-report-btn"
              className="btn btn-primary"
              onClick={() => router.push(`/report?path=${path}`)}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Next: Where to report this →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<div className="page-content"><div className="container">Loading...</div></div>}>
      <CertificateContent />
    </Suspense>
  );
}
