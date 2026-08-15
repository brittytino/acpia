"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function UtilityBar() {
  const setFontSize = (size: string) => {
    document.documentElement.classList.remove("font-small", "font-large");
    if (size === "small") document.documentElement.classList.add("font-small");
    if (size === "large") document.documentElement.classList.add("font-large");
  };

  return (
    <div className="utility-bar">
      <div className="utility-inner">
        <div className="utility-left">
          <div className="font-size-ctrls">
            <span style={{ marginRight: "4px" }}>Font:</span>
            <button onClick={() => setFontSize("small")} aria-label="Decrease font size">A−</button>
            <button onClick={() => setFontSize("normal")} aria-label="Default font size" className="active">A</button>
            <button onClick={() => setFontSize("large")} aria-label="Increase font size">A+</button>
          </div>
          <a href="#main-content" className="skip-link">Skip to Main Content</a>
        </div>
        <div className="utility-right">
          <span className="emergency-item">
            <span>National Emergency:</span> <a href="tel:112" className="gold-phone">112</a>
          </span>
          <span className="emergency-divider">&bull;</span>
          <span className="emergency-item">
            <span>Childline:</span> <a href="tel:1098" className="gold-phone">1098</a>
          </span>
        </div>
      </div>
    </div>
  );
}

function MainHeader() {
  return (
    <header className="main-header">
      <div className="header-inner">
        <Link href="/" className="header-brand">
          <img
            src="/logo.png"
            alt="VERITAS Official Brand Logo"
            className="brand-logo-img"
          />
          <div className="brand-text-block">
            <span className="brand-title">VERITAS SEAL</span>
            <p className="brand-subtext">Evidence you can trust. Investigation you can defend.</p>
          </div>
        </Link>
        <div className="header-actions">
          <a href="tel:1098" className="emergency-btn">
            ☎ Emergency Childline 1098
          </a>
        </div>
      </div>
    </header>
  );
}

function PrimaryNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const links = [
    { href: "/", label: "Home" },
    { href: "/guide?path=guardian", label: "Report an Incident" },
    { href: "/track", label: "Track Report" },
    { href: "/support", label: "Support & Helplines" },
    { href: "/dispute", label: "Respondent Portal" },
  ];

  return (
    <nav className="primary-nav" aria-label="Main Navigation">
      <div className="nav-inner">
        <div className="nav-mobile-bar">
          <span className="nav-mobile-title">Menu Navigation</span>
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕ Close" : "☰ Menu"}
          </button>
        </div>

        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          {links.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href.split("?")[0]);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function MainFooter() {
  return (
    <footer className="gov-footer">
      <div className="container">
        {/* Footer Top Brand */}
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="footer-logo-row">
              <img src="/logo.png" alt="VERITAS SEAL" style={{ height: "40px", objectFit: "contain" }} />
              <div>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "var(--white)", letterSpacing: "0.06em" }}>VERITAS SEAL</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.65)" }}>Digital Evidence Preservation System</div>
              </div>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: "16px" }}>
              Official browser-based digital evidence preservation portal. BSA §63 compliant.
              Zero server-side file storage. SHA-256 cryptographic integrity sealing.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span className="footer-badge">BSA §63</span>
              <span className="footer-badge">POCSO Act</span>
              <span className="footer-badge">IT Act 2000</span>
              <span className="footer-badge">IPC 67B</span>
            </div>
          </div>

          <div className="footer-links-area">
            <div className="footer-col">
              <h4>Citizen Services</h4>
              <ul>
                <li><Link href="/guide?path=guardian">Guardian Incident Report</Link></li>
                <li><Link href="/guide?path=self">Direct Citizen Report</Link></li>
                <li><Link href="/guide?path=illegal_material">Illegal Material — Hash-Only Record</Link></li>
                <li><Link href="/track">Track Report Status</Link></li>
                <li><Link href="/dispute">Respondent Verification Portal</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Official Government Portals</h4>
              <ul>
                <li><a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">cybercrime.gov.in — National Cybercrime Portal</a></li>
                <li><a href="https://ncpcr.gov.in/page/pocso-e-box.html" target="_blank" rel="noopener noreferrer">NCPCR POCSO e-Box</a></li>
                <li><a href="https://www.childlineindia.org" target="_blank" rel="noopener noreferrer">Childline India Foundation</a></li>
                <li><a href="https://nalsa.gov.in" target="_blank" rel="noopener noreferrer">NALSA — Free Legal Aid</a></li>
                <li><a href="https://ncrp.gov.in" target="_blank" rel="noopener noreferrer">NCRP — Crime Reporting Portal</a></li>
                <li><a href="https://www.cert-in.org.in" target="_blank" rel="noopener noreferrer">CERT-In — Cyber Incident Response</a></li>
                <li><a href="https://www.wcd.nic.in" target="_blank" rel="noopener noreferrer">Ministry of Women & Child Development</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Emergency Helplines</h4>
              <ul>
                <li><strong style={{ color: "var(--white)" }}>Childline:</strong> <a href="tel:1098">1098</a> — 24/7, Toll-Free</li>
                <li><strong style={{ color: "var(--white)" }}>National Emergency:</strong> <a href="tel:112">112</a></li>
                <li><strong style={{ color: "var(--white)" }}>Cyber Fraud Helpline:</strong> <a href="tel:1930">1930</a></li>
                <li><strong style={{ color: "var(--white)" }}>Women Helpline:</strong> <a href="tel:181">181</a></li>
                <li><strong style={{ color: "var(--white)" }}>NALSA Legal Aid:</strong> <a href="tel:15100">15100</a></li>
                <li><strong style={{ color: "var(--white)" }}>iCall (Mental Health):</strong> <a href="tel:9152987821">9152987821</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Legal Framework</h4>
              <ul>
                <li><a href="https://legislative.gov.in/sites/default/files/bsa2023.pdf" target="_blank" rel="noopener noreferrer">Bhartiya Sakshya Adhiniyam (BSA) 2023</a></li>
                <li><a href="https://www.indiacode.nic.in/bitstream/123456789/1999/3/A2000-21.pdf" target="_blank" rel="noopener noreferrer">Information Technology Act, 2000</a></li>
                <li><a href="https://wcd.nic.in/acts/protection-children-sexual-offences-act-2012" target="_blank" rel="noopener noreferrer">POCSO Act, 2012</a></li>
                <li><a href="https://cybercrime.gov.in/Webform/crime_AboutUs.aspx" target="_blank" rel="noopener noreferrer">National Cybercrime Policy</a></li>
                <li><Link href="/support">Privacy & Evidence Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-emergency-box">
          <strong>⚠️ VERITAS SEAL is an evidence preservation system, not a 24/7 emergency dispatcher.</strong>
          <br />
          If a child or person is in immediate physical danger, call{" "}
          <a href="tel:1098">Childline 1098</a>
          {" "}or{" "}
          <a href="tel:112">National Emergency 112</a> immediately.
        </div>

        <div className="footer-bottom">
          <div style={{ marginBottom: "6px" }}>
            © {new Date().getFullYear()} VERITAS SEAL — Digital Forensic Evidence Preservation Platform.
            Operated under the framework of BSA §63, IT Act 2000, and POCSO Act 2012.
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
            <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>cybercrime.gov.in</a>
            <a href="https://ncpcr.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>ncpcr.gov.in</a>
            <a href="https://nalsa.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>nalsa.gov.in</a>
            <a href="https://cert-in.org.in" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>cert-in.org.in</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function GovLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UtilityBar />
      <MainHeader />
      <PrimaryNav />
      <main id="main-content" style={{ flex: 1 }}>
        {children}
      </main>
      <MainFooter />
    </>
  );
}
