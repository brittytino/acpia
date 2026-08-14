"use client";
import { Shell } from "../../components/Shell";
import { EscalationTimeline } from "../../components/EscalationTimeline";
import { KnowledgeGraph } from "../../components/KnowledgeGraph";
import { ContradictionBoard } from "../../components/ContradictionBoard";
import { EvidenceTile } from "../../components/EvidenceTile";
import { PairPanel } from "../../components/PairPanel";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:47802` : "http://localhost:47802");
const WS_API = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== "undefined" ? `ws://${window.location.hostname}:47802` : "ws://localhost:47802");

export default function CaseWorkspace({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [graph, setGraph] = useState<any>({ nodes: [], edges: [] });
  const [leads, setLeads] = useState<any[]>([]);
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [disputeCodes, setDisputeCodes] = useState<any[]>([]);
  const [impact, setImpact] = useState<any>(null);

  const [activeConvo, setActiveConvo] = useState<any>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [uploadRole, setUploadRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("evidence");
  const ws = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCaseData = async () => {
    const token = localStorage.getItem("acpia_token");
    const headers = { Authorization: `Bearer ${token}` };

    const [cRes, evRes, conRes, grRes, ldRes, imRes, ctRes] = await Promise.all([
      fetch(`${API}/api/v1/cases/${params.id}`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/evidence`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/conversations`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/graph`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/leads`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/impact`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/contradictions`, { headers }),
    ]);

    let type = "guard";
    if (cRes.ok) { const cd = await cRes.json(); setCaseData(cd); type = cd.case_type; }
    if (evRes.ok) setEvidence(await evRes.json());
    if (conRes.ok) setConversations(await conRes.json());
    if (grRes.ok) setGraph(await grRes.json());
    if (ldRes.ok) setLeads(await ldRes.json());
    if (imRes.ok) setImpact(await imRes.json());
    if (ctRes.ok) setContradictions(await ctRes.json());

    if (type === "fair") {
      const dcRes = await fetch(`${API}/api/v1/cases/${params.id}/dispute-codes`, { headers });
      if (dcRes.ok) setDisputeCodes(await dcRes.json());
    }
  };

  useEffect(() => {
    fetchCaseData();

    const wsToken = localStorage.getItem("acpia_token") || "";
    ws.current = new WebSocket(`${WS_API}/api/v1/cases/${params.id}/stream?token=${encodeURIComponent(wsToken)}`);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.event) {
          case "pipeline.started":
            setPipelineRunning(true);
            break;
          case "pipeline.complete":
            setPipelineRunning(false);
            setImpact(data.payload);
            fetchCaseData();
            break;
          case "narrative.trajectory_computed":
            if (activeConvo && activeConvo.conversation_id === data.payload?.conversation_id) {
              setActiveConvo(data.payload);
            }
            break;
          case "lead.created":
          case "lead.confirmed":
          case "lead.rejected":
          case "evidence.revealed":
          case "contradiction.found":
          case "contradiction.confirmed":
          case "contradiction.dismissed":
          case "dispute.submitted":
          case "evidence.paired":
            fetchCaseData();
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    const ping = setInterval(() => ws.current?.readyState === 1 && ws.current.send("ping"), 25000);

    return () => {
      clearInterval(ping);
      if (ws.current) ws.current.close();
    };
  }, [params.id]);

  const fetchConvoTimeline = async (convoId: string) => {
    const token = localStorage.getItem("acpia_token");
    const res = await fetch(`${API}/api/v1/conversations/${convoId}/timeline`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setActiveConvo(await res.json());
    }
  };

  const uploadFile = async (file: File) => {
    const token = localStorage.getItem("acpia_token");
    const formData = new FormData();
    formData.append("file", file);
    if (uploadRole) formData.append("submitter_role", uploadRole);
    const res = await fetch(`${API}/api/v1/cases/${params.id}/evidence`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.detail || "Evidence upload failed.");
    }
    fetchCaseData();
  };

  const runPipeline = async () => {
    setPipelineRunning(true);
    const token = localStorage.getItem("acpia_token");
    await fetch(`${API}/api/v1/cases/${params.id}/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const judgeLead = async (leadId: string, action: "confirm" | "reject") => {
    const token = localStorage.getItem("acpia_token");
    await fetch(`${API}/api/v1/leads/${leadId}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCaseData();
  };

  const downloadReport = async (type: "report" | "certificate") => {
    // Fetch with the token in an Authorization header rather than the URL —
    // a token in the URL ends up in browser history and server access
    // logs, and can leak via the Referer header of whatever the opened tab
    // navigates to next.
    const token = localStorage.getItem("acpia_token");
    const res = await fetch(`${API}/api/v1/cases/${params.id}/${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (!caseData) {
    return (
      <Shell title="Loading Case Workspace...">
        <div className="page-body">
          <p>Loading case ledger from forensic repository...</p>
        </div>
      </Shell>
    );
  }

  const isFair = caseData.case_type === "fair";
  const unanalyzedCount = evidence.filter((e) => !e.processed).length;
  const pendingLeadsCount = leads.filter((l) => l.status === "proposed").length;

  return (
    <Shell title={`Case: ${caseData.reference}`}>
      {/* Case Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className={`badge ${isFair ? "badge-fair" : "badge-guard"}`}>
              {isFair ? "FAIR Dual-Blind Dispute" : "GUARD Single Investigation"}
            </span>
            <span className="mono" style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>
              {caseData.reference}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
              &bull; Secured {new Date(caseData.created_at).toLocaleDateString()}
            </span>
          </div>
          <h1>{caseData.title}</h1>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {isFair && (
            <button
              className="btn btn-info btn-sm"
              onClick={() => setActiveTab("compare")}
              style={{ background: "var(--secondary)", color: "#fff", border: "none" }}
            >
              🔍 Compare Evidence
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => downloadReport("report")}>
            📄 Download Report PDF
          </button>
          <button className="btn btn-gold btn-sm" onClick={() => downloadReport("certificate")}>
            📜 BSA §63 Certificate
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === "evidence" ? "active" : ""}`}
          onClick={() => setActiveTab("evidence")}
        >
          Secured Evidence ({evidence.length})
        </button>
        {isFair && (
          <button
            className={`tab-btn ${activeTab === "contradictions" ? "active" : ""}`}
            onClick={() => setActiveTab("contradictions")}
          >
            Contradiction Board ({contradictions.length})
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === "leads" ? "active" : ""}`}
          onClick={() => setActiveTab("leads")}
        >
          Lead Decision Queue {pendingLeadsCount > 0 && `(${pendingLeadsCount})`}
        </button>
        <button
          className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          Behavioral Trajectory
        </button>
        {isFair && (
          <button
            className={`tab-btn ${activeTab === "compare" ? "active" : ""}`}
            onClick={() => setActiveTab("compare")}
          >
            🔍 Evidence Comparison
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === "ai-analysis" ? "active" : ""}`}
          onClick={() => setActiveTab("ai-analysis")}
        >
          🤖 AI Analysis ({evidence.filter((e: any) => e.processed).length})
        </button>
        <button
          className={`tab-btn ${activeTab === "graph" ? "active" : ""}`}
          onClick={() => setActiveTab("graph")}
        >
          Entity Graph
        </button>
      </div>

      <div className="page-body">
        {/* Main Split Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>
          {/* Main Content Area */}
          <div>
            {/* Blind Dual Submission Status (if FAIR) */}
            {isFair && disputeCodes.length > 0 && (
              <div className="card card-gold-accent" style={{ marginBottom: "20px" }}>
                <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9375rem", marginBottom: "8px" }}>
                  Blind Dual Submission Status
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                  {disputeCodes.map((dc) => (
                    <div key={dc.role} style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--gray-600)" }}>
                          {dc.role}
                        </span>
                        <span className={`badge ${dc.submitted ? "badge-success" : "badge-warning"}`}>
                          {dc.submitted ? "✓ SUBMITTED" : "AWAITING CODE SUBMISSION"}
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>
                        {dc.code}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>
                  Neither party can see the opposite party&apos;s submissions. Isolation is enforced at the database query layer.
                </div>
              </div>
            )}

            {/* Intelligence Pipeline Action Bar */}
            <div className="card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9375rem" }}>
                  AI Intelligence & Entity Extraction Pipeline
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--gray-600)" }}>
                  <strong>{unanalyzedCount}</strong> evidence artifact{unanalyzedCount !== 1 ? "s" : ""} awaiting forensic analysis
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {isFair && (
                  <select
                    className="input"
                    value={uploadRole}
                    onChange={(e) => setUploadRole(e.target.value)}
                    style={{ width: "160px", fontSize: "0.75rem", padding: "6px 8px" }}
                  >
                    <option value="">Unassigned / Investigator</option>
                    <option value="complainant">From Complainant</option>
                    <option value="respondent">From Respondent</option>
                  </select>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Add File
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={pipelineRunning || unanalyzedCount === 0}
                  onClick={runPipeline}
                >
                  {pipelineRunning ? "Processing Pipeline..." : "Run Analysis Pipeline →"}
                </button>
              </div>
            </div>

            {/* TAB: Evidence Grid */}
            {activeTab === "evidence" && (
              <div className="card">
                <div className="card-header">
                  <h2>Secured Evidence Artifacts ({evidence.length})</h2>
                  <span className="badge badge-gold">Two-Score Verification</span>
                </div>
                {evidence.length === 0 ? (
                  <p style={{ color: "var(--gray-500)", padding: "20px" }}>No evidence artifacts attached to this case.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
                    {evidence.map((e) => (
                      <EvidenceTile key={e.id} e={e} onRevealed={fetchCaseData} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Contradiction Board */}
            {activeTab === "contradictions" && isFair && (
              <ContradictionBoard contradictions={contradictions} onJudged={fetchCaseData} />
            )}

            {/* TAB: Lead Decision Queue */}
            {activeTab === "leads" && (
              <div className="card">
                <div className="card-header">
                  <h2>Human Decision Gate — Lead Queue ({leads.length})</h2>
                  <span className="badge badge-neutral">Required Human Oversight</span>
                </div>

                <div className="alert alert-info" style={{ fontSize: "0.75rem", padding: "8px 12px", marginBottom: "16px" }}>
                  <strong>Statutory Constraint:</strong> No AI code path may confirm a lead. Confirmation requires explicit authenticated investigator action.
                </div>

                {leads.length === 0 ? (
                  <p style={{ color: "var(--gray-500)", padding: "20px" }}>No leads generated. Run the intelligence pipeline on evidence files.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {leads.map((lead) => (
                      <div
                        key={lead.id}
                        style={{
                          background: "var(--gray-50)",
                          border: "var(--border)",
                          borderRadius: "var(--radius-sm)",
                          padding: "14px 16px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span className="badge badge-neutral">{lead.kind?.replace(/_/g, " ")}</span>
                          <span className="mono" style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>
                            Confidence: {lead.confidence?.toFixed(2)} &plusmn; {lead.confidence_ci?.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, color: "var(--gray-900)", marginBottom: "12px", fontSize: "0.875rem" }}>
                          {lead.summary}
                        </div>

                        {lead.status === "proposed" ? (
                          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button className="btn btn-confirm btn-sm" onClick={() => judgeLead(lead.id, "confirm")}>
                              ✓ Confirm Lead
                            </button>
                            <button className="btn btn-reject btn-sm" onClick={() => judgeLead(lead.id, "reject")}>
                              ✕ Reject Lead
                            </button>
                          </div>
                        ) : (
                          <div style={{ textAlign: "right" }}>
                            <span className={`badge ${lead.status === "confirmed" ? "badge-success" : "badge-danger"}`}>
                              {lead.status?.toUpperCase()} BY INVESTIGATOR
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Behavioral Trajectory */}
            {activeTab === "timeline" && (
              <div>
                {conversations.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        className={`btn ${activeConvo?.conversation_id === c.id ? "btn-primary" : "btn-secondary"} btn-sm`}
                        onClick={() => fetchConvoTimeline(c.id)}
                      >
                        {c.participants.join(" ⇄ ")}
                      </button>
                    ))}
                  </div>
                )}
                {activeConvo ? (
                  <EscalationTimeline conversation={activeConvo} />
                ) : (
                  <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--gray-500)" }}>
                    Select a conversation thread above or run analysis pipeline to chart escalation trajectory.
                  </div>
                )}
              </div>
            )}

            {/* TAB: Entity Graph */}
            {/* TAB: AI Analysis */}
            {activeTab === "ai-analysis" && (
              <div className="card">
                <div className="card-header">
                  <h2>🤖 AI Analysis Results</h2>
                  <span className="badge badge-info">{evidence.filter((e: any) => e.processed).length} Analyzed</span>
                </div>

                {evidence.filter((e: any) => e.processed).length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--gray-500)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
                    No evidence has been processed by the AI pipeline yet.<br />
                    Upload evidence and click <strong>"Run Analysis Pipeline"</strong> above.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {evidence.filter((e: any) => e.processed).map((e: any) => (
                      <div key={e.id} style={{
                        background: "var(--gray-50)", border: "var(--border)",
                        borderRadius: "var(--radius-sm)", padding: "16px 20px"
                      }}>
                        {/* File Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "1.25rem" }}>
                              {e.mime_type?.startsWith("image") ? "🖼️" : e.mime_type?.startsWith("video") ? "🎬" : e.mime_type?.startsWith("text") ? "💬" : "📄"}
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--gray-900)" }}>{e.filename}</div>
                              <div className="mono" style={{ fontSize: "0.6875rem", color: "var(--gray-500)" }}>SHA-256: {e.sha256?.slice(0, 24)}...</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            {e.submitter_role && (
                              <span className={`badge ${e.submitter_role === "complainant" ? "badge-info" : "badge-gold"}`}>
                                {e.submitter_role.toUpperCase()}
                              </span>
                            )}
                            {e.relevance != null && (
                              <span style={{
                                fontSize: "0.6875rem", fontWeight: 900,
                                background: e.relevance >= 0.7 ? "var(--success)" : e.relevance >= 0.4 ? "var(--warning)" : "var(--gray-400)",
                                color: "#fff", padding: "3px 8px", borderRadius: "4px"
                              }}>
                                Relevance: {(e.relevance * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* AI Description */}
                        {e.description && (
                          <div style={{ marginBottom: "10px", background: "var(--info-bg)", border: "1px solid var(--info-border)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--info)", marginBottom: "4px" }}>AI Description</div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--gray-900)", lineHeight: 1.5 }}>{e.description}</div>
                          </div>
                        )}

                        {/* OCR Text */}
                        {e.ocr_text && (
                          <div style={{ marginBottom: "10px", background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--gray-600)", marginBottom: "4px" }}>OCR Extracted Text</div>
                            <div className="mono" style={{ fontSize: "0.75rem", color: "var(--gray-800)", whiteSpace: "pre-wrap", maxHeight: "120px", overflow: "auto" }}>
                              {e.ocr_text}
                            </div>
                          </div>
                        )}

                        {/* EXIF Metadata */}
                        {e.exif && Object.keys(e.exif).length > 0 && (
                          <div style={{ marginBottom: "10px", background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--gray-600)", marginBottom: "6px" }}>Embedded Metadata (EXIF)</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                              {Object.entries(e.exif).slice(0, 10).map(([key, val]: [string, any]) => (
                                <div key={key} style={{ fontSize: "0.6875rem" }}>
                                  <span style={{ color: "var(--gray-500)" }}>{key}:</span>{" "}
                                  <span style={{ color: "var(--gray-900)", fontWeight: 600 }}>{String(val).slice(0, 40)}</span>
                                </div>
                              ))}
                            </div>
                            {Object.keys(e.exif).length > 10 && (
                              <div style={{ fontSize: "0.625rem", color: "var(--gray-500)", marginTop: "4px" }}>
                                +{Object.keys(e.exif).length - 10} more metadata fields
                              </div>
                            )}
                          </div>
                        )}

                        {/* Authenticity Indicators */}
                        {(e.authenticity_indicators || []).length > 0 && (
                          <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--warning)", marginBottom: "6px" }}>
                              ⚠ Authenticity Indicators ({e.authenticity_indicators.length})
                            </div>
                            {e.authenticity_indicators.map((ind: any, idx: number) => (
                              <div key={idx} style={{ fontSize: "0.75rem", marginBottom: "4px" }}>
                                <strong style={{ color: "var(--gray-900)" }}>• {ind.detail}</strong>
                                <div style={{ fontStyle: "italic", color: "var(--gray-500)", fontSize: "0.6875rem" }}>
                                  Caveat: {ind.caveat}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "graph" && (
              <KnowledgeGraph graphData={graph} />
            )}

            {/* TAB: Evidence Comparison (FAIR cases only) */}
            {activeTab === "compare" && isFair && (() => {
              const complainantEvidence = evidence.filter((e) => e.submitter_role === "complainant");
              const respondentEvidence = evidence.filter((e) => e.submitter_role === "respondent");
              const complainantHashes = new Set(complainantEvidence.map((e) => e.sha256));
              const respondentHashes = new Set(respondentEvidence.map((e) => e.sha256));

              return (
                <div>
                  <div className="card" style={{ marginBottom: "20px" }}>
                    <div className="card-header">
                      <h3>🔍 Evidence Comparison Report — Complainant vs Respondent</h3>
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                        {/* Complainant Column */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <span className="badge badge-info">COMPLAINANT</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>{complainantEvidence.length} file(s)</span>
                          </div>
                          {complainantEvidence.length === 0 ? (
                            <div style={{ padding: "16px", background: "var(--gray-50)", borderRadius: "var(--radius-sm)", color: "var(--gray-500)", fontSize: "0.8125rem", textAlign: "center" }}>
                              No complainant evidence submitted yet
                            </div>
                          ) : complainantEvidence.map((e) => {
                            const matchedByRespondent = respondentHashes.has(e.sha256);
                            return (
                              <div key={e.id} style={{
                                padding: "10px 14px", border: "1px solid",
                                borderColor: matchedByRespondent ? "var(--success-border)" : "var(--gray-200)",
                                background: matchedByRespondent ? "var(--success-bg)" : "var(--white)",
                                borderRadius: "var(--radius-sm)", marginBottom: "8px"
                              }}>
                                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--gray-900)", marginBottom: "2px" }}>{e.filename}</div>
                                <div className="mono" style={{ fontSize: "0.6875rem", color: "var(--gray-600)" }}>{e.sha256?.slice(0, 32)}...</div>
                                {matchedByRespondent && (
                                  <div style={{ fontSize: "0.6875rem", color: "var(--success)", fontWeight: 700, marginTop: "4px" }}>
                                    ⚠ Same hash as respondent file — possible shared origin
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Respondent Column */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <span className="badge badge-gold">RESPONDENT</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>{respondentEvidence.length} file(s)</span>
                          </div>
                          {respondentEvidence.length === 0 ? (
                            <div style={{ padding: "16px", background: "var(--gray-50)", borderRadius: "var(--radius-sm)", color: "var(--gray-500)", fontSize: "0.8125rem", textAlign: "center" }}>
                              No respondent evidence submitted yet
                            </div>
                          ) : respondentEvidence.map((e) => {
                            const matchedByComplainant = complainantHashes.has(e.sha256);
                            return (
                              <div key={e.id} style={{
                                padding: "10px 14px", border: "1px solid",
                                borderColor: matchedByComplainant ? "var(--success-border)" : "var(--gray-200)",
                                background: matchedByComplainant ? "var(--success-bg)" : "var(--white)",
                                borderRadius: "var(--radius-sm)", marginBottom: "8px"
                              }}>
                                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--gray-900)", marginBottom: "2px" }}>{e.filename}</div>
                                <div className="mono" style={{ fontSize: "0.6875rem", color: "var(--gray-600)" }}>{e.sha256?.slice(0, 32)}...</div>
                                {matchedByComplainant && (
                                  <div style={{ fontSize: "0.6875rem", color: "var(--success)", fontWeight: 700, marginTop: "4px" }}>
                                    ⚠ Same hash as complainant file — possible shared origin
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ background: "var(--info-bg)", border: "1px solid var(--info-border)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: "0.8125rem" }}>
                        <strong>Comparison Result:</strong>{" "}
                        {complainantEvidence.length === 0 || respondentEvidence.length === 0
                          ? "Waiting for both parties to submit evidence."
                          : (() => {
                              const matches = Array.from(complainantHashes).filter((h) => respondentHashes.has(h as string)).length;
                              return matches > 0
                                ? `${matches} file(s) share the same SHA-256 hash — these files are cryptographically identical and may represent shared evidence or tampered copies.`
                                : "No matching hashes found — both sides submitted unique files. Download the Case Report PDF for the full forensic analysis.";
                            })()}
                      </div>

                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: "14px" }}
                        onClick={() => downloadReport("report")}
                      >
                        📄 Download Full Case Report PDF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Column: Pairing & Impact Ledger */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <PairPanel caseId={params.id} />

            {/* Impact Ledger Panel */}
            <div className="card">
              <div className="card-header">
                <h3>⚖️ Impact Ledger</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8125rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "var(--border)", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--gray-600)" }}>Artifacts Processed:</span>
                  <strong>{impact?.artifacts_processed || 0}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "var(--border)", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--gray-600)" }}>Human Views:</span>
                  <strong>{impact?.artifacts_viewed || 0} views</strong>
                </div>
                <div style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ color: "var(--success)", fontWeight: 700, fontSize: "0.75rem" }}>EXPOSURE AVOIDED:</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--success)" }}>
                    {impact?.exposure_avoided_pct || 0}%
                  </div>
                </div>
                {impact?.note && (
                  <div style={{ fontSize: "0.6875rem", color: "var(--gray-500)", fontStyle: "italic" }}>
                    {impact.note}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
