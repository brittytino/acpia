"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:48802";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("Invalid username or password");
      const data = await res.json();
      localStorage.setItem("acpia_token", data.token || data.access_token);
      localStorage.setItem("acpia_user", JSON.stringify({ username: data.username, role: data.role }));
      router.push("/dashboard");
    } catch {
      setError("Authentication failed. Please verify your officer credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src="/logo.png"
            alt="VERITAS Official Logo"
            style={{ height: "64px", margin: "0 auto 16px", display: "block" }}
          />
          <span className="badge badge-gold" style={{ marginBottom: "8px" }}>
            Law Enforcement Forensic Console
          </span>
          <h1 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "4px" }}>
            VERITAS Forensic Workstation
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>
            Evidence you can trust. Investigation you can defend.
          </p>
        </div>

        {/* Login Card */}
        <div className="card card-gold-accent" style={{ padding: "28px" }}>
          <form onSubmit={login}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="login-username" className="form-label">
                Officer Username <span className="required">*</span>
              </label>
              <input
                id="login-username"
                className="input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. investigator1"
                autoFocus
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label htmlFor="login-password" className="form-label">
                Password <span className="required">*</span>
              </label>
              <input
                id="login-password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: "16px", padding: "10px 14px", fontSize: "0.8125rem" }}>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              className="btn btn-primary btn-block btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? "Authenticating Session..." : "Sign In to Forensic Workstation →"}
            </button>
          </form>
        </div>

        {/* Demo Credentials Box — only when the backend has actually opted
            into seeding them (NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true). This
            used to render unconditionally on every deployment, advertising
            admin/password123 to anyone who loaded the login page. */}
        {process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true" && (
          <div className="card" style={{ marginTop: "16px", padding: "16px 20px", background: "var(--white)" }}>
            <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.8125rem", marginBottom: "8px" }}>
              🔑 Pre-Configured Demo Credentials:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.75rem", color: "var(--gray-900)" }}>
              <div>&bull; Investigator: <code>investigator1</code></div>
              <div>&bull; Supervisor: <code>supervisor1</code></div>
              <div>&bull; Auditor: <code>auditor1</code></div>
              <div>&bull; Admin: <code>admin</code></div>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", marginTop: "6px", borderTop: "var(--border)", paddingTop: "6px" }}>
              Password for all accounts: <code>password123</code>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <p style={{ fontSize: "0.6875rem", color: "var(--gray-500)", margin: 0 }}>
            Authorised Law Enforcement & Forensic Personnel Only. All session actions are logged into the immutable chain of custody.
          </p>
        </div>
      </div>
    </div>
  );
}
