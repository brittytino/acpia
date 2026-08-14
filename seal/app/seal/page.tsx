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
    <main className="layout-centered-form fade-in" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="premium-card-container" style={{ maxWidth: "800px", margin: "0 auto", background: "var(--ink)", color: "white", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
          <button className="btn btn-ghost" onClick={() => router.back()} style={{ color: "var(--ink-faint)", border: "1px solid rgba(255,255,255,0.1)", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)" }}>
            ← Back
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Step 3 of 4</span>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>1</div>
              <div style={{ width: "40px", height: "2px", background: "rgba(255,255,255,0.1)" }}></div>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>2</div>
              <div style={{ width: "40px", height: "2px", background: "rgba(255,255,255,0.1)" }}></div>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--seal)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>3</div>
            </div>
          </div>
          <div style={{ width: "80px" }}></div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2rem", fontFamily: "'Playfair Display', serif", color: "white", marginBottom: "0.75rem" }}>
            {!file ? "Secure Your Evidence" : sealing ? "Encrypting Locally..." : "Evidence Sealed"}
          </h2>
        </div>

        {/* File drop (when no file yet) */}
        {!file && !result && (
          <div className="fade-in">
            <div
              id="seal-dropzone"
              className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              style={{ 
                marginBottom: "2rem", 
                border: "2px dashed rgba(255,255,255,0.2)", 
                background: "rgba(255,255,255,0.02)", 
                borderRadius: "var(--radius-lg)",
                padding: "4rem 2rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <input
                ref={inputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div style={{ width: "64px", height: "64px", background: "rgba(255,255,255,0.05)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "1.5rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                🛡️
              </div>
              <p style={{ fontWeight: 600, color: "white", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                Drop file here or tap to choose
              </p>
              <p style={{ fontSize: "0.9rem", color: "var(--ink-faint)" }}>The file is never sent anywhere</p>
            </div>
            
            <div style={{ background: "rgba(29, 89, 86, 0.15)", border: "1px solid rgba(29, 89, 86, 0.3)", padding: "1.5rem", borderRadius: "var(--radius-sm)", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.25rem" }}>🔒</span>
              <div>
                <strong style={{ color: "white", display: "block", marginBottom: "0.25rem", fontSize: "0.95rem" }}>Zero-Knowledge Processing</strong>
                <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  This hashing process occurs entirely within your browser's local memory. The original file is never uploaded to our servers or transmitted over the internet.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Hashing progress */}
        {sealing && file && (
          <div className="fade-in" style={{ marginBottom: "1.5rem", textAlign: "center", padding: "3rem 0" }}>
            <div style={{ 
              width: "120px", height: "120px", margin: "0 auto 2rem", 
              border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--seal)", 
              borderRadius: "50%", animation: "spin 1s linear infinite" 
            }}></div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            
            <p style={{ marginBottom: "1.5rem", color: "var(--ink-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>
              {file.name} · {formatSize(file.size)}
            </p>
            
            <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden", maxWidth: "300px", margin: "0 auto 1rem" }}>
              <div style={{ height: "100%", background: "var(--seal)", width: `${progress}%`, transition: "width 0.1s ease" }} />
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--ink-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>
              SHA-256 HASHING: {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Result */}
        {result && !sealing && (
          <div className="fade-in" style={{ textAlign: "center" }}>
            <div style={{ width: "80px", height: "80px", background: "var(--seal)", color: "var(--ink)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem", fontSize: "2rem", boxShadow: "0 0 32px rgba(180, 134, 58, 0.4)" }}>
              ✓
            </div>
            
            <p style={{ marginBottom: "2rem", color: "var(--ink-faint)", fontFamily: "'IBM Plex Mono', monospace" }}>
              {result.filename} · {formatSize(result.sizeBytes)}
            </p>

            <div style={{ marginBottom: "2.5rem", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "var(--radius-sm)", padding: "2rem", textAlign: "left" }}>
              <p style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--seal)",
                marginBottom: "1rem",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}>
                Immutable Cryptographic Fingerprint (SHA-256)
              </p>
              <div className="hash-display" style={{ fontSize: "0.9rem", lineHeight: 1.8, color: "white" }}>
                {hashGroups}
              </div>
            </div>

            <div style={{ background: "rgba(29, 89, 86, 0.15)", border: "1px solid rgba(29, 89, 86, 0.3)", padding: "1.5rem", borderRadius: "var(--radius-sm)", display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "3rem", textAlign: "left" }}>
              <span style={{ fontSize: "1.25rem" }}>🛡️</span>
              <div>
                <strong style={{ color: "white", display: "block", marginBottom: "0.25rem", fontSize: "0.95rem" }}>Legally Admissible Proof</strong>
                <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  If anyone changes even one letter or pixel of this file, this fingerprint changes completely. This guarantees chain-of-custody for law enforcement.
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                id="continue-to-certificate"
                onClick={() => router.push(`/certificate?path=${path}`)}
                style={{ 
                  background: "var(--seal)", color: "var(--ink)", border: "none", 
                  padding: "1.25rem 3rem", borderRadius: "var(--radius-sm)", 
                  fontSize: "1.1rem", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: "0 8px 16px rgba(180, 134, 58, 0.2)"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "none"}
              >
                Generate Vault Certificate →
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
