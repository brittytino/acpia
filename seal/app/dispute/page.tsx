"use client";
// The Respondent Flow (VERITAS §4.3) — the platform's core differentiator.
// Works symmetrically for both parties: whoever holds a code seals blind.
import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { sealFile, formatHash, formatSize, type SealResult } from "@/lib/seal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:47802` : "http://localhost:47802");

type Step = "code" | "seal" | "statement" | "done";

function DisputeContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<{ role: string; scope_summary: string; case_reference: string; already_submitted: boolean } | null>(null);

  const [sealing, setSealing] = useState(false);
  const [results, setResults] = useState<SealResult[]>([]);
  const [statement, setStatement] = useState("");
  const [contact, setContact] = useState("");
  const [claimedWhen, setClaimedWhen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const checkCode = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/disputes/${code.trim().toUpperCase()}`);
      if (!res.ok) throw new Error("We couldn't find a dispute for that code. Check it and try again.");
      const data = await res.json();
      setScope(data);
      setStep(data.already_submitted ? "done" : "seal");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const handleFile = async (f: File) => {
    setSealing(true);
    const sealed = await sealFile(f);
    setResults(r => [...r, sealed]);
    setSealing(false);
  };

  const submit = async () => {
    if (results.length === 0 || !scope) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/disputes/${code.trim().toUpperCase()}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: statement || null,
          contact: contact || null,
          sealed_at: new Date().toISOString(),
          claimed_when: claimedWhen ? new Date(claimedWhen).toISOString() : null,
          artifacts: results.map(r => ({
            filename: r.filename, sha256: r.sha256, size_bytes: r.sizeBytes, mime_type: r.mimeType,
          })),
        }),
      });
      if (!res.ok) throw new Error("Could not submit. Please try again.");
      const data = await res.json();
      setReference(data.reference);
      setStep("done");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="layout-split fade-in">
      <div className="layout-anchor">
        <div className="layout-anchor-placeholder" style={{ background: "var(--ink)" }}></div>
        <div className="layout-anchor-content" style={{ color: "white", paddingBottom: "2rem" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 700, marginBottom: "1rem", lineHeight: 1.15 }}>
            Blind, by design.
          </h2>
          <p style={{ fontSize: "1.05rem", opacity: 0.9, maxWidth: "420px", marginBottom: "1.5rem" }}>
            You will not see the other party's evidence, and they will not see yours. Neither account
            can be shaped to fit the other. Whatever is true will still be true.
          </p>
          <p style={{ fontSize: "0.9rem", opacity: 0.75, maxWidth: "420px" }}>
            🛡️ VERITAS is a non-emergency evidence platform. If you are in immediate danger, call 1098 or 112.
          </p>
        </div>
      </div>

      <div className="layout-content">
        <div style={{ maxWidth: "600px", width: "100%" }}>

          {step === "code" && (
            <>
              <h1 style={{ color: "var(--ink)", fontSize: "2rem", fontFamily: "'Playfair Display', serif", marginBottom: "0.75rem" }}>
                Enter your code
              </h1>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", marginBottom: "2rem" }}>
                You should have received this by SMS, email, or letter — from the investigating body, not from the other party.
              </p>
              <input
                className="input"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="VER-7K4M-2X9P-R"
                style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", fontFamily: "'IBM Plex Mono', monospace", marginBottom: "1rem" }}
                onKeyDown={e => e.key === "Enter" && checkCode()}
                autoFocus
              />
              {error && <div style={{ color: "var(--error, #9E3935)", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</div>}
              <button
                onClick={checkCode}
                disabled={checking || !code.trim()}
                style={{ width: "100%", background: "var(--seal)", color: "var(--ink)", border: "none", padding: "1.1rem", borderRadius: "var(--radius-sm)", fontSize: "1.05rem", fontWeight: 600, cursor: checking ? "not-allowed" : "pointer" }}
              >
                {checking ? "Checking..." : "Continue →"}
              </button>
            </>
          )}

          {step === "seal" && scope && (
            <>
              <div style={{ display: "inline-block", background: "var(--slate-hi, #F3F5F7)", padding: "0.3rem 0.8rem", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--ink-soft)", marginBottom: "1rem", textTransform: "uppercase" }}>
                You are the {scope.role}
              </div>
              <h1 style={{ color: "var(--ink)", fontSize: "1.75rem", fontFamily: "'Playfair Display', serif", marginBottom: "1.25rem" }}>
                What you're told, and what protects you
              </h1>

              <div style={{ background: "rgba(29,89,86,0.05)", border: "1px solid rgba(29,89,86,0.2)", borderRadius: "var(--radius-sm)", padding: "1.5rem", marginBottom: "1.5rem", lineHeight: 1.7 }}>
                <p style={{ color: "var(--ink)", marginBottom: "1rem" }}>
                  A case has been registered concerning: <strong>{scope.scope_summary}</strong>
                </p>
                <ul style={{ color: "var(--ink-soft)", fontSize: "0.9rem", paddingLeft: "1.2rem", margin: 0 }}>
                  <li style={{ marginBottom: "0.5rem" }}>You will <strong>not</strong> see the other party's evidence, and they will not see yours.</li>
                  <li style={{ marginBottom: "0.5rem" }}>You are <strong>not required</strong> to submit anything.</li>
                  <li>Not submitting is <strong>not evidence</strong> of anything.</li>
                </ul>
              </div>

              <div
                className="drop-zone"
                onClick={() => document.getElementById("dispute-file-input")?.click()}
                onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                style={{ border: "2px dashed var(--rule)", borderRadius: "var(--radius-lg)", padding: "2.5rem 1.5rem", textAlign: "center", cursor: "pointer", marginBottom: "1rem" }}
              >
                <input id="dispute-file-input" type="file" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🛡️</div>
                <p style={{ fontWeight: 600, color: "var(--ink)" }}>{sealing ? "Sealing..." : "Drop a file or tap to add evidence"}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>Message exports, location history, anything showing where you were.</p>
              </div>

              {results.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  {results.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--slate-hi, #F3F5F7)", borderRadius: "var(--radius-sm)", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.9rem" }}>{r.filename}</div>
                        <div className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>{formatHash(r.sha256).slice(0, 40)}…</div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--calm, #1D5956)", fontWeight: 600 }}>✓ SEALED</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep("statement")}
                disabled={results.length === 0}
                style={{ width: "100%", background: results.length ? "var(--seal)" : "var(--rule)", color: "var(--ink)", border: "none", padding: "1rem", borderRadius: "var(--radius-sm)", fontSize: "1rem", fontWeight: 600, cursor: results.length ? "pointer" : "not-allowed", marginBottom: "0.75rem" }}
              >
                Continue with {results.length} file{results.length !== 1 ? "s" : ""} →
              </button>
              <button onClick={() => { setStep("statement"); }} style={{ width: "100%", background: "transparent", border: "none", color: "var(--ink-soft)", padding: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                Submit without any files
              </button>
            </>
          )}

          {step === "statement" && scope && (
            <>
              <h1 style={{ color: "var(--ink)", fontSize: "1.75rem", fontFamily: "'Playfair Display', serif", marginBottom: "1.25rem" }}>
                Your own words
              </h1>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--ink)" }}>Statement (optional)</label>
                <textarea className="input" value={statement} onChange={e => setStatement(e.target.value)}
                  style={{ width: "100%", minHeight: "110px", padding: "1rem", borderRadius: "var(--radius-sm)" }} />
              </div>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--ink)" }}>
                  When did the event you're describing happen? <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(optional)</span>
                </label>
                <input type="datetime-local" className="input" value={claimedWhen} onChange={e => setClaimedWhen(e.target.value)}
                  style={{ width: "100%", padding: "1rem", borderRadius: "var(--radius-sm)" }} />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--ink)" }}>Your contact (optional)</label>
                <input className="input" value={contact} onChange={e => setContact(e.target.value)} placeholder="+91 98765 43210"
                  style={{ width: "100%", padding: "1rem", borderRadius: "var(--radius-sm)" }} />
              </div>
              {error && <div style={{ color: "var(--error, #9E3935)", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</div>}
              <button onClick={submit} disabled={submitting}
                style={{ width: "100%", background: "var(--seal)", color: "var(--ink)", border: "none", padding: "1.1rem", borderRadius: "var(--radius-sm)", fontSize: "1.05rem", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}>
                {submitting ? "Locking in..." : "Lock this in →"}
              </button>
            </>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "72px", height: "72px", background: "var(--seal)", color: "var(--ink)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "1.75rem" }}>✓</div>
              {reference ? (
                <>
                  <h2 style={{ color: "var(--ink)", fontSize: "1.5rem", marginBottom: "0.75rem" }}>Submitted and locked in</h2>
                  <p style={{ color: "var(--ink-soft)", marginBottom: "1.5rem" }}>Your reference: <span className="mono" style={{ fontWeight: 600 }}>{reference}</span></p>
                </>
              ) : (
                <>
                  <h2 style={{ color: "var(--ink)", fontSize: "1.5rem", marginBottom: "0.75rem" }}>Already submitted</h2>
                  <p style={{ color: "var(--ink-soft)", marginBottom: "1.5rem" }}>This code has already been used. Contact the investigating body if this wasn't you.</p>
                </>
              )}
              <button onClick={() => router.push("/")} style={{ background: "var(--ink)", color: "white", border: "none", padding: "0.9rem 2rem", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function DisputePage() {
  return (
    <Suspense fallback={<div className="page-content"><div className="container">Loading...</div></div>}>
      <DisputeContent />
    </Suspense>
  );
}
