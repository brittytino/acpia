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
      <header className="topbar">
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.1em", color: "var(--steel)" }}>
          {title}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.875rem", color: "var(--text-dim)" }}>
          <span>{user.username}</span>
          <span style={{ background: "var(--slate-hi)", padding: "0.125rem 0.5rem", borderRadius: "100px", fontSize: "0.6875rem", textTransform: "uppercase" }}>
            {user.role}
          </span>
          <button onClick={logout} className="btn-ghost" style={{ fontSize: "0.75rem", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="nav-section">Triage</div>
        <Link href="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}>
          ◱ Dashboard
        </Link>
        <Link href="/inbound" className={`nav-item ${pathname.startsWith("/inbound") ? "active" : ""}`}>
          downarrow Inbound Reports
        </Link>
        
        <div className="nav-section" style={{ marginTop: "1rem" }}>Investigation</div>
        <Link href="/cases" className={`nav-item ${pathname.startsWith("/cases") ? "active" : ""}`}>
          ◫ Active Cases
        </Link>
      </aside>

      {/* Main */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
