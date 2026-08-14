"use client";
import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { sealFile, formatHash, formatSize, type SealResult } from "@/lib/seal";
import GovLayout from "../components/GovLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:47802` : "http://localhost:47802");

type Step = "code" | "seal" | "statement" | "done";

function DisputeContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<{ role: string; scope_summary: string; case_reference: string; already_submitted: boolean } | null>(null);

  const [sealing, setSealing] = useState(false);
  const [results, setResults] = useState<SealResult[]>([]);
  const [statement, setStatement] = useState("");
  const [contact, setContact] = useState("");
  const [claimedWhen, setClaimedWhen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const checkCode = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/disputes/${code.trim().toUpperCase()}`);
      if (!res.ok) throw new Error("No registered dispute matches this code. Please verify the code from your official notification.");
      const data = await res.json();
      setScope(data);
      setStep(data.already_submitted ? "done" : "seal");
    } catch (e: any) {
      setError(e.message || "Failed to verify dispute code.");
    } finally {
      setChecking(false);
    }
  };

  const handleFile = async (f: File) => {
    setSealing(true);
    const sealed = await sealFile(f);
    setResults((r) => [...r, sealed]);
    setSealing(false);
  };

  const submitDispute = async () => {
    if (results.length === 0 || !scope) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/disputes/${code.trim().toUpperCase()}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: statement || null,
          contact: contact || null,
          sealed_at: new Date().toISOString(),
          claimed_when: claimedWhen ? new Date(claimedWhen).toISOString() : null,
          artifacts: results.map((r) => ({
            filename: r.filename,
            sha256: r.sha256,
            size_bytes: r.sizeBytes,
            mime_type: r.mimeType,
          })),
        }),
      });
      if (!res.ok) throw new Error("Submission could not be locked in. Please retry.");
      const data = await res.json();
      setReference(data.reference);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GovLayout>
      <div className="container-form" style={{ padding: "40px var(--space-6)" }}>
        <div className="card card-gold-accent">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span className="badge badge-gold">Blind Dual Submission Portal</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>Section 63 BSA Compliant</span>
          </div>

          {step === "code" && (
            <div>
              <h1 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "8px" }}>
                Enter Your Dispute Verification Code
              </h1>
              <p style={{ marginBottom: "20px" }}>
                You should have received this verification code via official SMS, email, or formal notice from the investigating authority.
              </p>

              <div className="form-group">
                <label htmlFor="dispute-code-input" className="form-label">
                  Verification Code <span className="required">*</span>
                </label>
                <input
                  id="dispute-code-input"
                  className="input mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FAIR-7K4M-2X9P"
                  style={{ fontSize: "1.125rem", fontWeight: 700, letterSpacing: "0.08em" }}
                  onKeyDown={(e) => e.key === "Enter" && checkCode()}
                  autoFocus
                />
              </div>

              {error && (
                <div className="alert alert-danger">
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={checkCode}
                disabled={checking || !code.trim()}
              >
                {checking ? "Verifying Code..." : "Verify Code & View Case Scope →"}
              </button>
            </div>
          )}

          {step === "seal" && scope && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span className="badge badge-info">Role: {scope.role.toUpperCase()}</span>
                <span className="mono" style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>
                  Case Ref: {scope.case_reference}
                </span>
              </div>

              <h2 style={{ fontSize: "1.35rem", color: "var(--primary)", marginBottom: "12px" }}>
                Case Scope & Legal Protections
              </h2>

              <div className="alert alert-info" style={{ marginBottom: "20px" }}>
                <strong>Case Scope Summary:</strong>
                <p style={{ margin: "4px 0 0", color: "var(--primary)", fontWeight: 700 }}>
                  {scope.scope_summary}
                </p>
              </div>

              <div style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "16px 20px", marginBottom: "20px" }}>
                <strong style={{ display: "block", color: "var(--gray-900)", marginBottom: "8px", fontSize: "0.875rem" }}>
                  Statutory Dual-Blind Protections:
                </strong>
                <ul style={{ paddingLeft: "18px", fontSize: "0.8125rem", color: "var(--gray-600)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>You will <strong>not</strong> see the other party's evidence, and they will not see yours.</li>
                  <li>You are <strong>not required</strong> to submit any files or statements.</li>
                  <li>Declining to submit evidence is <strong>not evidence</strong> of culpability or liability.</li>
                </ul>
              </div>

              <div
                onClick={() => document.getElementById("dispute-file-input")?.click()}
                onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  border: "2px dashed var(--gray-300)",
                  borderRadius: "var(--radius-md)",
                  padding: "30px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "var(--white)",
                  marginBottom: "16px",
                }}
              >
                <input
                  id="dispute-file-input"
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div style={{ fontSize: "2rem", marginBottom: "6px" }}>🛡️</div>
                <div style={{ fontWeight: 700, color: "var(--gray-900)" }}>
                  {sealing ? "Fingerprinting file..." : "Click or drop file to seal into dispute"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", marginTop: "2px" }}>
                  Chat history, location records, timestamps, receipts, or photos
                </div>
              </div>

              {results.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <label className="form-label">Sealed Artifacts ({results.length}):</label>
                  {results.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", marginBottom: "6px" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--gray-900)", fontSize: "0.875rem" }}>{r.filename}</div>
                        <div className="mono" style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>
                          {formatHash(r.sha256).slice(0, 36)}... &bull; {formatSize(r.sizeBytes)}
                        </div>
                      </div>
                      <span className="badge badge-success">✓ Fingerprinted</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={() => setStep("statement")}
                disabled={results.length === 0}
                style={{ marginBottom: "10px" }}
              >
                Continue with {results.length} Sealed File{results.length !== 1 ? "s" : ""} →
              </button>
              <button
                className="btn btn-ghost btn-block"
                onClick={() => setStep("statement")}
              >
                Submit statement without uploading files →
              </button>
            </div>
          )}

          {step === "statement" && scope && (
            <div>
              <h2 style={{ fontSize: "1.35rem", color: "var(--primary)", marginBottom: "8px" }}>
                Your Narrative & Context
              </h2>
              <p style={{ marginBottom: "20px" }}>
                Provide your written account. This will be cryptographically locked alongside your evidence.
              </p>

              <div className="form-group">
                <label className="form-label">Written Statement</label>
                <textarea
                  className="input"
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Provide your account of the timeline, interactions, or context..."
                  style={{ minHeight: "120px" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">When did this interaction/event occur?</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={claimedWhen}
                  onChange={(e) => setClaimedWhen(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Details (Optional)</label>
                <input
                  className="input"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+91 98765 43210 or email"
                />
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={submitDispute}
                disabled={submitting}
              >
                {submitting ? "Locking in Evidence..." : "Cryptographically Lock Submission →"}
              </button>
            </div>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "var(--success)", color: "var(--white)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: "1.75rem", fontWeight: 700
              }}>
                ✓
              </div>

              {reference ? (
                <div>
                  <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "8px" }}>
                    Submission Successfully Locked
                  </h2>
                  <p style={{ marginBottom: "20px" }}>
                    Your evidence and statement have been cryptographically registered into the case ledger under dual-blind protection.
                  </p>
                  <div className="reference-banner">
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase" }}>
                      Submission Reference
                    </div>
                    <div className="reference-value">{reference}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "8px" }}>
                    Already Submitted
                  </h2>
                  <p style={{ marginBottom: "20px" }}>
                    This dispute code has already completed its cryptographic submission.
                  </p>
                </div>
              )}

              <button className="btn btn-primary" onClick={() => router.push("/")} style={{ minWidth: "160px" }}>
                Return to Homepage
              </button>
            </div>
          )}
        </div>
      </div>
    </GovLayout>
  );
}

export default function DisputePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px 0" }}>Loading dispute portal...</div>}>
      <DisputeContent />
    </Suspense>
  );
}
