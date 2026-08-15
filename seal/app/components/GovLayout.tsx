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
        <div className="utility-group">
          <div className="font-size-ctrls">
            <span style={{ marginRight: "4px" }}>Font Size:</span>
            <button onClick={() => setFontSize("small")} aria-label="Decrease font size">A−</button>
            <button onClick={() => setFontSize("normal")} aria-label="Default font size" className="active">A</button>
            <button onClick={() => setFontSize("large")} aria-label="Increase font size">A+</button>
          </div>
          <a href="#main-content">Skip to Main Content</a>
        </div>
        <div className="utility-group">
          <span>National Emergency:</span>
          <a href="tel:112" style={{ color: "var(--gold)", fontWeight: 700 }}>112</a>
          <span style={{ marginLeft: "6px" }}>Childline:</span>
          <a href="tel:1098" style={{ color: "var(--gold)", fontWeight: 700 }}>1098</a>
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

  // Close mobile navigation on route change
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
        <div className="footer-emergency-box">
          <strong>VERITAS SEAL is an evidence preservation system, not a 24/7 dispatcher.</strong>
          <br />
          If a child or person is in immediate physical danger, call{" "}
          <a href="tel:1098" style={{ color: "var(--gold)", fontWeight: 700 }}>Childline 1098</a>
          {" "}or{" "}
          <a href="tel:112" style={{ color: "var(--gold)", fontWeight: 700 }}>National Emergency 112</a> immediately.
        </div>

        <div className="footer-grid">
          <div className="footer-col">
            <h4>About VERITAS</h4>
            <ul>
              <li><Link href="/">What is VERITAS?</Link></li>
              <li><Link href="/support">How Cryptographic Sealing Works</Link></li>
              <li><Link href="/support">Zero-Knowledge Guarantee</Link></li>
              <li><Link href="/support">Bhartiya Sakshya Adhiniyam §63</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Citizen Services</h4>
            <ul>
              <li><Link href="/guide?path=guardian">Guardian Incident Report</Link></li>
              <li><Link href="/guide?path=self">Direct Citizen Report</Link></li>
              <li><Link href="/track">Track Report Status</Link></li>
              <li><Link href="/dispute">Respondent Code Access</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Support & Portals</h4>
            <ul>
              <li><a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">National Cyber Crime Portal</a></li>
              <li><a href="https://ncpcr.gov.in/page/pocso-e-box.html" target="_blank" rel="noopener noreferrer">NCPCR POCSO e-Box</a></li>
              <li><a href="https://ncrp.gov.in" target="_blank" rel="noopener noreferrer">National Crime Reporting Portal</a></li>
              <li><Link href="/support">Counselor Resources</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Helplines</h4>
            <ul>
              <li><strong>Childline:</strong> <a href="tel:1098">1098</a> (24/7 Toll-Free)</li>
              <li><strong>National Emergency:</strong> <a href="tel:112">112</a></li>
              <li><strong>Cyber Fraud / Crime:</strong> <a href="tel:1930">1930</a></li>
              <li><strong>Women Helpline:</strong> <a href="tel:181">181</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} VERITAS SEAL — Digital Forensic Evidence Preservation Platform.
          Compliant with BSA §63 digital evidence standards.
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
