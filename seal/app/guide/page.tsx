"use client";
// S2 — Guided intake. One question per screen. Always an "I'm not sure" option.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const PATH_QUESTIONS: Record<string, Array<{ q: string; a: string[]; next: string }>> = {
  guardian: [
    {
      q: "How did you find out about these messages?",
      a: ["I saw messages on their phone", "They showed me themselves", "A teacher or friend told me"],
      next: "/preserve",
    },
  ],
  self: [
    {
      q: "Where is this happening?",
      a: ["WhatsApp or Telegram", "Instagram or Snapchat", "Gaming app or platform", "Somewhere else"],
      next: "/preserve",
    },
  ],
  illegal_material: [
    {
      q: "What would you like to do?",
      a: ["Report it to police — I want to preserve the evidence", "I just want to report it without anything stored"],
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
    <main className="page-content">
      <div className="container fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <button className="btn btn-ghost" onClick={() => router.back()} style={{ padding: "0.5rem 0.75rem" }}>
            ← Back
          </button>
          <span style={{ color: "var(--ink-faint)", fontSize: "0.875rem" }}>Step 1 of 4</span>
        </div>

        <div className="progress-bar" style={{ marginBottom: "2rem" }}>
          <div className="progress-fill" style={{ width: "25%" }} />
        </div>

        <h2 style={{ marginBottom: "1.5rem" }}>{current.q}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
          {current.a.map((answer, i) => (
            <button
              key={i}
              id={`answer-${i}`}
              className="card card-interactive"
              onClick={() => router.push(`${current.next}?path=${path}`)}
              style={{ textAlign: "left", padding: "1.125rem 1.5rem" }}
            >
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>{answer}</span>
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button className="btn btn-ghost" onClick={() => router.push("/support")}>
            I'm not sure — talk to someone →
          </button>
        </div>
      </div>
    </main>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={<div className="page-content"><div className="container">Loading...</div></div>}>
      <GuideContent />
    </Suspense>
  );
}
