"use client";
// S7 — Support. Always reachable. Never a dead end.
import { useRouter } from "next/navigation";

export default function SupportPage() {
  const router = useRouter();
  return (
    <main className="page-content">
      <div className="container fade-in">
        <button className="btn btn-ghost" onClick={() => router.back()} style={{ padding: "0.5rem 0.75rem", marginBottom: "2rem" }}>
          ← Back
        </button>

        <h2 style={{ marginBottom: "0.5rem" }}>You don't have to deal with this alone</h2>
        <p style={{ marginBottom: "2rem" }}>
          All of these are free and confidential. Reach out any time.
        </p>

        {[
          {
            icon: "📞", name: "Childline", number: "1098", href: "tel:1098", color: "var(--help)",
            desc: "Free, 24/7. For children in need of care and protection. Completely confidential.",
            labels: ["24 hours", "Free", "Confidential"],
          },
          {
            icon: "🚔", name: "National Cyber Crime helpline", number: "1930", href: "tel:1930", color: "var(--help)",
            desc: "For reporting cybercrime, online harassment, and harmful content.",
            labels: ["Cybercrime", "24 hours"],
          },
          {
            icon: "💻", name: "cybercrime.gov.in", number: "", href: "https://cybercrime.gov.in", color: "var(--calm)",
            desc: "File a formal complaint online. Takes about ten minutes.",
            labels: ["Online", "Official"],
          },
          {
            icon: "🔒", name: "POCSO e-Box (NCPCR)", number: "", href: "https://ncpcr.gov.in/page/pocso-e-box.html", color: "var(--calm)",
            desc: "Confidential complaints about child sexual abuse under POCSO.",
            labels: ["POCSO", "Confidential"],
          },
          {
            icon: "📋", name: "NCRP — National Crime Reporting Portal", number: "", href: "https://ncrp.gov.in", color: "var(--calm)",
            desc: "Report crimes and track complaint status online.",
            labels: ["Official", "Tracking"],
          },
        ].map((ch) => (
          <a
            key={ch.name}
            id={`support-${ch.name.toLowerCase().replace(/\s+/g, "-").substring(0, 20)}`}
            href={ch.href}
            target={ch.href.startsWith("http") ? "_blank" : undefined}
            rel={ch.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="card"
            style={{ display: "block", textDecoration: "none", marginBottom: "0.75rem" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{ch.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem" }}>
                  {ch.name}{ch.number && <span style={{ color: ch.color }}> — {ch.number}</span>}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--ink-soft)", marginBottom: "0.5rem" }}>{ch.desc}</div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {ch.labels.map((l) => (
                    <span key={l} style={{
                      background: "var(--rule)", color: "var(--ink-soft)",
                      fontSize: "0.75rem", padding: "0.125rem 0.5rem",
                      borderRadius: "100px", fontWeight: 500,
                    }}>{l}</span>
                  ))}
                </div>
              </div>
              <span style={{ color: ch.color, fontWeight: 600 }}>→</span>
            </div>
          </a>
        ))}

        <div style={{ textAlign: "center", marginTop: "2rem", padding: "1.5rem", background: "var(--card)", borderRadius: "var(--radius-md)", border: "1px solid var(--rule)" }}>
          <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.5rem" }}>Start from the beginning</p>
          <p style={{ color: "var(--ink-soft)", marginBottom: "1rem", fontSize: "0.9375rem" }}>
            If you want to preserve and seal evidence, go back to the start.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/")}>
            Back to start →
          </button>
        </div>
      </div>
    </main>
  );
}
