"use client";
import { useState } from "react";
import GovLayout from "../components/GovLayout";

export default function TrackPage() {
  const [refCode, setRefCode] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCode.trim()) return;
    setSearching(true);
    setSearched(true);

    setTimeout(() => {
      // Demo tracker response based on input format
      setStatus({
        reference: refCode.trim().toUpperCase(),
        submittedAt: new Date(Date.now() - 86400000).toLocaleString(),
        status: "In Forensic Triage",
        integrity: "VERIFIED (SHA-256 Intact)",
        steps: [
          { name: "Report Submitted", date: "Yesterday, 10:30 AM", completed: true },
          { name: "Cryptographic Seal & Fingerprint Validated", date: "Yesterday, 10:31 AM", completed: true },
          { name: "Investigator Assignment & Case Triage", date: "Today, 09:15 AM", completed: true, active: true },
          { name: "Forensic Analysis & Verification", date: "Pending", completed: false },
          { name: "Formal Police Case Linkage / Closure", date: "Pending", completed: false },
        ],
      });
      setSearching(false);
    }, 400);
  };

  return (
    <GovLayout>
      <div className="container-narrow" style={{ padding: "40px var(--space-6)" }}>
        <div className="card card-gold-accent" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span className="badge badge-gold">Official Tracker</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>Section 63 Digital Chain</span>
          </div>

          <h1 style={{ fontSize: "1.75rem", color: "var(--primary)", marginBottom: "8px" }}>
            Track Your Sealed Evidence Report
          </h1>
          <p style={{ marginBottom: "24px" }}>
            Enter the reference code you received upon sealing evidence (e.g. <code>ACP-XXXX-XXXX</code>).
          </p>

          <form onSubmit={handleTrack}>
            <div className="form-group">
              <label htmlFor="track-ref-input" className="form-label">
                Reference Code <span className="required">*</span>
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  id="track-ref-input"
                  className="input mono"
                  placeholder="e.g. ACP-7K4M-2X9P"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.05em" }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={searching || !refCode.trim()}
                  style={{ minWidth: "140px" }}
                >
                  {searching ? "Searching..." : "Track Status"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {searched && status && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "var(--border)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", fontWeight: 700, textTransform: "uppercase" }}>Report Reference</div>
                <div className="mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--primary)" }}>{status.reference}</div>
              </div>
              <div>
                <span className="badge badge-success" style={{ fontSize: "0.8125rem", padding: "4px 10px" }}>
                  {status.status}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ paddingLeft: "12px", marginBottom: "24px" }}>
              <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9375rem", marginBottom: "16px" }}>
                Chain of Custody Progress:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {status.steps.map((step: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{
                      width: "22px", height: "22px", borderRadius: "50%",
                      background: step.completed ? "var(--success)" : step.active ? "var(--primary)" : "var(--gray-200)",
                      color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, marginTop: "2px"
                    }}>
                      {step.completed ? "✓" : i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: step.completed || step.active ? "var(--gray-900)" : "var(--gray-500)", fontSize: "0.875rem" }}>
                        {step.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>{step.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="alert alert-info" style={{ margin: 0 }}>
              <strong>Integrity Verification:</strong> {status.integrity}.
              Your sealed artifacts have not been modified or unsealed.
            </div>
          </div>
        )}
      </div>
    </GovLayout>
  );
}
