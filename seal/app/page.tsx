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
    <main className="layout-split fade-in">
      {/* LEFT: Anchor Image Placeholder */}
      <div className="layout-anchor">
        <div className="layout-anchor-placeholder" style={{ background: "var(--ink)" }}></div>
        <div className="layout-anchor-content" style={{ color: "white", paddingBottom: "2rem" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem", lineHeight: 1.1 }}>
            Your report can protect<br/>a child and prevent harm.
          </h2>
          <p style={{ fontSize: "1.1rem", opacity: 0.9, maxWidth: "400px", marginBottom: "3rem" }}>
            ACPIA SEAL helps you securely report concerns and connect with the right authorities.
          </p>
          
          <div style={{ display: "flex", gap: "2rem", marginBottom: "3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                🔒
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Secure</div>
                <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>End-to-end encryption</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                🛡️
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Trusted</div>
                <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>Built for child safety</div>
              </div>
            </div>
          </div>
          
          <div style={{ fontSize: "0.85rem", opacity: 0.7, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "1.5rem" }}>
            🛡️ ACPIA SEAL is a non-emergency reporting system.<br/>
            If a child is in immediate danger, call 1098 or 112.
          </div>
        </div>
      </div>

      {/* RIGHT: Content / Forms */}
      <div className="layout-content">
        <div style={{ maxWidth: "600px", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h1 style={{ color: "var(--ink)", marginBottom: "0.5rem", fontSize: "2.25rem", fontFamily: "'Playfair Display', serif" }}>
              Something happened online.
            </h1>
            <h1 style={{ color: "var(--seal)", fontSize: "2.25rem", fontFamily: "'Playfair Display', serif" }}>
              Let's make sure it counts.
            </h1>
            <p style={{ marginTop: "1.5rem", fontSize: "0.95rem", color: "var(--ink-soft)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              🔒 Three minutes. Nothing you share leaves your device unless you choose to send it.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "3rem" }}>
            {paths.map((path) => (
              <button
                key={path.id}
                id={`path-${path.id}`}
                className="card card-interactive"
                onClick={() => router.push(`/guide?path=${path.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                  textAlign: "left",
                  width: "100%",
                  border: "none",
                  padding: "1.5rem 2rem",
                  background: path.id === "guardian" ? "rgba(29, 89, 86, 0.04)" : path.id === "self" ? "rgba(158, 57, 53, 0.04)" : "rgba(180, 134, 58, 0.04)"
                }}
              >
                <div style={{ 
                  width: "56px", 
                  height: "56px", 
                  borderRadius: "50%", 
                  background: "var(--card)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "1.5rem",
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid var(--rule)"
                }}>
                  {path.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: "1.1rem",
                    color: "var(--ink)",
                    marginBottom: "0.25rem"
                  }}>
                    {path.title}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                    {path.desc}
                  </div>
                </div>
                <span style={{ color: "var(--ink-soft)", fontSize: "1.5rem", opacity: 0.5 }}>→</span>
              </button>
            ))}
          </div>

          <div style={{ textAlign: "center", borderTop: "1px solid var(--rule)", paddingTop: "2rem" }}>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
              🛡️ Your safety is important to us. Reports are reviewed by authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
