"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, Suspense } from "react";
import GovLayout from "../components/GovLayout";

const PLATFORM_TIPS = [
  {
    name: "WhatsApp",
    icon: "💬",
    steps: [
      "Open the relevant conversation in WhatsApp",
      "Tap ⋮ (More Options / Three Dots) → More → Export Chat",
      "Choose 'Without Media' or 'Include Media' based on your requirement",
      "Save the generated .txt / .zip file and select it below",
    ],
  },
  {
    name: "Instagram",
    icon: "📸",
    steps: [
      "Go to Profile → Settings & Activity → Download Your Information",
      "Select 'Messages' and choose format JSON or HTML",
      "Download the verified data archive from Meta",
      "Select the downloaded message file or screenshot below",
    ],
  },
  {
    name: "Telegram",
    icon: "✈️",
    steps: [
      "Open Telegram Desktop or Web app",
      "Open the chat → Tap ⋮ → Export Chat History",
      "Choose format: Machine-readable JSON or HTML",
      "Save the exported folder or file and select it below",
    ],
  },
  {
    name: "Screenshot",
    icon: "📱",
    steps: [
      "Capture clear full-screen screenshots showing timestamps and usernames",
      "Do not crop or edit with filter apps (maintains EXIF metadata integrity)",
      "Do not forward via compression platforms before preservation",
      "Upload the original raw image file below",
    ],
  },
];

function PreserveContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const [selectedPlatform, setSelectedPlatform] = useState<string>("WhatsApp");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const platform = PLATFORM_TIPS.find((p) => p.name === selectedPlatform) || PLATFORM_TIPS[0];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleContinue = () => {
    if (file) {
      sessionStorage.setItem("seal_filename", file.name);
      sessionStorage.setItem("seal_size", String(file.size));
      sessionStorage.setItem("seal_path", path);
      router.push(`/seal?path=${path}&filename=${encodeURIComponent(file.name)}`);
    }
  };

  return (
    <GovLayout>
      <div className="container-form" style={{ padding: "40px var(--space-6)" }}>
        {/* Step Progress */}
        <div className="step-tracker">
          <div className="step-item completed">
            <div className="step-circle">✓</div>
            <span>Situation</span>
          </div>
          <div className="step-line completed" />
          <div className="step-item active">
            <div className="step-circle">2</div>
            <span>Preserve</span>
          </div>
          <div className="step-line" />
          <div className="step-item">
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
            <span className="badge badge-gold">Step 2 of 4</span>
          </div>

          <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "8px" }}>
            Prepare Your Evidence
          </h2>
          <p style={{ marginBottom: "24px" }}>
            Select the platform where the incident occurred for export guidance, then choose the file on your device.
          </p>

          {/* Platform Selector Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "20px" }}>
            {PLATFORM_TIPS.map((p) => (
              <button
                key={p.name}
                id={`platform-${p.name.toLowerCase()}`}
                className="btn btn-ghost"
                onClick={() => setSelectedPlatform(p.name)}
                style={{
                  flexDirection: "column",
                  padding: "12px 6px",
                  borderColor: selectedPlatform === p.name ? "var(--primary)" : "var(--gray-200)",
                  background: selectedPlatform === p.name ? "var(--primary-light)" : "var(--white)",
                  color: selectedPlatform === p.name ? "var(--primary)" : "var(--gray-900)",
                  fontWeight: selectedPlatform === p.name ? 900 : 600,
                }}
              >
                <span style={{ fontSize: "1.25rem", marginBottom: "4px" }}>{p.icon}</span>
                <span style={{ fontSize: "0.8125rem" }}>{p.name}</span>
              </button>
            ))}
          </div>

          {/* Platform Instructions Box */}
          <div style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "16px 20px", marginBottom: "24px" }}>
            <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9375rem", marginBottom: "10px" }}>
              How to export from {platform.name}:
            </div>
            <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.875rem", color: "var(--gray-900)" }}>
              {platform.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {/* File Dropzone */}
          <div
            id="file-dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver || file ? "var(--secondary)" : "var(--gray-300)"}`,
              borderRadius: "var(--radius-md)",
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver || file ? "var(--secondary-light)" : "var(--white)",
              marginBottom: "20px",
              transition: "all 0.15s ease",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📄</div>
                <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1rem" }}>{file.name}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--gray-600)", marginTop: "4px" }}>
                  {(file.size / 1024).toFixed(1)} KB &bull; Ready for digital fingerprinting
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📁</div>
                <div style={{ fontWeight: 700, color: "var(--gray-900)", fontSize: "1rem", marginBottom: "4px" }}>
                  Click to select file or drop file here
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>
                  Supports screenshots, exported chats (.txt, .json, .zip), audio, and video files
                </div>
              </div>
            )}
          </div>

          <div className="alert alert-info" style={{ marginBottom: "24px" }}>
            <strong>Local Processing Privacy Guarantee:</strong>
            <br />
            This file stays in your local browser memory. No file content will be uploaded or transmitted across the network during digital fingerprinting.
          </div>

          <button
            id="continue-btn"
            className="btn btn-primary btn-block btn-lg"
            disabled={!file}
            onClick={handleContinue}
          >
            {file ? "Continue to Digital Fingerprint →" : "Select a File to Continue"}
          </button>
        </div>
      </div>
    </GovLayout>
  );
}

export default function PreservePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px 0" }}>Loading...</div>}>
      <PreserveContent />
    </Suspense>
  );
}
