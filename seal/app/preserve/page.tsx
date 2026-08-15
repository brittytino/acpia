"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
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
  const platform = PLATFORM_TIPS.find((p) => p.name === selectedPlatform) || PLATFORM_TIPS[0];

  const handleContinue = () => {
    sessionStorage.setItem("seal_path", path);
    router.push(`/seal?path=${path}`);
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
        </div>
      </div>

      {/* Full-width two-column layout */}
      <div className="step-page-layout">
        {/* LEFT: Main form */}
        <div className="step-main-col">
          <div className="step-page-header">
            <button className="btn btn-ghost" onClick={() => router.back()}>
              ← Back
            </button>
            <span className="badge badge-gold">Step 2 of 4</span>
          </div>

          <div className="step-icon-row">
            <span className="step-icon-large">📁</span>
            <h1 className="step-main-heading">Prepare Your Evidence</h1>
          </div>
          <p className="step-main-desc">
            Select the platform where the incident occurred to get export instructions. Then proceed to create a cryptographic fingerprint — your file never leaves your device.
          </p>

          {/* Platform Selector */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontWeight: 700, color: "var(--gray-900)", marginBottom: "12px", fontSize: "0.9375rem" }}>
              Where did the incident occur?
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {PLATFORM_TIPS.map((p) => (
                <button
                  key={p.name}
                  id={`platform-${p.name.toLowerCase()}`}
                  className="platform-tab-btn"
                  onClick={() => setSelectedPlatform(p.name)}
                  data-active={selectedPlatform === p.name ? "true" : "false"}
                >
                  <span style={{ fontSize: "1.5rem" }}>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Instructions */}
          <div className="platform-instructions-box">
            <div className="platform-instructions-title">
              How to export from {platform.name}:
            </div>
            <ol className="platform-instructions-list">
              {platform.steps.map((step, i) => (
                <li key={i}>
                  <span className="platform-step-num">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="alert alert-info" style={{ marginBottom: "24px" }}>
            <strong>📋 Evidence Quality Reminder:</strong><br />
            Use original, uncompressed files when possible. Forwarded or re-saved screenshots may have reduced metadata which could affect forensic analysis.
          </div>

          <button
            id="continue-btn"
            className="btn btn-primary btn-block btn-lg"
            onClick={handleContinue}
          >
            Continue to Digital Fingerprint (Step 3) →
          </button>
        </div>

        {/* RIGHT: Help panel */}
        <div className="step-help-col">
          <div className="step-help-card">
            <div className="step-help-header">
              <span>🔬</span>
              <h3>What happens next?</h3>
            </div>
            <ul className="step-help-list">
              {[
                "Your browser will compute a SHA-256 hash of your file",
                "No file content is sent to any server",
                "The hash creates a tamper-proof digital seal",
                "If the file changes even 1 byte, the hash changes completely",
                "This hash is your court-admissible evidence record",
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
              <span>📦</span>
              <h4>Accepted File Types</h4>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {["PNG", "JPG", "MP4", "TXT", "ZIP", "JSON", "HTML", "PDF", "MOV", "AVI"].map((ext) => (
                <span key={ext} className="badge badge-neutral">{ext}</span>
              ))}
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--gray-600)", marginTop: "12px", marginBottom: 0, lineHeight: 1.5 }}>
              Maximum recommended file size: 500 MB. Larger files may take longer to fingerprint.
            </p>
          </div>

          <div className="step-help-card step-help-emergency">
            <div className="step-help-header">
              <span>📞</span>
              <h4>Need Help?</h4>
            </div>
            <a href="tel:1098" className="step-emergency-link">
              <span className="step-emergency-num">1098</span>
              <span>Childline — 24/7 Free</span>
            </a>
            <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="step-emergency-link" style={{ textDecoration: "none" }}>
              <span className="step-emergency-num" style={{ fontSize: "0.75rem" }}>cybercrime.gov.in</span>
              <span>MHA Cybercrime Portal ↗</span>
            </a>
          </div>
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
