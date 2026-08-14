"use client";
import { Shell } from "../../components/Shell";
import { EscalationTimeline } from "../../components/EscalationTimeline";
import { KnowledgeGraph } from "../../components/KnowledgeGraph";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:47802";
const WS_API = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:47802";

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
    ws.current = new WebSocket(`${WS_API}/api/v1/cases/${params.id}/stream`);
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WS Event:", data.event);
      switch (data.event) {
        case "pipeline.started":
          setPipelineRunning(true);
          break;
        case "pipeline.complete":
          setPipelineRunning(false);
          setImpact(data.payload);
          fetchCaseData(); // Refresh all
          break;
        case "narrative.trajectory_computed":
          // Refresh active convo if it's the one that was updated
          if (activeConvo && activeConvo.conversation_id === data.payload.conversation_id) {
            setActiveConvo(data.payload);
          }
          break;
        case "lead.created":
        case "lead.confirmed":
        case "lead.rejected":
        case "evidence.revealed":
          fetchCaseData();
          break;
        default:
          break;
      }
    };
    
    const ping = setInterval(() => ws.current?.readyState === 1 && ws.current.send("ping"), 30000);

    return () => {
      clearInterval(ping);
      if (ws.current) ws.current.close();
    };
  }, [params.id, activeConvo]);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem", padding: "2rem 2rem 1.5rem", borderBottom: "1px solid var(--rule)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Forensic Workspace</span>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--rule)" }}></span>
            <span className="mono" style={{ fontSize: "0.85rem", color: "var(--steel)", background: "rgba(29, 89, 86, 0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid rgba(29, 89, 86, 0.2)" }}>{caseData.reference}</span>
          </div>
          <h1 style={{ fontSize: "2.25rem", fontFamily: "'IBM Plex Sans', sans-serif", color: "var(--ink)", marginBottom: "0.25rem", letterSpacing: "-0.02em", fontWeight: 700 }}>{caseData.title}</h1>
          <p style={{ color: "var(--text-faint)", fontSize: "0.95rem" }}>Secured on {new Date(caseData.created_at).toLocaleDateString()}</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button style={{ background: "transparent", border: "1px solid var(--rule)", color: "var(--ink)", padding: "0.75rem 1.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "var(--slate-hi)"} onMouseOut={e => e.currentTarget.style.background = "transparent"} onClick={() => downloadReport('report')}>Download Report PDF</button>
          <button style={{ background: "transparent", border: "1px solid var(--steel)", color: "var(--steel)", padding: "0.75rem 1.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, transition: "background 0.2s", display: "flex", alignItems: "center", gap: "0.5rem" }} onMouseOver={e => e.currentTarget.style.background = "rgba(29, 89, 86, 0.1)"} onMouseOut={e => e.currentTarget.style.background = "transparent"} onClick={() => downloadReport('certificate')}>
            <span>📜</span> BSA §63 Certificate
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", padding: "0 2rem 2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Analysis Actions */}
          <div className="premium-glass-card" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "3px solid var(--steel)" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem", fontSize: "1.1rem" }}>Intelligence Pipeline</div>
              <div style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
                <span style={{ color: "var(--ink)", fontWeight: 700 }}>{evidence.filter(e => !e.processed).length}</span> artifacts awaiting forensic processing
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={e => e.target.files && uploadFile(e.target.files[0])} />
              <button style={{ background: "var(--slate-hi)", border: "1px solid var(--rule)", color: "var(--ink)", padding: "0.75rem 1.25rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 }} onClick={() => fileInputRef.current?.click()}>+ Add Evidence</button>
              <button style={{ background: pipelineRunning ? "rgba(29, 89, 86, 0.2)" : "var(--steel)", border: "none", color: "white", padding: "0.75rem 1.5rem", borderRadius: "var(--radius-sm)", cursor: pipelineRunning || evidence.filter(e => !e.processed).length === 0 ? "not-allowed" : "pointer", fontSize: "0.9rem", fontWeight: 600, opacity: pipelineRunning || evidence.filter(e => !e.processed).length === 0 ? 0.5 : 1, display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={runPipeline} disabled={pipelineRunning || evidence.filter(e => !e.processed).length === 0}>
                {pipelineRunning ? <><span style={{ animation: "spin 1s linear infinite" }}>⚙️</span> Analyzing...</> : "Run Analysis →"}
              </button>
            </div>
          </div>

          {/* Timeline */}
          {conversations.length > 0 && (
            <div className="panel" style={{ background: "transparent", border: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem", borderBottom: "1px solid var(--rule)", paddingBottom: "0.75rem" }}>
                <h2 style={{ fontSize: "1.25rem", color: "var(--ink)", fontWeight: 600 }}>Behavioral Trajectory</h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {conversations.map(c => (
                    <button key={c.id} style={{ background: activeConvo?.conversation_id === c.id ? "rgba(29, 89, 86, 0.15)" : "var(--slate-hi)", border: `1px solid ${activeConvo?.conversation_id === c.id ? 'rgba(29, 89, 86, 0.3)' : 'var(--rule)'}`, color: activeConvo?.conversation_id === c.id ? "var(--steel-hi)" : "var(--text-dim)", padding: "0.4rem 0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }} onClick={() => fetchConvoTimeline(c.id)}>
                      {c.participants.join(" ⇄ ")}
                    </button>
                  ))}
                </div>
              </div>
              {activeConvo ? (
                <div className="timeline-canvas" style={{ background: "var(--slate-hi)" }}>
                  <EscalationTimeline conversation={activeConvo} />
                </div>
              ) : (
                <div className="premium-glass-card" style={{ padding: "4rem", textAlign: "center", color: "var(--text-faint)" }}>
                  Select a communication channel to view its behavioral trajectory
                </div>
              )}
            </div>
          )}

          {/* Graph */}
          {graph.nodes.length > 0 && (
            <div className="panel" style={{ background: "transparent", border: "none" }}>
              <h2 style={{ fontSize: "1.25rem", color: "var(--ink)", fontWeight: 600, marginBottom: "1rem", borderBottom: "1px solid var(--rule)", paddingBottom: "0.75rem" }}>Entity Relationships</h2>
              <div className="premium-glass-card" style={{ overflow: "hidden", background: "var(--slate-hi)" }}>
                <KnowledgeGraph graphData={graph} />
              </div>
            </div>
          )}

          {/* Evidence Grid */}
          <div className="panel" style={{ background: "transparent", border: "none" }}>
            <h2 style={{ fontSize: "1.25rem", color: "var(--ink)", fontWeight: 600, marginBottom: "1rem", borderBottom: "1px solid var(--rule)", paddingBottom: "0.75rem" }}>Secured Artifacts ({evidence.length})</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {evidence.map(e => (
                <div key={e.id} className="premium-glass-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--slate-hi)" }}>
                  <div style={{ height: "120px", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {e.mime_type.startsWith('image') ? <span style={{fontSize: "2.5rem"}}>🖼️</span> : <span style={{fontSize: "2.5rem"}}>📄</span>}
                    {e.revealed_count === 0 && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(253,251,247,0.8)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", color: "var(--pending)" }}>SEALED</span>
                        <button style={{ background: "var(--steel)", border: "none", color: "white", padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }} onClick={async () => {
                          await fetch(`${API}/api/v1/evidence/${e.id}/reveal`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("acpia_token")}` }});
                          fetchCaseData();
                        }}>Reveal (logs access)</button>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.25rem" }}>{e.filename}</div>
                    <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>{e.sha256.substring(0, 16)}…</div>
                    <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", padding: "0.2rem 0.5rem", borderRadius: "4px", background: e.integrity_ok ? "var(--verified-bg)" : "var(--rejected-bg)", color: e.integrity_ok ? "var(--verified)" : "var(--rejected)", border: `1px solid ${e.integrity_ok ? 'rgba(29,89,86,0.2)' : 'rgba(158,57,53,0.2)'}` }}>
                        {e.integrity_ok ? '✓ INTEGRITY OK' : '✕ FAILED'}
                      </span>
                      {e.revealed_count > 0 && <span style={{ fontSize: "0.7rem", color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: "0.25rem" }}>👁️ {e.revealed_count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Impact Ledger */}
          <div className="premium-glass-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", color: "var(--ink)", fontWeight: 600, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>⚖️</span> Impact Ledger
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px dashed var(--rule)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>Artifacts Processed</span>
                <span className="mono" style={{ color: "var(--ink)", fontWeight: 600 }}>{impact?.artifacts_processed || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px dashed var(--rule)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>Human Exposure</span>
                <span className="mono" style={{ color: "var(--steel)", fontWeight: 600 }}>{impact?.artifacts_viewed || 0} views</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "var(--verified-bg)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(29,89,86,0.2)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--verified)", fontWeight: 600 }}>Exposure Avoided</span>
                <span className="mono" style={{ color: "var(--verified)", fontWeight: 700, fontSize: "1.1rem" }}>{impact?.exposure_avoided_pct || 0}%</span>
              </div>
            </div>
          </div>

          {/* Leads Queue (Human Gate) */}
          <div className="premium-glass-card" style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "800px" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--slate-hi)" }}>
              <h3 style={{ fontSize: "1.1rem", color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>🎯</span> Lead Queue
              </h3>
              {leads.filter(l => l.status === 'proposed').length > 0 && (
                <span style={{ background: "var(--pending-bg)", color: "var(--pending)", fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "100px", fontWeight: 700 }}>
                  {leads.filter(l => l.status === 'proposed').length} PENDING
                </span>
              )}
            </div>
            
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {leads.map(lead => (
                <div key={lead.id} style={{ background: "var(--slate-hi)", border: `1px solid ${lead.status === 'proposed' ? 'rgba(180,134,58,0.3)' : 'var(--rule)'}`, borderRadius: "var(--radius-md)", padding: "1.25rem", borderLeft: `3px solid ${lead.status === 'proposed' ? 'var(--pending)' : 'var(--rule)'}` }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem", color: lead.status === 'proposed' ? 'var(--pending)' : 'var(--text-faint)' }}>
                    {lead.kind.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "var(--ink)", marginBottom: "0.75rem", lineHeight: 1.5, fontWeight: 500 }}>{lead.summary}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", background: "var(--card)", padding: "0.4rem 0.75rem", borderRadius: "4px", width: "fit-content", border: "1px solid var(--rule)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontWeight: 600 }}>AI Confidence:</span>
                    <span className="mono" style={{ fontSize: "0.85rem", color: "var(--steel)", fontWeight: 600 }}>{lead.confidence.toFixed(2)}</span>
                    <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>± {lead.confidence_ci.toFixed(2)}</span>
                  </div>
                  
                  {lead.status === 'proposed' ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button style={{ flex: 1, background: "rgba(29,89,86,0.1)", border: "1px solid rgba(29,89,86,0.3)", color: "var(--verified)", padding: "0.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "all 0.2s" }} onMouseOver={e => {e.currentTarget.style.background = "rgba(29,89,86,0.2)"}} onMouseOut={e => {e.currentTarget.style.background = "rgba(29,89,86,0.1)"}} onClick={() => judgeLead(lead.id, 'confirm')}>
                        ✓ Confirm
                      </button>
                      <button style={{ flex: 1, background: "rgba(158,57,53,0.1)", border: "1px solid rgba(158,57,53,0.3)", color: "var(--rejected)", padding: "0.5rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "all 0.2s" }} onMouseOver={e => {e.currentTarget.style.background = "rgba(158,57,53,0.2)"}} onMouseOut={e => {e.currentTarget.style.background = "rgba(158,57,53,0.1)"}} onClick={() => judgeLead(lead.id, 'reject')}>
                        ✕ Reject
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-faint)", background: "rgba(11,27,54,0.05)", padding: "0.5rem", textAlign: "center", borderRadius: "var(--radius-sm)" }}>
                      {lead.status.toUpperCase()} BY HUMAN
                    </div>
                  )}
                </div>
              ))}
              {leads.length === 0 && <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-faint)", fontSize: "0.9rem" }}>No leads generated.</div>}
            </div>
            <div style={{ padding: "1rem", background: "var(--slate-hi)", borderTop: "1px solid var(--rule)", fontSize: "0.7rem", color: "var(--ink-soft)", textAlign: "center", letterSpacing: "0.03em", fontWeight: 600 }}>
              STRUCTURAL GUARANTEE: NO CODE PATH MAY SET CONFIRMED EXCEPT AUTHENTICATED HUMAN ACTION.
            </div>
          </div>

        </div>
      </div>
    </Shell>
  );
}
