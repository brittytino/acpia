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
  const platform = PLATFORM_TIPS.find((p) => p.name === selectedPlatform) || PLATFORM_TIPS[0];

  const handleContinue = () => {
    sessionStorage.setItem("seal_path", path);
    router.push(`/seal?path=${path}`);
  };



  return (
    <GovLayout>
      <div className="container-form-wide" style={{ padding: "40px var(--space-6)" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px", marginBottom: "20px" }}>
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

          <button
            id="continue-btn"
            className="btn btn-primary btn-block btn-lg"
            onClick={handleContinue}
          >
            Continue to Digital Fingerprint →
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
