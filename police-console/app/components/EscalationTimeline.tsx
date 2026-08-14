"use client";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid } from "recharts";

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
    return {
      x: d.getTime(),
      y: STAGES.indexOf(m.stage),
      z: m.stage_conf,
      stage: m.stage,
      time: d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: m.sender,
      span: m.evidence_span,
      language: m.language,
      tamil_share: m.tamil_share
    };
  }).filter((d: any) => d.y > 0);

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
        <div style={{ background: "var(--white)", border: "var(--border)", padding: "10px 14px", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.8125rem", textTransform: "uppercase" }}>
            {d.stage.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", margin: "2px 0 6px" }}>{d.time}</div>
          <div style={{ fontSize: "0.8125rem", color: "var(--gray-900)", marginBottom: "4px" }}>
            Sender: <strong>{d.sender}</strong>
          </div>
          <div className="mono" style={{ fontSize: "0.6875rem", color: "var(--gray-500)" }}>
            Confidence: {(d.z * 100).toFixed(1)}% | {d.span}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase" }}>
            Escalation Trajectory
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", marginTop: "2px" }}>
            {conversation.participants.join(" ⇄ ")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: "0.8125rem", color: "var(--gray-900)" }}>
            Trajectory: <span style={{ fontWeight: 700, color: conversation.trajectory > 0 ? "var(--danger)" : "var(--primary)" }}>
              {conversation.trajectory > 0 ? "+" : ""}{conversation.trajectory?.toFixed(2)} stages/week
            </span>
          </div>
          {conversation.drift_ratio && conversation.drift_ratio > 1.5 && (
            <div className="badge badge-warning" style={{ marginTop: "4px" }}>
              ⚠ DRIFT ×{conversation.drift_ratio.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: "260px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="var(--gray-200)" strokeDasharray="3 3" vertical={false} />
            <XAxis 
              type="number" 
              dataKey="x" 
              domain={[minX, maxX]} 
              tickFormatter={formatXAxis}
              stroke="var(--gray-500)"
              tick={{ fill: 'var(--gray-600)', fontSize: 11 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              domain={[1, 6]} 
              ticks={[1, 2, 3, 4, 5, 6]}
              tickFormatter={(val) => STAGES[val].replace(/_/g, ' ')}
              stroke="var(--gray-500)"
              tick={{ fill: 'var(--gray-600)', fontSize: 11 }}
              width={120}
            />
            <ZAxis type="number" dataKey="z" range={[30, 90]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            <Scatter name="Messages" data={data} fill="var(--primary)">
              {data.map((entry: any, index: number) => (
                <circle key={`cell-${index}`} cx={0} cy={0} r={5} fill="var(--primary)" opacity={entry.z} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: "0.6875rem", color: "var(--gray-500)", textAlign: "right", marginTop: "4px" }}>
        Opacity indicates AI classification confidence &bull; X-axis reflects chronological timeline
      </div>
    </div>
  );
}
