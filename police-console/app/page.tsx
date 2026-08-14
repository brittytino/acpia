"use client";
// C1 — Login page
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

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
      const form = new FormData();
      form.append("username", username);
      form.append("password", password);
      const res = await fetch(`${API}/api/v1/auth/login`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("acpia_token", data.access_token);
      localStorage.setItem("acpia_user", JSON.stringify({ username: data.username, role: data.role }));
      router.push("/dashboard");
    } catch {
      setError("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--void)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "380px", padding: "1.5rem" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "var(--text-faint)", marginBottom: "0.5rem", letterSpacing: "0.12em" }}>
            ACPIA CONSOLE
          </div>
          <h1 style={{ fontSize: "1.25rem", color: "var(--text)" }}>Agentic Child Protection</h1>
          <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Intelligence Architecture v3
          </p>
        </div>

        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div className="label" style={{ marginBottom: "0.375rem" }}>Username</div>
            <input
              id="login-username"
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="investigator.name"
              autoFocus
              required
            />
          </div>
          <div>
            <div className="label" style={{ marginBottom: "0.375rem" }}>Password</div>
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
            <div style={{ background: "rgba(168,82,79,0.1)", border: "1px solid rgba(168,82,79,0.3)", borderRadius: "var(--radius-sm)", padding: "0.5rem 0.75rem", color: "var(--integrity)", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <button id="login-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "0.625rem" }}>
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
            Authorised law enforcement only. All access is logged.
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: "0.25rem" }}>
            On-premise deployment — air-gapped LAN
          </p>
        </div>
      </div>
    </div>
  );
}
