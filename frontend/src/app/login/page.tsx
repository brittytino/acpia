"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Lock, AlertTriangle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Keycloak token endpoint (direct grant)
      const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8080";
      const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "acpia";
      const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "acpia-frontend";

      const response = await fetch(
        `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "password",
            client_id: clientId,
            username,
            password,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || "Invalid credentials");
      }

      const data = await response.json();
      localStorage.setItem("acpia_token", data.access_token);
      localStorage.setItem("acpia_refresh_token", data.refresh_token);

      // Decode token to get user info
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      localStorage.setItem(
        "acpia_user",
        JSON.stringify({
          username: payload.preferred_username,
          name: payload.name,
          email: payload.email,
          roles: payload.realm_access?.roles || [],
        })
      );

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)" }}>
      {/* Background grid */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full opacity-5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full opacity-5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)" }}>
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ACPIA</h1>
          <p className="text-sm text-slate-400 mt-1">Agentic Child Protection Investigation Assistant</p>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 p-3 rounded-lg flex items-start gap-3"
          style={{ background: "rgba(234, 88, 12, 0.1)", border: "1px solid rgba(234, 88, 12, 0.3)" }}>
          <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-300">
            <strong>RESTRICTED ACCESS.</strong> Authorized law enforcement personnel only.
            All access is logged and monitored. Unauthorized use is a criminal offense.
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-8" style={{ background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(16px)" }}>
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Lock size={18} className="text-blue-400" />
            Secure Sign In
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username / Badge Number
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="investigator1"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg text-sm text-red-300 flex items-center gap-2"
                style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
              >
                <AlertTriangle size={14} />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              style={{ padding: "12px 20px" }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(148, 163, 184, 0.1)" }}>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
              <div className="text-center p-2 rounded" style={{ background: "rgba(15, 23, 42, 0.5)" }}>
                <div className="text-slate-300 font-medium">Demo Admin</div>
                <div>admin / Admin@acpia1</div>
              </div>
              <div className="text-center p-2 rounded" style={{ background: "rgba(15, 23, 42, 0.5)" }}>
                <div className="text-slate-300 font-medium">Demo Investigator</div>
                <div>investigator1 / Inv@acpia1</div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          ACPIA v1.0 · All sessions encrypted · Air-gapped deployment
        </p>
      </motion.div>
    </div>
  );
}
