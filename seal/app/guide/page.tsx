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
    <main className="layout-centered-form fade-in">
      <div className="premium-card-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Header & Steps */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
          <button className="btn btn-ghost" onClick={() => router.back()} style={{ border: "1px solid var(--rule)", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)" }}>
            ← Back
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Step 1 of 4</span>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--calm)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>1</div>
              <div style={{ width: "40px", height: "2px", background: "var(--rule)" }}></div>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid var(--rule)", color: "var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>2</div>
              <div style={{ width: "40px", height: "2px", background: "var(--rule)" }}></div>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid var(--rule)", color: "var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>3</div>
            </div>
          </div>
          <div style={{ padding: "0.5rem 1rem", background: "rgba(29, 89, 86, 0.05)", color: "var(--calm)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🛡️ Secure & Confidential
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2rem", fontFamily: "'Playfair Display', serif", color: "var(--ink)", marginBottom: "0.75rem" }}>{current.q}</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>Your response helps us understand the situation better and take the right action.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
          {current.a.map((answer, i) => (
            <button
              key={i}
              id={`answer-${i}`}
              className="card card-interactive"
              onClick={() => router.push(`${current.next}?path=${path}`)}
              style={{ 
                textAlign: "left", 
                padding: "1.25rem 1.5rem", 
                display: "flex", 
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid var(--rule)",
                background: "var(--paper)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--card)", border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--calm)" }}>
                  {i === 0 ? "📱" : i === 1 ? "👥" : "👤"}
                </div>
                <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: "1rem" }}>{answer}</span>
              </div>
              <span style={{ color: "var(--ink-faint)" }}>→</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: "1px dashed var(--rule)", paddingTop: "2rem" }}>
          <button 
            className="card card-interactive"
            onClick={() => router.push("/support")}
            style={{ 
              width: "100%", 
              textAlign: "left", 
              padding: "1.25rem 1.5rem", 
              display: "flex", 
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid var(--rule)",
              background: "rgba(29, 89, 86, 0.03)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--card)", border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--calm)" }}>
                🎧
              </div>
              <div>
                <div style={{ color: "var(--ink)", fontWeight: 600, fontSize: "1rem" }}>I'm not sure — talk to someone</div>
                <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>You can speak to a trained counselor for support.</div>
              </div>
            </div>
            <span style={{ color: "var(--calm)" }}>→</span>
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
