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
      {/* ── Hero Banner with full-width image ── */}
      <section className="hero-section">
        <div className="hero-content-wrapper">
          {/* Left: Text Content */}
          <div className="hero-text-col">
            <span className="badge badge-gold" style={{ marginBottom: "14px", display: "inline-flex" }}>
              🏛️ Official Digital Evidence Preservation — Government of India
            </span>
            <h1 className="hero-heading">
              Something happened online.<br />
              Let&apos;s make sure it counts.
            </h1>
            <p className="hero-desc">
              VERITAS SEAL is India&apos;s official browser-based digital evidence preservation portal.
              Powered by SHA-256 cryptography, fully compliant with{" "}
              <strong>Bhartiya Sakshya Adhiniyam (BSA) §63</strong> digital evidence standards.
              Your file never leaves your device.
            </p>
            <div className="hero-stats-row">
              <div className="hero-stat">
                <span className="hero-stat-num">₀</span>
                <span className="hero-stat-label">Files Uploaded to Server</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num">SHA-256</span>
                <span className="hero-stat-label">Cryptographic Standard</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num">BSA §63</span>
                <span className="hero-stat-label">Legal Compliance</span>
              </div>
            </div>
            <div className="hero-cta-group">
              <button
                className="btn btn-hero-primary"
                onClick={() => router.push("/guide?path=guardian")}
                id="btn-report-incident"
              >
                🛡️ Report an Incident →
              </button>
              <button
                className="btn btn-hero-secondary"
                onClick={() => router.push("/track")}
                id="btn-track-report"
              >
                Track a Report
              </button>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--gray-500)", marginTop: "10px" }}>
              Free, confidential, BSA §63 compliant. No registration required.
            </p>
          </div>

          {/* Right: Illustration */}
          <div className="hero-image-col">
            <div className="hero-image-frame">
              <img
                src="/hero-bg.jpg"
                alt="Digital Evidence Security Infrastructure"
                className="hero-illustration"
              />
              <div className="hero-image-badge">
                <span>🔒</span>
                <span>Zero-Knowledge Execution</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Indicators Bar ── */}
      <section className="trust-bar">
        <div className="container">
          <div className="trust-bar-inner">
            <div className="trust-item">
              <span className="trust-icon">🏛️</span>
              <span>Ministry of Home Affairs</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <span className="trust-icon">⚖️</span>
              <span>POCSO Act Compliant</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <span className="trust-icon">🔐</span>
              <span>WebCrypto API — In-Browser Only</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <span className="trust-icon">📜</span>
              <span>BSA §63 Evidence Standard</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <span className="trust-icon">🆓</span>
              <span>Free &amp; Toll-Free</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Service Options Grid ── */}
      <section style={{ padding: "56px 0", background: "var(--white)" }}>
        <div className="container">
          <div className="section-header">
            <div>
              <span className="badge badge-info" style={{ marginBottom: "10px" }}>What brings you here?</span>
              <h2 style={{ marginBottom: "8px" }}>How can we help you?</h2>
              <p style={{ maxWidth: "600px" }}>Select the option that best reflects your current situation. All reports are handled confidentially.</p>
            </div>
            <Link href="/support" className="btn btn-ghost btn-sm" style={{ flexShrink: 0, alignSelf: "flex-start" }}>
              Need help choosing? →
            </Link>
          </div>

          <div className="service-cards-grid">
            {serviceOptions.map((opt) => (
              <button
                key={opt.id}
                className="service-card service-card-wide"
                onClick={() => router.push(`/guide?path=${opt.id}`)}
                aria-label={opt.title}
                id={`service-${opt.id}`}
              >
                <div className="service-card-icon">{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0 }}>{opt.title}</h4>
                    <span className="badge badge-info">{opt.badge}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>{opt.desc}</p>
                </div>
                <span style={{ color: "var(--secondary)", fontWeight: 700, fontSize: "1.25rem", flexShrink: 0 }}>→</span>
              </button>
            ))}

            <button
              className="service-card service-card-wide"
              onClick={() => router.push("/dispute")}
              style={{ borderStyle: "dashed", borderColor: "var(--gold)" }}
              aria-label="I have a case dispute code"
              id="service-dispute"
            >
              <div className="service-card-icon" style={{ background: "var(--gold-light)", color: "var(--gold)" }}>⚖️</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0 }}>I have a code — a complaint or dispute involves me</h4>
                  <span className="badge badge-gold">Respondent Flow</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.875rem" }}>
                  Enter your assigned secure verification code to submit your account and digital evidence under Blind Dual Submission protections.
                </p>
              </div>
              <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "1.25rem", flexShrink: 0 }}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── How VERITAS Protects Evidence ── */}
      <section style={{ background: "var(--primary-light)", borderTop: "var(--border)", borderBottom: "var(--border)", padding: "56px 0" }}>
        <div className="container">
          <div className="section-header-center">
            <span className="badge badge-gold" style={{ marginBottom: "10px" }}>Evidence Chain</span>
            <h2 style={{ marginBottom: "8px" }}>How VERITAS protects your evidence</h2>
            <p style={{ maxWidth: "660px", margin: "0 auto" }}>
              Evidence integrity is preserved through an unbroken cryptographic chain fully compliant with Indian digital evidence standards (BSA §63).
            </p>
          </div>

          <div className="process-steps-grid">
            {[
              {
                step: "1",
                icon: "📁",
                title: "Add your file",
                desc: "Select screenshots, chat exports, or multimedia files directly from your device. WhatsApp, Instagram, Telegram, and all major platforms supported.",
              },
              {
                step: "2",
                icon: "🔬",
                title: "Digital fingerprint",
                desc: "A unique SHA-256 digital fingerprint is computed entirely within your browser's private memory sandbox. Zero server transfer.",
              },
              {
                step: "3",
                icon: "🔒",
                title: "Cryptographic Seal",
                desc: "Timestamp and hash locked into BSA §63 compliant ledger. Any future alteration will mathematically break the verification.",
              },
              {
                step: "4",
                icon: "📜",
                title: "Vault Certificate",
                desc: "Receive an official verification certificate and court-ready reference code for law enforcement submission.",
              },
              {
                step: "5",
                icon: "📊",
                title: "Track Report",
                desc: "Monitor case triage, forensic verification, and investigating officer updates in real-time from your dashboard.",
              },
            ].map((item) => (
              <div key={item.step} className="process-step-card">
                <div className="process-step-number">{item.step}</div>
                <div className="process-step-icon">{item.icon}</div>
                <h4 style={{ marginBottom: "8px" }}>{item.title}</h4>
                <p style={{ fontSize: "0.8125rem", margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="alert alert-info" style={{ marginTop: "36px", maxWidth: "900px", margin: "36px auto 0" }}>
            <strong>What is a digital fingerprint?</strong><br />
            A digital fingerprint (SHA-256 cryptographic hash) is an immutable 64-character mathematical signature.
            If even one pixel or character in a file changes after sealing, the fingerprint alters completely —
            mathematically proving to courts and investigators that evidence has not been tampered with.{" "}
            <strong>Fingerprinting is not encryption</strong> — your file content remains accessible to you.
          </div>
        </div>
      </section>

      {/* ── Official Government Resources Panel ── */}
      <section style={{ padding: "56px 0", background: "var(--white)" }}>
        <div className="container">
          <div className="section-header-center">
            <span className="badge badge-neutral" style={{ marginBottom: "10px" }}>Official Resources</span>
            <h2 style={{ marginBottom: "8px" }}>Government of India Partner Portals</h2>
            <p style={{ maxWidth: "600px", margin: "0 auto" }}>These are verified, official government platforms for reporting cybercrime, child safety, and digital harassment.</p>
          </div>

          <div className="gov-portals-grid">
            {[
              {
                logo: "🏛️",
                name: "National Cyber Crime Reporting Portal",
                desc: "Official portal by MHA to lodge online cyber complaints, including child pornography and cyberstalking.",
                url: "https://cybercrime.gov.in",
                tags: ["MHA Operated", "24×7 Active"],
              },
              {
                logo: "👶",
                name: "NCPCR POCSO e-Box",
                desc: "National Commission for Protection of Child Rights — confidential digital complaint box for POCSO violations.",
                url: "https://ncpcr.gov.in/page/pocso-e-box.html",
                tags: ["Child Protection", "POCSO Compliant"],
              },
              {
                logo: "📞",
                name: "Childline 1098 Portal",
                desc: "India's emergency helpline for children in distress. Operated by Ministry of Women & Child Development.",
                url: "https://www.childlineindia.org",
                tags: ["24/7 Toll-Free", "Emergency Support"],
              },
              {
                logo: "⚖️",
                name: "NALSA Legal Aid",
                desc: "National Legal Services Authority — free legal aid and counsel for victims, minors, and vulnerable persons.",
                url: "https://nalsa.gov.in",
                tags: ["Free Legal Aid", "Nationwide"],
              },
              {
                logo: "🔒",
                name: "Cert-In Cyber Incident",
                desc: "Indian Computer Emergency Response Team — report cyber security incidents to the national authority.",
                url: "https://www.cert-in.org.in",
                tags: ["CERT-In", "Govt. Authority"],
              },
              {
                logo: "👮",
                name: "National Crime Records Bureau",
                desc: "NCRB maintains national database of crime statistics and missing/found children records.",
                url: "https://www.ncrb.gov.in",
                tags: ["NCRB", "Crime Records"],
              },
            ].map((portal) => (
              <a
                key={portal.name}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gov-portal-card"
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <span className="gov-portal-logo">{portal.logo}</span>
                  <div>
                    <div className="gov-portal-name">{portal.name}</div>
                    <p style={{ fontSize: "0.8125rem", margin: "4px 0 10px", lineHeight: 1.45 }}>{portal.desc}</p>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {portal.tags.map((t) => (
                        <span key={t} className="badge badge-neutral">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="gov-portal-arrow">↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Emergency Notice ── */}
      <section style={{ padding: "40px 0", background: "var(--warning-bg)" }}>
        <div className="container">
          <div className="alert alert-warning" style={{ margin: 0, maxWidth: "none" }}>
            <strong>⚠️ Non-Emergency Reporting Notice:</strong><br />
            VERITAS SEAL is a digital evidence preservation portal, not a 24/7 emergency dispatcher.
            If you or a minor is currently in immediate physical danger, contact emergency services without delay:{" "}
            <a href="tel:1098" style={{ fontWeight: 700, color: "#8A3B00" }}>Childline 1098</a> or{" "}
            <a href="tel:112" style={{ fontWeight: 700, color: "#8A3B00" }}>National Emergency 112</a>.
          </div>
        </div>
      </section>
    </GovLayout>
  );
}
