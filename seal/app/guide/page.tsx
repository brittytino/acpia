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

function GuideContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const questions = PATH_QUESTIONS[path] || PATH_QUESTIONS.guardian;
  const current = questions[0];

  return (
    <GovLayout>
      <div className="container-form" style={{ padding: "40px var(--space-6)" }}>
        {/* Step Progress Header */}
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

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <button className="btn btn-ghost" onClick={() => router.push("/")}>
              ← Back to Home
            </button>
            <span className="badge badge-gold">Step 1 of 4</span>
          </div>

          <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "8px" }}>
            {current.q}
          </h2>
          <p style={{ marginBottom: "24px" }}>
            Select the most accurate option below. This helps structure the forensic submission correctly.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
            {current.a.map((answer, i) => (
              <button
                key={i}
                id={`answer-${i}`}
                className="service-card"
                onClick={() => router.push(`${current.next}?path=${path}`)}
                style={{ padding: "16px 20px" }}
              >
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "var(--primary-light)", color: "var(--primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "0.875rem", flexShrink: 0
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontWeight: 700, color: "var(--gray-900)", fontSize: "0.9375rem" }}>
                  {answer}
                </div>
                <span style={{ color: "var(--secondary)", fontWeight: 700 }}>→</span>
              </button>
            ))}
          </div>

          <div style={{ borderTop: "var(--border)", paddingTop: "20px" }}>
            <button
              className="btn btn-ghost btn-block"
              onClick={() => router.push("/support")}
              style={{ justifyContent: "center" }}
            >
              Unsure? Speak with a Childline counselor or helpline →
            </button>
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
