"use client";
// Phone-side of QR pairing (VERITAS §5.1). Scanned from the Console, seals
// straight into the investigator's case — no cable, no account.
import { useEffect, useState } from "react";
import { sealFile, formatHash, type SealResult } from "@/lib/seal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:47802";

export default function PairPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<"loading" | "ready" | "expired" | "error">("loading");
  const [caseReference, setCaseReference] = useState<string | null>(null);
  const [sealed, setSealed] = useState<SealResult[]>([]);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/pair/${params.token}`)
      .then(res => {
        if (res.status === 410) { setStatus("expired"); return null; }
        if (!res.ok) { setStatus("error"); return null; }
        return res.json();
      })
      .then(data => {
        if (data) { setCaseReference(data.case_reference); setStatus("ready"); }
      })
      .catch(() => setStatus("error"));
  }, [params.token]);

  const handleFile = async (f: File) => {
    const s = await sealFile(f);
    setSealed(prev => [...prev, s]);
  };

  const send = async () => {
    if (sealed.length === 0) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/pair/${params.token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifacts: sealed.map(s => ({ filename: s.filename, sha256: s.sha256, size_bytes: s.sizeBytes, mime_type: s.mimeType })),
        }),
      });
      if (res.ok) {
        setSentCount(c => c + sealed.length);
        setSealed([]);
      }
    } finally {
      setSending(false);
    }
  };

  if (status === "loading") return <Centered>Checking pairing link...</Centered>;
  if (status === "expired") return <Centered>This pairing link has expired. Ask the investigator for a new QR code.</Centered>;
  if (status === "error") return <Centered>Pairing link not found.</Centered>;

  return (
    <main style={{ minHeight: "100vh", background: "var(--ink)", color: "white", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: "480px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>📱</div>
          <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>Paired to {caseReference}</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
            Files are hashed on this device. Only the hash is sent — never the file itself.
          </p>
        </div>

        <div
          onClick={() => document.getElementById("pair-file-input")?.click()}
          style={{ border: "2px dashed rgba(255,255,255,0.25)", borderRadius: "var(--radius-lg)", padding: "3rem 1.5rem", textAlign: "center", cursor: "pointer", marginBottom: "1.25rem" }}
        >
          <input id="pair-file-input" type="file" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🛡️</div>
          <p style={{ fontWeight: 600 }}>Tap to add a photo or file</p>
        </div>

        {sealed.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            {sealed.map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", marginBottom: "0.5rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{s.filename}</div>
                <div className="mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>{formatHash(s.sha256).slice(0, 40)}…</div>
              </div>
            ))}
            <button onClick={send} disabled={sending}
              style={{ width: "100%", background: "var(--seal)", color: "var(--ink)", border: "none", padding: "1rem", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "1rem", cursor: sending ? "not-allowed" : "pointer" }}>
              {sending ? "Sending..." : `Send ${sealed.length} hash${sealed.length !== 1 ? "es" : ""} to case →`}
            </button>
          </div>
        )}

        {sentCount > 0 && (
          <p style={{ textAlign: "center", color: "var(--seal)", fontSize: "0.9rem", fontWeight: 600 }}>
            ✓ {sentCount} item{sentCount !== 1 ? "s" : ""} added to the case. Add more, or close this tab.
          </p>
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
      <p>{children}</p>
    </div>
  );
}
