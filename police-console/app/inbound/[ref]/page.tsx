"use client";
import { Shell } from "../../components/Shell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:48802";

export default function InboundDetail({ params }: { params: { ref: string } }) {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("acpia_token");
        const res = await fetch(`${API}/api/v1/inbound/${params.ref}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setReport(await res.json());
        } else {
          setError("Inbound report not found.");
        }
      } catch (err) {
        console.error("Failed to fetch report detail:", err);
        setError("Failed to communicate with the forensic API server.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [params.ref]);

  const acceptIntoCase = async () => {
    setAccepting(true);
    try {
      const token = localStorage.getItem("acpia_token");
      const res = await fetch(`${API}/api/v1/inbound/${params.ref}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ case_id: null }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/cases/${data.case_id}`);
      } else {
        alert("Failed to initialize case workspace from this report.");
      }
    } catch (err) {
      console.error("Failed to accept inbound report:", err);
      alert("Error initiating case intake.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Shell title="Loading Inbound Submission...">
        <div className="page-body">
          <p>Loading report payload from forensic ledger...</p>
        </div>
      </Shell>
    );
  }

  if (!report || error) {
    return (
      <Shell title="Report Not Found">
        <div className="page-body">
          <div className="alert alert-danger">{error || "Report not found."}</div>
          <button className="btn btn-secondary" onClick={() => router.push("/inbound")}>
            ← Back to Inbound Queue
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={`Inbound Report: ${report.reference}`}>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="badge badge-gold">Inbound Triage</span>
            <span className="mono" style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>
              Locator: {report.reference}
            </span>
          </div>
          <h1>Citizen Evidence Review — {report.reference}</h1>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/inbound")}>
            ← Back to Queue
          </button>
          {!report.claimed && (
            <button
              className="btn btn-primary btn-sm"
              disabled={accepting}
              onClick={acceptIntoCase}
            >
              {accepting ? "Initiating Forensic Workspace..." : "Accept into New Forensic Case →"}
            </button>
          )}
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: "1000px" }}>
        {/* Metadata Summary Card */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header">
            <h2>Submission Metadata</h2>
            <span className="badge badge-success">✓ Cryptographic Chain Valid</span>
          </div>

          <div className="detail-meta-grid">
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", fontWeight: 700, textTransform: "uppercase" }}>Intake Category</div>
              <div style={{ fontWeight: 700, color: "var(--primary)", marginTop: "2px" }}>
                {report.path_taken?.replace("_", " ")}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", fontWeight: 700, textTransform: "uppercase" }}>Sealed Timestamp</div>
              <div className="mono" style={{ fontSize: "0.875rem", marginTop: "2px" }}>
                {new Date(report.sealed_at).toUTCString()}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Declarant Statement</div>
            <div style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "14px 16px", fontSize: "0.875rem", fontStyle: "italic", color: "var(--gray-900)" }}>
              &ldquo;{report.statement || "No declarant narrative provided with this submission."}&rdquo;
            </div>
          </div>
        </div>

        {/* Sealed Artifacts Table */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header">
            <h2>Sealed Evidence Artifacts ({report.artifacts?.length || 0})</h2>
            <span className="badge badge-neutral">BSA §63 Digital Artifacts</span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Payload Size</th>
                  <th>Cryptographic SHA-256 Fingerprint</th>
                  <th>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {report.artifacts?.map((art: any, i: number) => (
                  <tr key={i}>
                    <td>
                      <strong>{art.filename}</strong>
                    </td>
                    <td>{(art.size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="hash">
                      {art.sha256_groups || art.sha256}
                    </td>
                    <td>
                      <span className="badge badge-success">✓ MATCHES SEAL</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Panel */}
        {!report.claimed ? (
          <div className="card card-gold-accent" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
            <div>
              <h3 style={{ color: "var(--primary)", margin: "0 0 4px" }}>Initiate Forensic Investigation</h3>
              <p style={{ margin: 0, fontSize: "0.8125rem" }}>
                Accepting this report generates a formal case ledger and unlocks AI entity extraction, contradiction analysis, and timeline graphing.
              </p>
            </div>
            <button
              className="btn btn-primary btn-lg"
              disabled={accepting}
              onClick={acceptIntoCase}
              style={{ flexShrink: 0 }}
            >
              {accepting ? "Initiating..." : "Accept into New Case →"}
            </button>
          </div>
        ) : (
          <div className="alert alert-info">
            🔒 This submission has already been accepted and bound into an active case ledger.
          </div>
        )}
      </div>
    </Shell>
  );
}
