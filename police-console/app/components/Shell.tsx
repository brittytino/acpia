"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Shell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("acpia_token");
    if (!token) {
      router.push("/");
    }
    const u = localStorage.getItem("acpia_user");
    if (u) setUser(JSON.parse(u));
  }, [router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        <div className="topbar-left">
          <button
            className="topbar-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation drawer"
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          <Link href="/dashboard" className="topbar-brand">
            <img
              src="/logo.png"
              alt="VERITAS Logo"
              className="topbar-logo-img"
            />
            <div className="topbar-brand-text">
              <span className="topbar-title">VERITAS CONSOLE</span>
              <span className="topbar-badge">v6.0</span>
            </div>
          </Link>

          {title && (
            <div className="topbar-page-title">
              {title}
            </div>
          )}
        </div>

        <div className="topbar-user">
          <span className="topbar-unit-label">Unit:</span>
          <strong className="topbar-username">{user.username}</strong>
          <span className="user-badge">{user.role}</span>
          <button onClick={logout} className="btn-signout" title="Sign out of console">
            Sign Out
          </button>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      {/* Responsive Sidebar (Fixed on Desktop, Drawer on Mobile) */}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        {/* Mobile Header inside drawer */}
        <div className="sidebar-mobile-header">
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 900, color: "var(--primary)", fontSize: "0.875rem" }}>
              {user.username}
            </span>
            <span className="badge badge-gold" style={{ width: "fit-content", fontSize: "0.625rem" }}>
              {user.role}
            </span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu drawer"
          >
            ✕ Close
          </button>
        </div>

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
                  onClick={() => setMenuOpen(false)}
                >
                  <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div style={{ padding: "16px 24px", marginTop: "auto", borderTop: "var(--border)" }}>
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
