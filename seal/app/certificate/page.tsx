"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { formatHash, formatSize } from "@/lib/seal";
import GovLayout from "../components/GovLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:48802` : "http://localhost:48802");

function CertificateContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const [sealResult, setSealResult] = useState<any>(null);
  const [statement, setStatement] = useState("");
  const [complainantEmail, setComplainantEmail] = useState("");
  const [accusedEmail, setAccusedEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [fairCaseRef, setFairCaseRef] = useState<string | null>(null);
  const [respondentCode, setRespondentCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("seal_result");
    if (stored) setSealResult(JSON.parse(stored));
  }, []);

  const validateEmail = (email: string) => {
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const submitAndGetCertificate = async () => {
    if (!sealResult) return;

    if (!validateEmail(complainantEmail)) {
      setError("Please enter a valid email address for your contact.");
      return;
    }
    if (!validateEmail(accusedEmail)) {
      setError("Please enter a valid email address for the accused person.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reportRes = await fetch(`${API_BASE}/api/v1/seal/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path_taken: path,
          statement: statement || null,
          complainant_email: complainantEmail || null,
          accused_email: accusedEmail || null,
          sealed_at: sealResult.sealedAt,
          artifacts: [{
            filename: sealResult.filename,
            sha256: sealResult.sha256,
            size_bytes: sealResult.sizeBytes,
            mime_type: sealResult.mimeType,
          }],
        }),
      });

      if (!reportRes.ok) {
        const errData = await reportRes.json().catch(() => ({}));
        throw new Error(errData?.detail || `Server error: ${reportRes.status}`);
      }

      const data = await reportRes.json();
      const ref = data.reference;
      setReference(ref);
      setFairCaseRef(data.fair_case_reference || null);
      setRespondentCode(data.respondent_code || null);
      sessionStorage.setItem("seal_reference", ref);

      // Download certificate PDF in background
      window.open(`${API_BASE}/api/v1/seal/reports/${ref}/certificate`, "_blank");
    } catch (e: any) {
      setError(e.message || "Failed to submit to server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GovLayout>
      <div className="container-form" style={{ padding: "40px var(--space-6)" }}>
        {/* Step Tracker */}
        <div className="step-tracker">
          <div className="step-item completed">
            <div className="step-circle">✓</div>
            <span>Situation</span>
          </div>
          <div className="step-line completed" />
          <div className="step-item completed">
            <div className="step-circle">✓</div>
            <span>Preserve</span>
          </div>
          <div className="step-line completed" />
          <div className="step-item completed">
            <div className="step-circle">✓</div>
            <span>Digital Fingerprint</span>
          </div>
          <div className="step-line completed" />
          <div className="step-item active">
            <div className="step-circle">4</div>
            <span>Certificate</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
            <button className="btn btn-ghost" onClick={() => router.back()}>
              ← Back
            </button>
            <span className="badge badge-gold">Step 4 of 4</span>
          </div>

          <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "8px" }}>
            Finalize Your Evidence Certificate
          </h2>
          <p style={{ marginBottom: "24px" }}>
            Provide your email and an optional statement. Your evidence will be cryptographically sealed and you'll receive a confirmation email.
          </p>

          {sealResult && (
            <div style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "16px 20px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <strong style={{ wordBreak: "break-all" }}>{sealResult.filename}</strong>
                <span className="badge badge-success">✓ Cryptographically Fingerprinted</span>
              </div>
              <div className="mono" style={{ fontSize: "0.75rem", color: "var(--gray-600)", wordBreak: "break-all" }}>
                SHA-256: {formatHash(sealResult.sha256).slice(0, 48)}...
              </div>
            </div>
          )}

          {!reference ? (
            <div>
              <div className="form-group">
                <label className="form-label">
                  Your Statement / Incident Summary
                  <span className="optional">(Optional)</span>
                </label>
                <textarea
                  className="input"
                  placeholder="Describe what occurred, dates, platform usernames, or any relevant context for investigators..."
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                />
                <div className="form-help">
                  This narrative will be bound into the official BSA §63 digital certificate.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Your Email Address <span style={{ color: "var(--danger)", fontWeight: 700 }}>*</span>
                </label>
                <input
                  type="email"
                  id="complainant-email"
                  className="input"
                  placeholder="your.email@example.com"
                  value={complainantEmail}
                  onChange={(e) => setComplainantEmail(e.target.value)}
                  autoComplete="email"
                />
                <div className="form-help">
                  You will receive your official reference code and case summary at this address.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Accused Person's Email Address
                  <span className="optional">(Optional)</span>
                </label>
                <input
                  type="email"
                  id="accused-email"
                  className="input"
                  placeholder="accused.person@example.com"
                  value={accusedEmail}
                  onChange={(e) => setAccusedEmail(e.target.value)}
                />
                <div className="form-help">
                  If provided, the accused will be automatically notified with a secure link to submit their side of the evidence. A formal case will be opened.
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: "20px" }}>
                  ⚠ {error}
                </div>
              )}

              <button
                id="get-certificate-btn"
                className="btn btn-primary btn-block btn-lg"
                disabled={!sealResult || submitting}
                onClick={submitAndGetCertificate}
              >
                {submitting ? "Generating Vault Certificate..." : "Generate Official Certificate & Reference Code →"}
              </button>
            </div>
          ) : (
            <div>
              <div className="alert alert-success" style={{ marginBottom: "24px" }}>
                <strong>Vault Certificate Created & Evidence Sealed Successfully.</strong>
                <br />
                Your submission is registered in the cryptographic chain of custody.
                {complainantEmail && <><br />A confirmation email has been sent to <strong>{complainantEmail}</strong>.</>}
              </div>

              <div className="reference-banner">
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-600)", marginBottom: "6px" }}>
                  Your Official Reference Code
                </div>
                <div className="reference-value">{reference}</div>
                <p style={{ fontSize: "0.8125rem", color: "var(--gray-600)", marginTop: "8px", marginBottom: 0 }}>
                  Keep this reference code secure. You will provide it to police officers or Childline.
                </p>
              </div>

              {fairCaseRef && respondentCode && (
                <div className="alert alert-info" style={{ marginTop: "20px" }}>
                  <strong>📋 Case Formally Opened: {fairCaseRef}</strong>
                  <br />
                  The accused has been notified via email with their dispute portal link.
                  {accusedEmail && <> An email was sent to <strong>{accusedEmail}</strong>.</>}
                </div>
              )}

              <button
                id="go-to-report-btn"
                className="btn btn-gold btn-block btn-lg"
                style={{ marginTop: "20px" }}
                onClick={() => router.push(`/report?path=${path}`)}
              >
                Proceed to Emergency & Police Reporting Channels →
              </button>
            </div>
          )}
        </div>
      </div>
    </GovLayout>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px 0" }}>Loading certificate...</div>}>
      <CertificateContent />
    </Suspense>
  );
}
