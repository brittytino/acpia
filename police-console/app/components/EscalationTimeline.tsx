"use client";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

const STAGES = [
  "none",
  "rapport_building",
  "trust_exclusivity",
  "dependency",
  "isolation",
  "desensitization",
  "solicitation"
];

export function EscalationTimeline({ conversation }: { conversation: any }) {
  if (!conversation || !conversation.messages) return <div className="card">No timeline data available.</div>;

  const data = conversation.messages.map((m: any) => {
    const d = new Date(m.sent_at);
    // Convert to relative days from first message for X axis
    return {
      x: d.getTime(),
      y: STAGES.indexOf(m.stage),
      z: m.stage_conf,
      stage: m.stage,
      time: d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: m.sender,
      span: m.evidence_span
    };
  }).filter((d: any) => d.y > 0); // Ignore 'none' for clear trend visualization

  if (data.length === 0) return <div className="card">No escalation stages detected in this conversation.</div>;

  const minX = Math.min(...data.map((d: any) => d.x));
  const maxX = Math.max(...data.map((d: any) => d.x));

  const formatXAxis = (tickItem: number) => {
    const d = new Date(tickItem);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{ background: "var(--slate-hi)", border: "1px solid var(--rule)", padding: "0.75rem", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-md)" }}>
          <div className="label" style={{ color: "var(--steel)", marginBottom: "0.25rem" }}>{d.stage.replace('_', ' ')}</div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text)", marginBottom: "0.25rem" }}>{d.time}</div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)", marginBottom: "0.25rem" }}>Sender: {d.sender}</div>
          <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>Conf: {(d.z * 100).toFixed(1)}% | {d.span}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="timeline-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <div>
          <div className="label">Escalation Timeline</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text)", marginTop: "0.25rem" }}>
            {conversation.participants.join(" ⇄ ")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
            Trajectory: <span style={{ color: conversation.trajectory > 0 ? "var(--integrity)" : "var(--steel)" }}>
              {conversation.trajectory > 0 ? "+" : ""}{conversation.trajectory?.toFixed(2)} stages/week
            </span>
          </div>
          {conversation.drift_ratio && conversation.drift_ratio > 1.5 && (
            <div className="badge badge-alarm" style={{ marginTop: "0.5rem" }}>
              ⚠ DRIFT ×{conversation.drift_ratio.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: "300px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" vertical={false} />
            <XAxis 
              type="number" 
              dataKey="x" 
              domain={[minX, maxX]} 
              tickFormatter={formatXAxis}
              stroke="var(--text-faint)"
              tick={{ fill: 'var(--text-faint)', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              domain={[1, 6]} 
              ticks={[1, 2, 3, 4, 5, 6]}
              tickFormatter={(val) => STAGES[val].replace('_', ' ')}
              stroke="var(--text-faint)"
              tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
              width={100}
            />
            <ZAxis type="number" dataKey="z" range={[20, 100]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            <Scatter name="Messages" data={data} fill="var(--steel)">
              {data.map((entry: any, index: number) => (
                <circle key={`cell-${index}`} cx={0} cy={0} r={4} fill="var(--steel)" opacity={entry.z} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="label" style={{ textAlign: "right", marginTop: "0.5rem" }}>
        Opacity indicates classification confidence
      </div>
    </div>
  );
}
