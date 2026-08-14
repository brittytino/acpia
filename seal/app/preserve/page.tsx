"use client";
// S3 — Preserve. Platform-specific instructions, drop zone.
// "This stays on your device."
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, Suspense } from "react";

const PLATFORM_TIPS = [
  {
    name: "WhatsApp",
    emoji: "💬",
    steps: ["Open the chat", "Tap ⋮ (three dots) → More → Export chat", "Choose 'Without Media' or 'Include Media'", "Save the exported file"],
  },
  {
    name: "Instagram",
    emoji: "📸",
    steps: ["Go to Settings → Account → Download your information", "Request 'Messages' data", "Download the ZIP when ready", "Drop the file below"],
  },
  {
    name: "Telegram",
    emoji: "✈️",
    steps: ["Open the chat", "Tap ⋮ → Export chat history", "Choose format: JSON", "Save and drop the file below"],
  },
  {
    name: "Screenshot",
    emoji: "📱",
    steps: ["Take a screenshot of the message", "Do NOT send via WhatsApp or social media (it strips metadata)", "Drop the screenshot file below"],
  },
];

function PreserveContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const platform = PLATFORM_TIPS.find((p) => p.name === selectedPlatform);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <main className="page-content">
      <div className="container fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
          <button className="btn btn-ghost" onClick={() => router.back()} style={{ padding: "0.5rem 0.75rem" }}>
            ← Back
          </button>
          <span style={{ color: "var(--ink-faint)", fontSize: "0.875rem" }}>Step 2 of 4</span>
        </div>

        <div className="progress-bar" style={{ marginBottom: "2rem" }}>
          <div className="progress-fill" style={{ width: "50%" }} />
        </div>

        <h2 style={{ marginBottom: "0.5rem" }}>Get the file ready</h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Where did the messages happen? We'll show you how to save them.
        </p>

        {/* Platform picker */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {PLATFORM_TIPS.map((p) => (
            <button
              key={p.name}
              id={`platform-${p.name.toLowerCase()}`}
              className="card card-interactive"
              onClick={() => setSelectedPlatform(p.name)}
              style={{
                textAlign: "left",
                padding: "1rem",
                borderColor: selectedPlatform === p.name ? "var(--calm)" : "var(--rule)",
                background: selectedPlatform === p.name ? "rgba(46,110,107,0.04)" : "var(--card)",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{p.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{p.name}</div>
            </button>
          ))}
        </div>

        {/* Platform-specific instructions */}
        {platform && (
          <div className="card fade-in" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem", color: "var(--calm)" }}>
              Exporting from {platform.name}
            </h3>
            <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {platform.steps.map((step, i) => (
                <li key={i} style={{ color: "var(--ink-soft)", lineHeight: 1.5 }}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Drop zone */}
        <div
          id="file-dropzone"
          className={`drop-zone ${dragOver ? "drag-over" : ""}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
          {file ? (
            <div className="fade-in">
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
              <p style={{ fontWeight: 600, color: "var(--ink)" }}>{file.name}</p>
              <p style={{ fontSize: "0.875rem" }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📁</div>
              <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem" }}>
                Drop the file here, or tap to browse
              </p>
              <p style={{ fontSize: "0.875rem" }}>Chat exports, screenshots, any file</p>
            </>
          )}
        </div>

        <div className="info-box" style={{ margin: "1rem 0" }}>
          This stays on your device. Nothing is sent to any server yet.
        </div>

        <button
          id="continue-btn"
          className="btn btn-primary"
          disabled={!file}
          onClick={() => {
            if (file) {
              // Store file info in sessionStorage for the next step
              sessionStorage.setItem("seal_filename", file.name);
              sessionStorage.setItem("seal_size", String(file.size));
              sessionStorage.setItem("seal_path", path);
              // We pass file via URL, seal happens on next page
              router.push(`/seal?path=${path}&filename=${encodeURIComponent(file.name)}`);
            }
          }}
          style={{ width: "100%", justifyContent: "center", marginBottom: "1rem" }}
        >
          Continue →
        </button>

        {!file && (
          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--ink-faint)" }}>
            Add a file to continue
          </p>
        )}
      </div>
    </main>
  );
}

export default function PreservePage() {
  return (
    <Suspense fallback={<div className="page-content"><div className="container">Loading...</div></div>}>
      <PreserveContent />
    </Suspense>
  );
}
