import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACPIA Seal — Preserve Your Evidence",
  description: "Safely preserve and seal digital evidence. Your file never leaves your device.",
  keywords: ["child protection", "evidence", "cybercrime", "India", "POCSO"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Helpline banner — always visible, never buried */}
        <header className="helpline-banner">
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.875rem", color: "var(--ink-soft)" }}>
            ACPIA Seal
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>Need help now?</span>
            <a href="tel:1098" className="helpline-number">📞 Childline 1098</a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
