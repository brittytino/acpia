"use client";
import { useRouter } from "next/navigation";
import GovLayout from "../components/GovLayout";

export default function SupportPage() {
  const router = useRouter();

  const resources = [
    {
      icon: "📞",
      name: "Childline India",
      number: "1098",
      href: "tel:1098",
      desc: "Emergency phone outreach service for children in need of care and protection. Free, 24/7, completely confidential.",
      tags: ["24/7", "Toll-Free", "Emergency Support"],
    },
    {
      icon: "🚔",
      name: "National Cyber Crime Helpline",
      number: "1930",
      href: "tel:1930",
      desc: "Helpline dedicated to reporting financial cyber frauds and digital harassment across India.",
      tags: ["Cybercrime", "Financial Fraud", "Harassment"],
    },
    {
      icon: "💻",
      name: "cybercrime.gov.in",
      number: "",
      href: "https://cybercrime.gov.in",
      desc: "Official portal under the Ministry of Home Affairs to lodge online cyber complaints and register formal FIRs.",
      tags: ["Official MHA", "Online Complaints"],
    },
    {
      icon: "🔒",
      name: "NCPCR POCSO e-Box",
      number: "",
      href: "https://ncpcr.gov.in/page/pocso-e-box.html",
      desc: "Direct, secure, and confidential digital complaint box managed by the National Commission for Protection of Child Rights.",
      tags: ["POCSO Direct", "Confidential Protection"],
    },
    {
      icon: "⚖️",
      name: "National Legal Services Authority (NALSA)",
      number: "15100",
      href: "tel:15100",
      desc: "Free legal aid and support for victims, minors, and vulnerable persons under the Legal Services Authorities Act.",
      tags: ["Free Legal Aid", "Counsel Access"],
    },
  ];

  return (
    <GovLayout>
      <div className="container" style={{ padding: "40px var(--space-6)" }}>
        <div style={{ marginBottom: "28px" }}>
          <span className="badge badge-gold" style={{ marginBottom: "8px" }}>
            Helplines & Resources
          </span>
          <h1 style={{ fontSize: "1.875rem", color: "var(--primary)", marginBottom: "8px" }}>
            Official Support & Emergency Contacts
          </h1>
          <p>
            All helplines listed below are verified, government-operated, free, and confidential.
          </p>
        </div>

        <div style={{ display: "grid", gap: "16px", marginBottom: "36px" }}>
          {resources.map((item) => (
            <div key={item.name} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <span style={{ fontSize: "1.75rem" }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--primary)" }}>
                      {item.name} {item.number && <span>&bull; {item.number}</span>}
                    </h3>
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="btn btn-secondary btn-sm"
                    >
                      {item.href.startsWith("tel") ? "Call Helpline" : "Open Portal ↗"}
                    </a>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: "0.875rem" }}>{item.desc}</p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {item.tags.map((t) => (
                      <span key={t} className="badge badge-neutral">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card card-gold-accent" style={{ textAlign: "center", padding: "28px" }}>
          <h3 style={{ color: "var(--primary)", marginBottom: "8px" }}>
            Ready to preserve evidence?
          </h3>
          <p style={{ marginBottom: "20px", fontSize: "0.9375rem" }}>
            Start an unbroken cryptographic chain of custody using your browser.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => router.push("/guide?path=guardian")}>
            Start Evidence Sealing →
          </button>
        </div>
      </div>
    </GovLayout>
  );
}
