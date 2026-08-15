"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import GovLayout from "../components/GovLayout";

const PATH_QUESTIONS: Record<string, Array<{ q: string; a: string[]; next: string }>> = {
  guardian: [
    {
      q: "How did you find out about these messages?",
      a: [
        "I saw concerning messages on their mobile device or tablet",
        "The child or student showed me the conversation directly",
        "A teacher, school counselor, or classmate brought this to my attention",
        "I received an alert or discovered suspicious online account activity"
      ],
      next: "/preserve",
    },
  ],
  self: [
    {
      q: "Where is this concerning interaction taking place?",
      a: [
        "WhatsApp, Telegram, or Signal messaging app",
        "Instagram, Snapchat, Discord, or TikTok direct messages",
        "Online multiplayer gaming platform or voice chat",
        "Email, SMS, or anonymous messaging service"
      ],
      next: "/preserve",
    },
  ],
  illegal_material: [
    {
      q: "What action would you like to take regarding this material?",
      a: [
        "Create a zero-storage cryptographic hash record to submit to law enforcement",
        "Generate a BSA §63 digital fingerprint certificate for legal preservation"
      ],
      next: "/seal",
    },
  ],
};

const PATH_META: Record<string, { badge: string; icon: string; helpTitle: string; helpPoints: string[] }> = {
  guardian: {
    badge: "Guardian Flow",
    icon: "🛡️",
    helpTitle: "What happens after I select?",
    helpPoints: [
      "We'll guide you to securely preserve the digital evidence",
      "A SHA-256 cryptographic fingerprint will be created in your browser",
      "No files are uploaded to any server",
      "You'll receive an official BSA §63 compliant certificate",
      "The certificate can be presented to police or Childline 1098",
    ],
  },
  self: {
    badge: "Direct Report",
    icon: "🤝",
    helpTitle: "Your report stays confidential",
    helpPoints: [
      "This report is encrypted end-to-end in the browser",
      "No files leave your device during fingerprinting",
      "Your identity is only shared with investigators upon case registration",
      "You may remain anonymous at the evidence preservation stage",
      "Our process is fully compliant with POCSO Act provisions",
    ],
  },
  illegal_material: {
    badge: "Zero-Storage Flow",
    icon: "⚠️",
    helpTitle: "Why zero-storage?",
    helpPoints: [
      "Viewing, downloading, or forwarding illegal material is itself an offence",
      "We create only a mathematical hash — not a copy of the file",
      "The hash alone is legally sufficient evidence under BSA §63",
      "Your device is protected — no illegal content is ever stored",
      "The hash record can be submitted directly to NCRB or Cybercrime portal",
    ],
  },
};

function GuideContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const questions = PATH_QUESTIONS[path] || PATH_QUESTIONS.guardian;
  const current = questions[0];
  const meta = PATH_META[path] || PATH_META.guardian;

  return (
    <GovLayout>
      {/* Full-width step banner */}
      <div className="step-banner">
        <div className="step-banner-inner">
          <div className="step-tracker">
            <div className="step-item active">
              <div className="step-circle">1</div>
              <span>Situation</span>
            </div>
            <div className="step-line" />
            <div className="step-item">
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
            <button className="btn btn-ghost" onClick={() => router.push("/")}>
              ← Back to Home
            </button>
            <span className={`badge badge-info`}>{meta.badge} · Step 1 of 4</span>
          </div>

          <div className="step-icon-row">
            <span className="step-icon-large">{meta.icon}</span>
            <h1 className="step-main-heading">{current.q}</h1>
          </div>
          <p className="step-main-desc">
            Select the most accurate option below. Your answer helps structure the forensic submission correctly and ensures the right investigation team is assigned.
          </p>

          <div className="step-options-list">
            {current.a.map((answer, i) => (
              <button
                key={i}
                id={`answer-${i}`}
                className="step-option-card"
                onClick={() => router.push(`${current.next}?path=${path}`)}
              >
                <div className="step-option-num">{i + 1}</div>
                <div className="step-option-text">{answer}</div>
                <span className="step-option-arrow">→</span>
              </button>
            ))}
          </div>

          <div className="step-footer-action">
            <button
              className="btn btn-ghost"
              onClick={() => router.push("/support")}
            >
              Not sure which to pick? Speak with a Childline counselor →
            </button>
          </div>
        </div>

        {/* RIGHT: Help panel */}
        <div className="step-help-col">
          <div className="step-help-card">
            <div className="step-help-header">
              <span className="step-help-icon">💡</span>
              <h3>{meta.helpTitle}</h3>
            </div>
            <ul className="step-help-list">
              {meta.helpPoints.map((point, i) => (
                <li key={i}>
                  <span className="step-help-check">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="step-help-card step-help-emergency">
            <div className="step-help-header">
              <span>📞</span>
              <h4>Emergency Contacts</h4>
            </div>
            <a href="tel:1098" className="step-emergency-link">
              <span className="step-emergency-num">1098</span>
              <span>Childline India — 24/7 Free</span>
            </a>
            <a href="tel:112" className="step-emergency-link">
              <span className="step-emergency-num">112</span>
              <span>National Emergency</span>
            </a>
            <a href="tel:1930" className="step-emergency-link">
              <span className="step-emergency-num">1930</span>
              <span>Cyber Crime Helpline</span>
            </a>
          </div>

          <div className="step-help-card">
            <div className="step-help-header">
              <span>🔒</span>
              <h4>Zero-Knowledge Guarantee</h4>
            </div>
            <p style={{ fontSize: "0.8375rem", color: "var(--gray-600)", lineHeight: 1.55, margin: 0 }}>
              Your evidence files <strong>never leave your device</strong>. The SHA-256 fingerprint is computed
              entirely in your browser's private memory using the WebCrypto API. No server receives your file.
            </p>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px 0" }}>Loading intake step...</div>}>
      <GuideContent />
    </Suspense>
  );
}
