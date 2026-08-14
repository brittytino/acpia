"use client";
import { Shell } from "../../components/Shell";
import { EscalationTimeline } from "../../components/EscalationTimeline";
import { KnowledgeGraph } from "../../components/KnowledgeGraph";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8765";

export default function CaseWorkspace({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [graph, setGraph] = useState<any>({ nodes: [], edges: [] });
  const [leads, setLeads] = useState<any[]>([]);
  const [impact, setImpact] = useState<any>(null);
  
  const [activeConvo, setActiveConvo] = useState<any>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCaseData = async () => {
    const token = localStorage.getItem("acpia_token");
    const headers = { Authorization: `Bearer ${token}` };
    
    // Parallel fetching for speed
    const [cRes, evRes, conRes, grRes, ldRes, imRes] = await Promise.all([
      fetch(`${API}/api/v1/cases/${params.id}`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/evidence`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/conversations`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/graph`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/leads`, { headers }),
      fetch(`${API}/api/v1/cases/${params.id}/impact`, { headers }),
    ]);

    if (cRes.ok) setCaseData(await cRes.json());
    if (evRes.ok) setEvidence(await evRes.json());
    if (conRes.ok) setConversations(await conRes.json());
    if (grRes.ok) setGraph(await grRes.json());
    if (ldRes.ok) setLeads(await ldRes.json());
    if (imRes.ok) setImpact(await imRes.json());
  };

  useEffect(() => {
    fetchCaseData();

    // WebSocket connection
    ws.current = new WebSocket(API.replace('http', 'ws') + `/api/v1/cases/${params.id}/stream`);
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WS Event:", data.event);
      if (data.event === "pipeline.started") setPipelineRunning(true);
      if (data.event === "pipeline.complete") {
        setPipelineRunning(false);
        fetchCaseData(); // Refresh all
      }
      if (data.event === "lead.created" || data.event === "lead.confirmed" || data.event === "lead.rejected") {
        fetchCaseData();
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [params.id]);

  const fetchConvoTimeline = async (convoId: string) => {
    const token = localStorage.getItem("acpia_token");
    const res = await fetch(`${API}/api/v1/conversations/${convoId}/timeline`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setActiveConvo(await res.json());
    }
  };

  const uploadFile = async (file: File) => {
    const token = localStorage.getItem("acpia_token");
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`${API}/api/v1/cases/${params.id}/evidence`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    fetchCaseData();
  };

  const runPipeline = async () => {
    setPipelineRunning(true);
    const token = localStorage.getItem("acpia_token");
    await fetch(`${API}/api/v1/cases/${params.id}/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const judgeLead = async (leadId: string, action: 'confirm' | 'reject') => {
    const token = localStorage.getItem("acpia_token");
    await fetch(`${API}/api/v1/leads/${leadId}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchCaseData();
  };

  const downloadReport = (type: 'report' | 'certificate') => {
    const token = localStorage.getItem("acpia_token");
    window.open(`${API}/api/v1/cases/${params.id}/${type}?token=${token}`, "_blank");
  };

  if (!caseData) return <Shell><div className="container">Loading...</div></Shell>;

  return (
    <Shell title={`CASE: ${caseData.reference}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 className="mono" style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>{caseData.reference}</h1>
          <p style={{ color: "var(--text)" }}>{caseData.title}</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="btn btn-ghost" onClick={() => downloadReport('report')}>Download Report PDF</button>
          <button className="btn btn-ghost" onClick={() => downloadReport('certificate')}>BSA §63 Certificate</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>
        {/* Main Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Analysis Actions */}
          <div className="card-hi" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>Intelligence Pipeline</div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>
                {evidence.filter(e => !e.processed).length} artifacts awaiting processing
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={e => e.target.files && uploadFile(e.target.files[0])} />
              <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>+ Add Evidence</button>
              <button className="btn btn-primary" onClick={runPipeline} disabled={pipelineRunning || evidence.filter(e => !e.processed).length === 0}>
                {pipelineRunning ? "Analyzing..." : "Run Analysis"}
              </button>
            </div>
          </div>

          {/* Timeline */}
          {conversations.length > 0 && (
            <div className="card">
              <div className="panel-header" style={{ marginBottom: "0" }}>
                <h2>Escalation Timeline</h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {conversations.map(c => (
                    <button key={c.id} className={`btn ${activeConvo?.conversation_id === c.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => fetchConvoTimeline(c.id)}>
                      {c.participants.join(" ⇄ ")}
                    </button>
                  ))}
                </div>
              </div>
              {activeConvo ? (
                <div style={{ paddingTop: "1rem" }}>
                  <EscalationTimeline conversation={activeConvo} />
                </div>
              ) : (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-faint)" }}>
                  Select a conversation to view trajectory
                </div>
              )}
            </div>
          )}

          {/* Graph */}
          {graph.nodes.length > 0 && <KnowledgeGraph graphData={graph} />}

          {/* Evidence Grid */}
          <div className="card">
            <div className="panel-header">
              <h2>Evidence Artifacts ({evidence.length})</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {evidence.map(e => (
                <div key={e.id} className="sealed-tile">
                  <div className="sealed-preview">
                    {e.mime_type.startsWith('image') ? <span style={{fontSize: "2rem"}}>🖼️</span> : <span style={{fontSize: "2rem"}}>📄</span>}
                    {e.revealed_count === 0 && (
                      <div className="sealed-overlay">
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em" }}>SEALED</span>
                        <button className="btn btn-primary" style={{ fontSize: "0.6875rem", padding: "0.25rem 0.5rem" }} onClick={async () => {
                          await fetch(`${API}/api/v1/evidence/${e.id}/reveal`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("acpia_token")}` }});
                          fetchCaseData();
                        }}>Reveal (logs access)</button>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "0.75rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.filename}</div>
                    <div className="hash" style={{ marginTop: "0.25rem" }}>{e.sha256.substring(0, 12)}…</div>
                    <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between" }}>
                      <span className={`badge ${e.integrity_ok ? 'badge-verified' : 'badge-alarm'}`} style={{ fontSize: "10px" }}>
                        {e.integrity_ok ? 'INTEGRITY OK' : 'FAILED'}
                      </span>
                      {e.revealed_count > 0 && <span className="label" style={{ color: "var(--text-dim)" }}>Views: {e.revealed_count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Impact Ledger */}
          <div className="card">
            <h3 style={{ marginBottom: "1rem" }}>Impact Ledger</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className="ledger-stat">
                <span className="label">Artifacts Processed</span>
                <span className="ledger-num">{impact?.artifacts_processed || 0}</span>
              </div>
              <div className="ledger-stat">
                <span className="label">Human Exposure</span>
                <span className="ledger-num" style={{ color: "var(--steel)" }}>{impact?.artifacts_viewed || 0} views</span>
              </div>
              <div className="ledger-stat" style={{ background: "rgba(62,140,126,0.1)", border: "1px solid rgba(62,140,126,0.2)" }}>
                <span className="label" style={{ color: "var(--verified)" }}>Exposure Avoided</span>
                <span className="ledger-num" style={{ color: "var(--verified)" }}>{impact?.exposure_avoided_pct || 0}%</span>
              </div>
            </div>
          </div>

          {/* Leads Queue (Human Gate) */}
          <div className="card">
            <div className="panel-header">
              <h3>Lead Queue</h3>
              <span className="badge badge-pending">{leads.filter(l => l.status === 'proposed').length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {leads.map(lead => (
                <div key={lead.id} className={`lead-item ${lead.status}`}>
                  <div className="label" style={{ marginBottom: "0.25rem", color: lead.status === 'proposed' ? 'var(--pending)' : 'var(--text-faint)' }}>
                    {lead.kind.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>{lead.summary}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <span className="label">Confidence:</span>
                    <span className="mono" style={{ fontSize: "0.75rem" }}>{lead.confidence.toFixed(2)} ± {lead.confidence_ci.toFixed(2)}</span>
                  </div>
                  
                  {lead.status === 'proposed' ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-confirm" style={{ flex: 1, justifyContent: "center" }} onClick={() => judgeLead(lead.id, 'confirm')}>
                        ✓ Confirm
                      </button>
                      <button className="btn btn-reject" style={{ flex: 1, justifyContent: "center" }} onClick={() => judgeLead(lead.id, 'reject')}>
                        ✕ Reject
                      </button>
                    </div>
                  ) : (
                    <div className="label">
                      {lead.status.toUpperCase()} BY HUMAN
                    </div>
                  )}
                </div>
              ))}
              {leads.length === 0 && <div className="label" style={{ textAlign: "center" }}>No leads generated.</div>}
            </div>
            <div className="label" style={{ marginTop: "1rem", textAlign: "center" }}>
              Structural guarantee: No code path may set CONFIRMED except authenticated human action.
            </div>
          </div>

        </div>
      </div>
    </Shell>
  );
}
