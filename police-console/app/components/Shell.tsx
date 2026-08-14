"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Shell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("acpia_token");
    if (!token) {
      router.push("/");
    }
    const u = localStorage.getItem("acpia_user");
    if (u) setUser(JSON.parse(u));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("acpia_token");
    localStorage.removeItem("acpia_user");
    router.push("/");
  };

  if (!user) return null;

  const navGroups = [
    {
      group: "Operational Triage",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/inbound", label: "Inbound Reports", icon: "📥" },
      ],
    },
    {
      group: "Forensic Cases",
      items: [
        { href: "/cases", label: "Active Cases", icon: "📁" },
      ],
    },
    {
      group: "Supervision & Audit",
      items: [
        { href: "/auditor", label: "Custody Auditor", icon: "⚖️" },
      ],
    },
  ];

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <Link href="/dashboard" className="topbar-brand">
          <img
            src="/logo.png"
            alt="VERITAS Logo"
            className="topbar-logo-img"
          />
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="topbar-title">VERITAS CONSOLE</span>
            <span className="topbar-badge">v6.0</span>
          </div>
        </Link>

        {title && (
          <div style={{ marginLeft: "24px", paddingLeft: "16px", borderLeft: "1px solid rgba(255,255,255,0.2)", fontSize: "0.8125rem", color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
            {title}
          </div>
        )}

        <div className="topbar-spacer" />

        <div className="topbar-user">
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>Investigating Unit:</span>
          <strong>{user.username}</strong>
          <span className="user-badge">{user.role}</span>
          <button onClick={logout} className="btn-signout" title="Sign out of console">
            Sign Out
          </button>
        </div>
      </header>

      {/* Fixed Sidebar */}
      <aside className="sidebar">
        {navGroups.map((grp) => (
          <div key={grp.group} style={{ marginBottom: "16px" }}>
            <div className="nav-group-title">{grp.group}</div>
            {grp.items.map((item) => {
              const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div style={{ padding: "16px 24px", marginTop: "32px", borderTop: "var(--border)" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--gray-500)", lineHeight: 1.4 }}>
            <strong>Air-Gapped LAN Security:</strong>
            <br />
            BSA §63 Forensic Hash Ledger
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-view">
        {children}
      </main>
    </div>
  );
}
