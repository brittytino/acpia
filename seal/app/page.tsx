"use client";
// S1 — Landing. One sentence. Three cards. No marketing. No sign-up.
// A person in distress gets three doors and a phone number.
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const paths = [
    {
      id: "guardian",
      title: "Someone is messaging a child in a way that worries me",
      desc: "A parent, teacher, or guardian who has seen concerning messages.",
      icon: "🛡️",
    },
    {
      id: "self",
      title: "I'm worried about how someone is treating me",
      desc: "You are the person receiving these messages.",
      icon: "💙",
    },
    {
      id: "illegal_material",
      title: "I was sent something illegal",
      desc: "You received material you did not ask for and that you know is illegal.",
      icon: "⚠️",
    },
  ];

  return (
    <main className="page-content" style={{ paddingTop: "3rem" }}>
      <div className="container fade-in">
        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ color: "var(--ink)", marginBottom: "0.75rem" }}>
            Something happened online.
          </h1>
          <h1 style={{ color: "var(--calm)", marginBottom: "1.25rem" }}>
            Let's make sure it counts.
          </h1>
          <p style={{ fontSize: "1.0625rem", maxWidth: "480px", margin: "0 auto" }}>
            Three minutes. Nothing you share leaves your device unless you choose to send it.
          </p>
        </div>

        {/* Three doors */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2.5rem" }}>
          {paths.map((path) => (
            <button
              key={path.id}
              id={`path-${path.id}`}
              className="card card-interactive"
              onClick={() => router.push(`/guide?path=${path.id}`)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1.25rem",
                textAlign: "left",
                width: "100%",
                background: "var(--card)",
                cursor: "pointer",
                border: "1.5px solid var(--rule)",
              }}
            >
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>{path.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: "1.0625rem",
                  color: "var(--ink)",
                  marginBottom: "0.25rem",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  {path.title}
                </div>
                <div style={{ fontSize: "0.9375rem", color: "var(--ink-soft)" }}>
                  {path.desc}
                </div>
              </div>
              <span style={{ color: "var(--calm)", fontSize: "1.25rem", marginTop: "2px" }}>→</span>
            </button>
          ))}
        </div>

        {/* Not sure prompt */}
        <div className="info-box" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--ink-soft)", marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--ink)" }}>Not sure which one fits?</strong>
          </p>
          <p style={{ marginBottom: "1rem" }}>
            Call Childline 1098. It's free, available 24 hours, and they will talk you through it.
          </p>
          <a href="tel:1098" className="btn btn-help" style={{ display: "inline-flex" }}>
            📞 Call Childline 1098
          </a>
        </div>

        {/* Bottom resources */}
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <button
            className="btn btn-ghost"
            onClick={() => router.push("/support")}
            style={{ fontSize: "0.875rem" }}
          >
            See all helplines and reporting options →
          </button>
        </div>
      </div>
    </main>
  );
}
