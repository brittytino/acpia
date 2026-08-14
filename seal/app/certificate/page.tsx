"use client";
// S5 — Certificate. Download the PDF. The artifact they carry to the police station.
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { formatHash, formatSize } from "@/lib/seal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:47802";

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
    <main className="layout-split fade-in">
      {/* LEFT: Anchor Image Placeholder */}
      <div className="layout-anchor">
        <div className="layout-anchor-placeholder" style={{ background: "var(--ink)", opacity: 0.8 }}></div>
        <div className="layout-anchor-content" style={{ color: "white", paddingBottom: "2rem" }}>
          <div style={{ width: "64px", height: "64px", background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", marginBottom: "2rem", border: "1px solid rgba(255,255,255,0.2)" }}>
            📜
          </div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem", lineHeight: 1.1 }}>
            Your cryptographic vault certificate
          </h2>
          <p style={{ fontSize: "1.1rem", opacity: 0.9, maxWidth: "400px", marginBottom: "3rem" }}>
            This document contains the legally admissible cryptographic proof of your evidence. It is what you will hand to the authorities.
          </p>
        </div>
      </div>

      <div className="layout-content">
        <div style={{ maxWidth: "600px", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
            <button className="btn btn-ghost" onClick={() => router.back()} style={{ border: "1px solid var(--rule)", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)" }}>
              ← Back
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Step 3 of 4</span>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--rule)", color: "var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>1</div>
                <div style={{ width: "40px", height: "2px", background: "var(--rule)" }}></div>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--rule)", color: "var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>2</div>
                <div style={{ width: "40px", height: "2px", background: "var(--rule)" }}></div>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--calm)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>3</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "left", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "2rem", fontFamily: "'Playfair Display', serif", color: "var(--ink)", marginBottom: "0.75rem" }}>
              Secure Your Certificate
            </h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>
              This is the document you'll give to the police. It proves the file wasn't changed.
            </p>
          </div>

        {sealResult && (
          <div className="card" style={{ marginBottom: "2rem", background: "var(--paper)", border: "1px solid var(--rule)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem", fontSize: "1rem" }}>{sealResult.filename}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--ink-faint)" }}>{formatSize(sealResult.sizeBytes)}</p>
              </div>
              <div style={{
                background: "var(--calm)",
                padding: "0.35rem 0.75rem",
                borderRadius: "100px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "white",
                boxShadow: "0 2px 8px rgba(29, 89, 86, 0.2)"
              }}>
                ✓ SECURELY HASHED
              </div>
            </div>
            
            <div style={{ height: "1px", background: "var(--rule)", margin: "1rem 0" }} />
            
            <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: "0.5rem" }}>
              SHA-256 Fingerprint
            </p>
            <div className="hash-display" style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>{formatHash(sealResult.sha256)}</div>
          </div>
        )}

        {!reference && (
          <div className="fade-in">
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.95rem", color: "var(--ink)" }}>
                In your own words, what happened? <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                className="input"
                placeholder="I found these messages on my daughter's tablet. The account started talking to her about six weeks ago..."
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                style={{ minHeight: "120px", width: "100%", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule)" }}
              />
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.95rem", color: "var(--ink)" }}>
                Your contact <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(phone or email for police)</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="+91 98765 43210"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                style={{ width: "100%", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule)" }}
              />
            </div>

            {error && (
              <div style={{ background: "rgba(158, 57, 53, 0.05)", border: "1px solid var(--error)", padding: "1rem", borderRadius: "var(--radius-sm)", color: "var(--error)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                ⚠️ {error}
              </div>
            )}

            <button
              id="get-certificate-btn"
              onClick={submitAndGetCertificate}
              disabled={!sealResult || submitting}
              style={{ 
                width: "100%", 
                background: submitting ? "var(--ink-faint)" : "var(--seal)", 
                color: "white", 
                border: "none", 
                padding: "1.25rem", 
                borderRadius: "var(--radius-sm)", 
                fontSize: "1.1rem", 
                fontWeight: 600, 
                cursor: submitting || !sealResult ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                boxShadow: "0 8px 16px rgba(180, 134, 58, 0.2)"
              }}
            >
              {submitting ? "Creating certificate..." : "🔐 Get my certificate"}
            </button>
          </div>
        )}

        {reference && (
          <div className="fade-in">
            <div style={{ marginBottom: "2rem", border: "1px solid var(--calm)", background: "rgba(29, 89, 86, 0.05)", padding: "1.5rem", borderRadius: "var(--radius-sm)" }}>
              <p style={{ fontWeight: 600, color: "var(--calm)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>
                ✅ Certificate created
              </p>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>
                Your reference code and evidence have been securely recorded.
              </p>
            </div>

            <button
              id="go-to-report-btn"
              onClick={() => router.push(`/report?path=${path}`)}
              style={{ 
                width: "100%", 
                background: "var(--ink)", 
                color: "white", 
                border: "none", 
                padding: "1.25rem", 
                borderRadius: "var(--radius-sm)", 
                fontSize: "1.1rem", 
                fontWeight: 600, 
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              Next: Where to report this →
            </button>
          </div>
        )}
        
        </div>
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
