"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
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

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <button className="btn btn-ghost" onClick={() => router.back()}>
              ← Back
            </button>
            <span className="badge badge-gold">Step 3 of 4</span>
          </div>

          <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "8px" }}>
            {!file ? "Create Digital Fingerprint" : sealing ? "Computing Fingerprint..." : "Evidence Fingerprinted & Sealed"}
          </h2>
          <p style={{ marginBottom: "24px" }}>
            {!result
              ? "Your browser will compute an immutable SHA-256 cryptographic hash of your file without sending the file anywhere."
              : "The digital fingerprint has been generated. This cryptographic value will prove the file's integrity in court."}
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
                style={{
                  border: `2px dashed ${dragOver ? "var(--secondary)" : "var(--gray-300)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "40px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "var(--secondary-light)" : "var(--white)",
                  marginBottom: "20px",
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🛡️</div>
                <div style={{ fontWeight: 700, color: "var(--gray-900)", fontSize: "1rem", marginBottom: "4px" }}>
                  Select or drop file to seal
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>
                  Zero-storage local execution. The file never leaves this device.
                </div>
              </div>

              <div className="alert alert-info">
                <strong>Zero-Knowledge Execution:</strong>
                <br />
                The WebCrypto API calculates this mathematical signature directly within your browser's private memory sandbox.
              </div>
            </div>
          )}

          {/* Hashing in Progress */}
          {sealing && file && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1.1rem", marginBottom: "8px" }}>
                {file.name}
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--gray-600)", marginBottom: "20px" }}>
                {formatSize(file.size)} &bull; SHA-256 Algorithm
              </div>

              <div style={{ height: "8px", background: "var(--gray-100)", borderRadius: "4px", overflow: "hidden", maxWidth: "360px", margin: "0 auto 12px" }}>
                <div style={{ height: "100%", background: "var(--primary)", width: `${progress}%`, transition: "width 0.1s ease" }} />
              </div>
              <div className="mono" style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>
                Computing local digest: {Math.round(progress)}%
              </div>
            </div>
          )}

          {/* Sealing Result */}
          {result && !sealing && (
            <div>
              {/* File Details Table */}
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

              {/* SHA-256 Fingerprint Display */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    SHA-256 Digital Fingerprint
                  </label>
                  <span className="badge badge-success">✓ Local Seal Valid</span>
                </div>
                <div className="hash-container">
                  {formatHash(result.sha256)}
                </div>
              </div>

              {/* Two-Score Explanation Notice */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                <div style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", padding: "12px 14px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontWeight: 700, color: "var(--success)", fontSize: "0.8125rem", marginBottom: "4px" }}>
                    ✓ INTEGRITY: VERIFIED
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-900)", lineHeight: 1.4 }}>
                    Mathematical proof that this exact file payload has not been modified since sealing.
                  </div>
                </div>
                <div style={{ background: "var(--info-bg)", border: "1px solid var(--info-border)", padding: "12px 14px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontWeight: 700, color: "var(--info)", fontSize: "0.8125rem", marginBottom: "4px" }}>
                    ℹ AUTHENTICITY: PENDING
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-900)", lineHeight: 1.4 }}>
                    Requires investigator triage & contextual review. Integrity alone does not prove truthfulness.
                  </div>
                </div>
              </div>

              <button
                id="continue-to-certificate"
                className="btn btn-primary btn-block btn-lg"
                onClick={() => router.push(`/certificate?path=${path}`)}
              >
                Continue to Finalize Certificate →
              </button>
            </div>
          )}
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
