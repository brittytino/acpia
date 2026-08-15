"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import GovLayout from "../components/GovLayout";

const CHANNELS = [
  {
    name: "Childline India",
    number: "1098",
    desc: "National 24/7 toll-free emergency helpline for children in need of care and protection.",
    action: "call",
    href: "tel:1098",
    badge: "24/7 Toll-Free",
    icon: "📞",
  },
  {
    name: "National Cyber Crime Helpline",
    number: "1930",
    desc: "Ministry of Home Affairs helpline for financial cyber fraud, online harassment, and cybercrime.",
    action: "call",
    href: "tel:1930",
    badge: "Immediate Assistance",
    icon: "🚔",
  },
  {
    name: "National Cyber Crime Portal",
    number: "cybercrime.gov.in",
    desc: "File a formal online police complaint directly into the National Crime Reporting Portal.",
    action: "open",
    href: "https://cybercrime.gov.in",
    badge: "Official Portal",
    icon: "💻",
  },
  {
    name: "NCPCR POCSO e-Box",
    number: "pocso-e-box.html",
    desc: "Confidential reporting mechanism directly to the National Commission for Protection of Child Rights.",
    action: "open",
    href: "https://ncpcr.gov.in/page/pocso-e-box.html",
    badge: "POCSO Direct",
    icon: "🔒",
  },
];

function ReportContent() {
  const router = useRouter();
  const params = useSearchParams();
  const path = params.get("path") || "guardian";
  const [reference, setReference] = useState<string>("ACP-DEMO-7X4M");
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    const ref = sessionStorage.getItem("seal_reference") || "ACP-DEMO-7X4M";
    setReference(ref);
  }, []);

  const copyToClipboard = async (text: string, setFn: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const prewrittenText = `COMPLAINT DETAILS & DIGITAL EVIDENCE REFERENCE:

I am filing a report regarding concerning online activity/messages involving a child.
I have preserved and cryptographically sealed the original digital evidence using VERITAS SEAL.

VERITAS REFERENCE LOCATOR: ${reference}

Please look up this reference locator in the VERITAS Police Console.
It contains the unbroken chain of custody record and the SHA-256 cryptographic digital fingerprint compliant with Section 63 of the Bharatiya Sakshya Adhiniyam (BSA §63).

I request that this reference be attached to the official FIR / Case Diary.`;

  return (
    <GovLayout>
      <div className="container" style={{ padding: "40px var(--space-6)" }}>
        <div style={{ maxWidth: "840px", margin: "0 auto" }}>
          {/* Reference Code Card */}
          <div className="card" style={{ marginBottom: "28px", borderTop: "4px solid var(--primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: "8px" }}>
                  ✓ Evidence Cryptographically Sealed
                </span>
                <h1 style={{ fontSize: "1.75rem", color: "var(--primary)", margin: 0 }}>
                  Your Official Reference Locator
                </h1>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => copyToClipboard(reference, setCopiedRef)}
              >
                {copiedRef ? "✓ Copied to Clipboard" : "Copy Code"}
              </button>
            </div>

            <div className="reference-banner" style={{ margin: "16px 0" }}>
              <div className="reference-value">{reference}</div>
            </div>

            <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--gray-900)" }}>
              Provide this code when filing at the police station or over the helpline. Investigating officers will use it to access the tamper-proof evidence ledger.
            </p>
          </div>

          {/* Reporting Channels */}
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "1.35rem", marginBottom: "8px" }}>
              Where to Submit Your Report
            </h2>
            <p style={{ marginBottom: "16px" }}>
              Choose an official reporting authority below:
            </p>

            <div style={{ display: "grid", gap: "12px" }}>
              {CHANNELS.map((ch) => (
                <div key={ch.name} className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "1.75rem" }}>{ch.icon}</span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px", flexWrap: "wrap" }}>
                          <strong style={{ color: "var(--primary)", fontSize: "1rem" }}>{ch.name}</strong>
                          <span className="badge badge-neutral">{ch.badge}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.8125rem" }}>{ch.desc}</p>
                      </div>
                    </div>
                    <div>
                      {ch.action === "call" ? (
                        <a href={ch.href} className="btn btn-primary" style={{ minWidth: "130px" }}>
                          Call {ch.number}
                        </a>
                      ) : (
                        <a href={ch.href} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ minWidth: "130px" }}>
                          Open Portal ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-written Filing Text */}
          <div className="card" style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Pre-Written Text for Police / Helpline</h3>
              <button
                className="btn btn-secondary"
                onClick={() => copyToClipboard(prewrittenText, setCopiedText)}
              >
                {copiedText ? "✓ Copied!" : "Copy Pre-Written Text"}
              </button>
            </div>
            <p style={{ fontSize: "0.875rem", marginBottom: "12px" }}>
              Copy and paste this structured notice when lodging your formal grievance or cyber complaint:
            </p>
            <div className="hash-container" style={{ fontSize: "0.8125rem", whiteSpace: "pre-wrap", color: "var(--gray-900)", lineHeight: 1.6 }}>
              {prewrittenText}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button className="btn btn-ghost" onClick={() => router.push("/")}>
              ← Back to Homepage
            </button>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px 0" }}>Loading...</div>}>
      <ReportContent />
    </Suspense>
  );
}
