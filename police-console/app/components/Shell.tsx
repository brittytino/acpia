"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Shell({ children, title = "ACPIA CONSOLE" }: { children: React.ReactNode; title?: string }) {
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

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar" style={{ background: "var(--card)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--rule)" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.25rem", color: "var(--calm)" }}>🛡️</span>
          {title}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.875rem", color: "var(--text-dim)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--verified)", boxShadow: "0 0 8px rgba(29, 89, 86, 0.4)" }}></div>
            <span>Connected</span>
          </div>
          <span style={{ color: "var(--rule)" }}>|</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{user.username}</span>
          <span style={{ background: "var(--verified-bg)", color: "var(--verified)", padding: "0.125rem 0.5rem", borderRadius: "100px", fontSize: "0.6875rem", textTransform: "uppercase", border: "1px solid rgba(29, 89, 86, 0.2)", fontWeight: 600 }}>
            {user.role}
          </span>
          <button onClick={logout} className="btn-ghost" style={{ fontSize: "0.75rem", border: "1px solid var(--rule)", cursor: "pointer", padding: "0.25rem 0.5rem", background: "transparent", borderRadius: "var(--radius-sm)", color: "var(--ink-soft)" }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar" style={{ borderRight: "1px solid var(--rule)", background: "var(--void)" }}>
        <div className="nav-section" style={{ color: "var(--text-faint)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 1.25rem", marginBottom: "0.5rem" }}>Triage</div>
        <Link href="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}>
          ◱ Dashboard
        </Link>
        <Link href="/inbound" className={`nav-item ${pathname.startsWith("/inbound") ? "active" : ""}`}>
          ↓ Inbound Reports
        </Link>
        
        <div className="nav-section" style={{ color: "var(--text-faint)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 1.25rem", marginBottom: "0.5rem", marginTop: "1.5rem" }}>Investigation</div>
        <Link href="/cases" className={`nav-item ${pathname.startsWith("/cases") ? "active" : ""}`}>
          ◫ Active Cases
        </Link>
      </aside>

      {/* Main */}
      <main className="main-view">
        {children}
      </main>
    </div>
  );
}
