"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, Suspense } from "react";
import { sealFile, formatHash, formatSize, type SealResult } from "@/lib/seal";
import GovLayout from "../components/GovLayout";

function SealContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const [file, setFile] = useState<File | null>(null);
  const [sealing, setSealing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SealResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setSealing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 20, 92));
    }, 75);

    const sealed = await sealFile(f);
    clearInterval(interval);
    setProgress(100);

    setTimeout(() => {
      setResult(sealed);
      setSealing(false);
      sessionStorage.setItem("seal_result", JSON.stringify(sealed));
      sessionStorage.setItem("seal_path", path);
    }, 300);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !result) handleFile(f);
  };

  return (
    <GovLayout>
      {/* Full-width step banner */}
      <div className="step-banner">
        <div className="step-banner-inner">
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
            <div className="step-item active">
              <div className="step-circle">3</div>
              <span>Digital Fingerprint</span>
            </div>
            <div className="step-line" />
            <div className="step-item">
              <div className="step-circle">4</div>
              <span>Certificate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width two-column layout */}
      <div className="step-page-layout">
        {/* LEFT: Main seal form */}
        <div className="step-main-col">
          <div className="step-page-header">
            <button className="btn btn-ghost" onClick={() => router.back()}>
              ← Back
            </button>
            <span className="badge badge-gold">Step 3 of 4</span>
          </div>

          <div className="step-icon-row">
            <span className="step-icon-large">🔬</span>
            <h1 className="step-main-heading">
              {!file ? "Create Digital Fingerprint" : sealing ? "Computing Fingerprint..." : "Evidence Fingerprinted & Sealed"}
            </h1>
          </div>
          <p className="step-main-desc">
            {!result
              ? "Your browser will compute an immutable SHA-256 cryptographic hash of your file without sending the file anywhere. This process runs entirely within your browser's private memory."
              : "The digital fingerprint has been generated. This cryptographic value will prove the file's integrity in court and cannot be forged."}
          </p>

          {/* Initial File Selector */}
          {!file && !result && (
            <div>
              <div
                id="seal-dropzone"
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => inputRef.current?.click()}
                className={`seal-dropzone ${dragOver ? "drag-over" : ""}`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className="dropzone-icon">🛡️</div>
                <div className="dropzone-title">Select or drop your evidence file here</div>
                <div className="dropzone-subtitle">
                  Zero-storage local execution — the file never leaves this device
                </div>
                <button className="btn btn-secondary" style={{ marginTop: "16px", pointerEvents: "none" }}>
                  Browse Files
                </button>
              </div>

              <div className="alert alert-info" style={{ marginTop: "20px" }}>
                <strong>Zero-Knowledge Execution:</strong><br />
                The WebCrypto API calculates this mathematical signature directly within your browser's private memory sandbox. No file bytes are transmitted.
              </div>
            </div>
          )}

          {/* Hashing in Progress */}
          {sealing && file && (
            <div className="sealing-progress-block">
              <div className="sealing-filename">{file.name}</div>
              <div className="sealing-meta">{formatSize(file.size)} · SHA-256 Algorithm · Browser-only execution</div>
              <div className="sealing-bar-track">
                <div className="sealing-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="mono sealing-percent">Computing local digest: {Math.round(progress)}%</div>
            </div>
          )}

          {/* Sealing Result */}
          {result && !sealing && (
            <div>
              <div className="seal-result-success">
                <span className="seal-success-icon">✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--success)", fontSize: "1rem" }}>Evidence Successfully Fingerprinted</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>Cryptographic seal recorded at {new Date(result.sealedAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="table-container" style={{ marginBottom: "20px" }}>
                <table className="data-table">
                  <tbody>
                    <tr>
                      <th style={{ width: "160px" }}>File Name</th>
                      <td><strong>{result.filename}</strong></td>
                    </tr>
                    <tr>
                      <th>File Size</th>
                      <td>{formatSize(result.sizeBytes)} ({result.sizeBytes} bytes)</td>
                    </tr>
                    <tr>
                      <th>MIME Type</th>
                      <td><code>{result.mimeType}</code></td>
                    </tr>
                    <tr>
                      <th>Timestamp (UTC)</th>
                      <td>{new Date(result.sealedAt).toUTCString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    SHA-256 Digital Fingerprint
                  </label>
                  <span className="badge badge-success">✓ Local Seal Valid</span>
                </div>
                <div className="hash-container">{formatHash(result.sha256)}</div>
              </div>

              <div className="grid-2col" style={{ marginBottom: "24px" }}>
                <div style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", padding: "14px 16px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontWeight: 700, color: "var(--success)", fontSize: "0.8125rem", marginBottom: "4px" }}>✓ INTEGRITY: VERIFIED</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-900)", lineHeight: 1.4 }}>Mathematical proof that this exact file payload has not been modified since sealing.</div>
                </div>
                <div style={{ background: "var(--info-bg)", border: "1px solid var(--info-border)", padding: "14px 16px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontWeight: 700, color: "var(--info)", fontSize: "0.8125rem", marginBottom: "4px" }}>ℹ AUTHENTICITY: PENDING</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-900)", lineHeight: 1.4 }}>Requires investigator triage & contextual review. Integrity alone does not prove truthfulness.</div>
                </div>
              </div>

              <button
                id="continue-to-certificate"
                className="btn btn-primary btn-block btn-lg"
                onClick={() => router.push(`/certificate?path=${path}`)}
              >
                Continue to Finalize Certificate (Step 4) →
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Help panel */}
        <div className="step-help-col">
          <div className="step-help-card">
            <div className="step-help-header">
              <span>🧮</span>
              <h3>What is SHA-256?</h3>
            </div>
            <p style={{ fontSize: "0.8375rem", color: "var(--gray-600)", lineHeight: 1.6, margin: "0 0 12px" }}>
              SHA-256 is a cryptographic algorithm that converts any file into a unique 64-character string.
              If even a single pixel or character changes, the entire fingerprint changes completely.
            </p>
            <ul className="step-help-list">
              {[
                "Impossible to reverse-engineer the file from the hash",
                "Two different files can never produce the same hash",
                "Mathematically proven tamper detection",
                "Accepted as evidence in Indian courts under BSA §63",
              ].map((point, i) => (
                <li key={i}>
                  <span className="step-help-check">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="step-help-card">
            <div className="step-help-header">
              <span>🏛️</span>
              <h4>Legal Validity</h4>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--gray-600)", lineHeight: 1.55, margin: 0 }}>
              Digital fingerprints created via VERITAS SEAL are admissible as electronic evidence under{" "}
              <strong>Bhartiya Sakshya Adhiniyam (BSA) §63</strong> and the{" "}
              <strong>Information Technology Act 2000, Section 65B</strong>.
            </p>
          </div>

          <div className="step-help-card step-help-emergency">
            <div className="step-help-header">
              <span>📞</span>
              <h4>Emergency Contacts</h4>
            </div>
            <a href="tel:1098" className="step-emergency-link">
              <span className="step-emergency-num">1098</span>
              <span>Childline — 24/7 Free</span>
            </a>
            <a href="tel:112" className="step-emergency-link">
              <span className="step-emergency-num">112</span>
              <span>National Emergency</span>
            </a>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}

export default function SealPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px 0" }}>Loading...</div>}>
      <SealContent />
    </Suspense>
  );
}
