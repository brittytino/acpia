"use client";
// S6 — Report. The reference code (large + copyable), all 4 channels.
// Pre-written text they can copy. Where to go. What to say.
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const CHANNELS = [
  {
    name: "Childline",
    number: "1098",
    desc: "Free, 24 hours. For anything involving a child.",
    action: "call",
    href: "tel:1098",
    icon: "📞",
    color: "var(--help)",
  },
  {
    name: "Cyber Crime helpline",
    number: "1930",
    desc: "For online crimes, fraud, and harmful content.",
    action: "call",
    href: "tel:1930",
    icon: "🚔",
    color: "var(--help)",
  },
  {
    name: "cybercrime.gov.in",
    number: "",
    desc: "File online. Takes about ten minutes.",
    action: "open",
    href: "https://cybercrime.gov.in",
    icon: "💻",
    color: "var(--calm)",
  },
  {
    name: "POCSO e-Box (NCPCR)",
    number: "",
    desc: "Confidential complaints about child sexual abuse.",
    action: "open",
    href: "https://ncpcr.gov.in/page/pocso-e-box.html",
    icon: "🔒",
    color: "var(--calm)",
  },
];

function ReportContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const [reference, setReference] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  useEffect(() => {
    const ref = sessionStorage.getItem("seal_reference") || "ACP-XXXX-XXXX";
    setReference(ref);
  }, []);

  const copy = async (text: string, setCopiedFn: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  };

  const prewrittenText = `I am reporting an incident involving a child online.

I have sealed digital evidence using ACPIA (Agentic Child Protection Intelligence Architecture).

My reference code is: ${reference}

Please look up this reference code. It contains a cryptographic record of my evidence, including a SHA-256 fingerprint that proves the file has not been altered.

I am requesting that this evidence be added to a formal complaint.`;

  return (
    <main className="layout-centered-form fade-in">
      <div className="premium-card-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Header & Steps */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
          <button className="btn btn-ghost" onClick={() => router.back()} style={{ border: "1px solid var(--rule)", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)" }}>
            ← Back
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Step 4 of 4</span>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--rule)", color: "var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>1</div>
              <div style={{ width: "40px", height: "2px", background: "var(--rule)" }}></div>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--rule)", color: "var(--ink-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>2</div>
              <div style={{ width: "40px", height: "2px", background: "var(--rule)" }}></div>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--calm)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>3</div>
            </div>
          </div>
          <div style={{ padding: "0.5rem 1rem", background: "rgba(29, 89, 86, 0.05)", color: "var(--calm)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🛡️ Secure & Confidential
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2rem", fontFamily: "'Playfair Display', serif", color: "var(--ink)", marginBottom: "0.75rem" }}>Your reference code</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>
            Give this to the police. They can look up everything you sealed, exactly as you sealed it.
          </p>
        </div>

        {/* Reference code — large, copyable */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}>
          <div id="reference-code" className="reference-code">{reference}</div>
          <button
            className="btn btn-outline"
            onClick={() => copy(reference, setCopied)}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>

        <div className="divider" />

        <h3 style={{ marginBottom: "1.25rem", marginTop: "1.5rem" }}>Where to send this</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {CHANNELS.map((ch) => (
            <a
              key={ch.name}
              id={`channel-${ch.name.toLowerCase().replace(/\s+/g, "-")}`}
              href={ch.href}
              target={ch.action === "open" ? "_blank" : undefined}
              rel={ch.action === "open" ? "noopener noreferrer" : undefined}
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                textDecoration: "none",
                borderColor: "var(--rule)",
                transition: "border-color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = ch.color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
            >
              <span style={{ fontSize: "1.5rem" }}>{ch.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.125rem" }}>
                  {ch.name}{ch.number && <span style={{ color: ch.color }}> — {ch.number}</span>}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--ink-soft)" }}>{ch.desc}</div>
              </div>
              <span style={{ color: ch.color, fontWeight: 600, fontSize: "0.875rem" }}>
                {ch.action === "call" ? "Call →" : "Open →"}
              </span>
            </a>
          ))}
        </div>

        <div className="divider" />

        {/* Pre-written text */}
        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.75rem" }}>What to say</h3>
          <p style={{ marginBottom: "1rem", color: "var(--ink-soft)" }}>
            Copy this text to use when filing online or at the station:
          </p>
          <div style={{
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.8125rem",
            lineHeight: 1.7,
            color: "var(--ink-soft)",
            whiteSpace: "pre-wrap",
            marginBottom: "0.75rem",
          }}>
            {prewrittenText}
          </div>
          <button className="btn btn-outline" onClick={() => copy(prewrittenText, setTextCopied)}>
            {textCopied ? "✓ Copied!" : "Copy this text"}
          </button>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <button
            className="btn btn-ghost"
            onClick={() => router.push("/support")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            See all support resources →
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="page-content"><div className="container">Loading...</div></div>}>
      <ReportContent />
    </Suspense>
  );
}
