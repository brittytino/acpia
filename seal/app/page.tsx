"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GovLayout from "./components/GovLayout";

export default function HomePage() {
  const router = useRouter();

  const serviceOptions = [
    {
      id: "guardian",
      icon: "🛡️",
      title: "Someone is messaging a child in a way that worries me",
      desc: "For parents, teachers, and guardians who have noticed suspicious online communication or predatory behavior.",
      badge: "Guardian Flow",
    },
    {
      id: "self",
      icon: "🤝",
      title: "I'm worried about how someone is treating me online",
      desc: "For individuals experiencing cyberstalking, harassment, intimidation, or coercion on digital platforms.",
      badge: "Direct Report",
    },
    {
      id: "illegal_material",
      icon: "⚠️",
      title: "I was sent or encountered unlawful digital material",
      desc: "Preserve a cryptographic hash-only record of unsolicited illegal material without storing or propagating the file.",
      badge: "Zero-Storage Flow",
    },
  ];

  return (
    <GovLayout>
      {/* ── Hero Banner ── */}
      <section style={{ background: "var(--primary-light)", borderBottom: "1px solid var(--gray-200)", padding: "48px 0" }}>
        <div className="container">
          <div style={{ maxWidth: "760px" }}>
            <span className="badge badge-gold" style={{ marginBottom: "12px" }}>
              Official Digital Evidence Preservation
            </span>
            <h1 style={{ fontSize: "2.25rem", color: "var(--primary)", marginBottom: "12px" }}>
              Something happened online. Let&apos;s make sure it counts.
            </h1>
            <p style={{ fontSize: "1.125rem", color: "var(--gray-900)", marginBottom: "28px", lineHeight: 1.6 }}>
              VERITAS SEAL helps securely preserve digital evidence and connect people with the appropriate reporting and investigation process.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => router.push("/guide?path=guardian")}
              >
                Report an Incident →
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => router.push("/track")}
              >
                Track a Report
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Service Options Grid ── */}
      <section style={{ padding: "48px 0" }}>
        <div className="container">
          <div style={{ marginBottom: "28px" }}>
            <h2>How can we help you?</h2>
            <p>Select the option that best reflects your current situation.</p>
          </div>

          <div style={{ display: "grid", gap: "16px", marginBottom: "32px" }}>
            {serviceOptions.map((opt) => (
              <button
                key={opt.id}
                className="service-card"
                onClick={() => router.push(`/guide?path=${opt.id}`)}
                aria-label={opt.title}
              >
                <div className="service-card-icon">{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0 }}>{opt.title}</h4>
                    <span className="badge badge-info">{opt.badge}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>{opt.desc}</p>
                </div>
                <span style={{ color: "var(--secondary)", fontWeight: 700, fontSize: "1.25rem" }}>→</span>
              </button>
            ))}

            <button
              className="service-card"
              onClick={() => router.push("/dispute")}
              style={{ borderStyle: "dashed", borderColor: "var(--gold)" }}
              aria-label="I have a case dispute code"
            >
              <div className="service-card-icon" style={{ background: "var(--gold-light)", color: "var(--gold)" }}>⚖️</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0 }}>I have a code — a complaint or dispute involves me</h4>
                  <span className="badge badge-gold">Respondent Flow</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.875rem" }}>
                  Enter your assigned secure verification code to submit your account and digital evidence under Blind Dual Submission protections.
                </p>
              </div>
              <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "1.25rem" }}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── How VERITAS Protects Evidence ── */}
      <section style={{ background: "var(--white)", borderTop: "var(--border)", borderBottom: "var(--border)", padding: "48px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 36px" }}>
            <h2>How VERITAS protects your evidence</h2>
            <p>
              Evidence integrity is preserved through an unbroken cryptographic chain compliant with Indian digital evidence standards (BSA §63).
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            {[
              {
                step: "1",
                title: "Add your file",
                desc: "Select screenshots, chat exports, or multimedia files directly from your device.",
              },
              {
                step: "2",
                title: "Digital fingerprint",
                desc: "A unique SHA-256 digital fingerprint is computed entirely on your device in your browser memory.",
              },
              {
                step: "3",
                title: "Cryptographic Seal",
                desc: "The timestamp and hash are locked into the ledger. Any future alteration will break verification.",
              },
              {
                step: "4",
                title: "Vault Certificate",
                desc: "Receive an official verification certificate and reference code to submit to law enforcement.",
              },
              {
                step: "5",
                title: "Track Report",
                desc: "Monitor case triage, forensic verification, and investigating officer updates in real time.",
              },
            ].map((item) => (
              <div key={item.step} className="card card-gold-accent" style={{ textAlign: "center" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "var(--primary)", color: "var(--white)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px", fontWeight: 900, fontSize: "1rem"
                }}>
                  {item.step}
                </div>
                <h4 style={{ fontSize: "1rem", marginBottom: "8px" }}>{item.title}</h4>
                <p style={{ fontSize: "0.8125rem", margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="alert alert-info" style={{ marginTop: "32px" }}>
            <strong>What is a digital fingerprint?</strong>
            <br />
            A digital fingerprint (SHA-256 cryptographic hash) is an immutable 64-character mathematical signature.
            If even one pixel or character in a file changes after sealing, the fingerprint alters completely.
            This mathematically proves to courts and investigators that the evidence has not been tampered with.
            <strong> Digital fingerprinting is not encryption</strong> — your file content remains accessible to you.
          </div>
        </div>
      </section>

      {/* ── Emergency Notice ── */}
      <section style={{ padding: "36px 0" }}>
        <div className="container">
          <div className="alert alert-warning">
            <strong>Non-Emergency Reporting Notice:</strong>
            <br />
            VERITAS SEAL is a digital evidence preservation portal. If you or a minor is currently in immediate physical danger,
            contact emergency services without delay: <a href="tel:1098" style={{ fontWeight: 700 }}>Childline 1098</a> or{" "}
            <a href="tel:112" style={{ fontWeight: 700 }}>National Emergency 112</a>.
          </div>
        </div>
      </section>
    </GovLayout>
  );
}
