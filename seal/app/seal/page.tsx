"use client";
// S4 — Seal. The critical screen. SHA-256 in the browser. File never transmitted.
// Shows the hash in monospace with plain-English explanation.
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
import { sealFile, formatHash, formatSize, type SealResult } from "@/lib/seal";

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

    // Animate progress while hashing
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 80);

    const sealed = await sealFile(f);
    clearInterval(interval);
    setProgress(100);

    setTimeout(() => {
      setResult(sealed);
      setSealing(false);
      // Persist for next steps
      sessionStorage.setItem("seal_result", JSON.stringify(sealed));
      sessionStorage.setItem("seal_path", path);
    }, 400);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !result) handleFile(f);
  };

  const hashGroups = result ? formatHash(result.sha256) : "";

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

        <h2 style={{ marginBottom: "0.5rem" }}>
          {!file ? "Add your file" : sealing ? "Sealing your file" : "Your file is sealed"}
        </h2>

        {/* File drop (when no file yet) */}
        {!file && !result && (
          <>
            <p style={{ marginBottom: "1.5rem" }}>
              Drop your exported chat or file here. It will be fingerprinted right here on your device.
            </p>
            <div
              id="seal-dropzone"
              className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              style={{ marginBottom: "1rem" }}
            >
              <input
                ref={inputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔒</div>
              <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem" }}>
                Drop file here or tap to choose
              </p>
              <p style={{ fontSize: "0.875rem" }}>The file is never sent anywhere</p>
            </div>
            <div className="info-box">
              This is happening entirely on your device. The file is not being sent anywhere.
            </div>
          </>
        )}

        {/* Hashing progress */}
        {sealing && file && (
          <div className="fade-in" style={{ marginBottom: "1.5rem" }}>
            <p style={{ marginBottom: "1rem", color: "var(--ink-soft)" }}>
              {file.name} · {formatSize(file.size)}
            </p>
            <div className="progress-bar" style={{ marginBottom: "0.5rem" }}>
              <div className="progress-fill" style={{ width: `${progress}%`, transition: "width 0.1s ease" }} />
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--ink-faint)", textAlign: "right" }}>
              {Math.round(progress)}%
            </p>
            <div className="info-box" style={{ marginTop: "1rem" }}>
              This is happening on your device. The file is not being sent anywhere.
            </div>
          </div>
        )}

        {/* Result */}
        {result && !sealing && (
          <div className="fade-in">
            <p style={{ marginBottom: "1rem", color: "var(--ink-soft)" }}>
              {result.filename} · {formatSize(result.sizeBytes)}
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{
                height: "4px",
                background: "var(--calm)",
                borderRadius: "2px",
                marginBottom: "1.25rem",
              }} />
            </div>

            <div className="card" style={{ marginBottom: "1.25rem", background: "var(--paper)" }}>
              <p style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ink-faint)",
                marginBottom: "0.5rem",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}>
                Your file's fingerprint
              </p>
              <div className="hash-display" style={{ fontSize: "0.8125rem", lineHeight: 1.8 }}>
                {hashGroups}
              </div>
            </div>

            <div className="info-box" style={{ marginBottom: "1.5rem" }}>
              <strong style={{ color: "var(--ink)" }}>What this is:</strong> If anyone changes even one letter or pixel of this file,
              this fingerprint changes completely. That's how the police can prove the file wasn't tampered with.
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                id="continue-to-certificate"
                className="btn btn-seal"
                onClick={() => router.push(`/certificate?path=${path}`)}
                style={{ flex: 1, justifyContent: "center" }}
              >
                🔐 Continue →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SealPage() {
  return (
    <Suspense fallback={<div className="page-content"><div className="container">Loading...</div></div>}>
      <SealContent />
    </Suspense>
  );
}
