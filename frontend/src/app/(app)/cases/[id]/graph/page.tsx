"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Network, ZoomIn, ZoomOut, RefreshCw, Filter, Info } from "lucide-react";
import apiClient, { GraphData } from "@/lib/api";

// Node type colors
const NODE_COLORS: Record<string, string> = {
  Person: "#3b82f6",
  Device: "#8b5cf6",
  Platform: "#06b6d4",
  Location: "#10b981",
  FileEvidence: "#f59e0b",
};

const NODE_SHAPES: Record<string, string> = {
  Person: "ellipse",
  Device: "rectangle",
  Platform: "diamond",
  Location: "triangle",
  FileEvidence: "hexagon",
};

export default function GraphPage() {
  const params = useParams();
  const caseId = params.id as string;
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstanceRef = useRef<unknown>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<{ type: string; label: string; properties: Record<string, unknown>; risk_score?: number } | null>(null);
  const [minConfidence, setMinConfidence] = useState(0.3);
  const [depth, setDepth] = useState(2);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getGraph(caseId, { min_confidence: minConfidence, depth });
      setGraphData(data);
      setStats({ nodes: data.total_nodes, edges: data.total_edges });
    } catch (err) {
      console.error("Failed to fetch graph:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [caseId, minConfidence, depth]);

  useEffect(() => {
    if (!graphData || !cyRef.current) return;

    // Dynamic import of Cytoscape (client-side only)
    import("cytoscape").then((cytoscapeModule) => {
      const cytoscape = cytoscapeModule.default;

      // Destroy existing instance
      if (cyInstanceRef.current) {
        (cyInstanceRef.current as { destroy: () => void }).destroy();
      }

      // Build elements
      const elements = [
        ...graphData.nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            risk_score: node.risk_score,
            ...node.properties,
          },
        })),
        ...graphData.edges.map((edge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.relationship_type.replace(/_/g, " "),
            confidence: edge.confidence,
          },
        })),
      ];

      const cy = cytoscape({
        container: cyRef.current,
        elements,
        style: [
          {
            selector: "node",
            style: {
              "background-color": (ele: { data: (key: string) => string }) => NODE_COLORS[ele.data("type")] || "#64748b",
              "border-width": 2,
              "border-color": "rgba(255,255,255,0.2)",
              label: "data(label)",
              color: "#e2e8f0",
              "font-size": "11px",
              "text-valign": "bottom",
              "text-margin-y": 4,
              "text-outline-color": "#0f172a",
              "text-outline-width": 2,
              shape: (ele: { data: (key: string) => string }) => (NODE_SHAPES[ele.data("type")] as unknown as string) || "ellipse",
              width: 40,
              height: 40,
            },
          },
          {
            selector: "edge",
            style: {
              width: (ele: { data: (key: string) => number }) => Math.max(1, (ele.data("confidence") || 0.5) * 3),
              "line-color": "rgba(148, 163, 184, 0.4)",
              "target-arrow-color": "rgba(148, 163, 184, 0.4)",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              label: "data(label)",
              color: "#64748b",
              "font-size": "9px",
              "text-rotation": "autorotate",
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-color": "#f59e0b",
              "border-width": 3,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: true,
          animationDuration: 500,
          nodeRepulsion: 400000,
          idealEdgeLength: 100,
          gravity: 0.25,
        },
        // @ts-ignore
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
      });

      // Click handler
      cy.on("tap", "node", (evt: { target: { data: (key: string) => unknown; risk_score?: number } }) => {
        const node = evt.target;
        setSelectedNode({
          type: node.data("type") as string,
          label: node.data("label") as string,
          risk_score: node.data("risk_score") as number | undefined,
          properties: Object.fromEntries(
            Object.keys(node.data()).map((k) => [k, node.data(k)])
          ),
        });
      });

      cy.on("tap", (evt: { target: unknown }) => {
        if (evt.target === cy) setSelectedNode(null);
      });

      cyInstanceRef.current = cy;
    });

    return () => {
      if (cyInstanceRef.current) {
        (cyInstanceRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [graphData]);

  const handleZoomIn = () => {
    if (cyInstanceRef.current) {
      const cy = cyInstanceRef.current as { zoom: () => number; zoom: (options: { level: number }) => void };
      (cyInstanceRef.current as { zoom: (opts: unknown) => void }).zoom({ level: 1.3 });
    }
  };

  const handleZoomOut = () => {
    if (cyInstanceRef.current) {
      (cyInstanceRef.current as { zoom: (opts: unknown) => void }).zoom({ level: 0.75 });
    }
  };

  const handleFit = () => {
    if (cyInstanceRef.current) {
      (cyInstanceRef.current as { fit: (padding?: number) => void }).fit(40);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Network size={20} className="text-blue-400" />
          Knowledge Graph Explorer
        </h1>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="px-2 py-1 bg-slate-800 rounded">{stats.nodes} nodes</span>
          <span className="px-2 py-1 bg-slate-800 rounded">{stats.edges} edges</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-sm text-slate-400">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            {type}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Min Confidence:</span>
          <input
            type="range"
            min="0" max="0.9" step="0.1"
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-24"
          />
          <span>{minConfidence.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Depth:</span>
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="input" style={{ width: "80px", height: "32px" }}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <ZoomOut size={16} />
          </button>
          <button onClick={handleFit} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="graph-container relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/80 rounded-xl">
            <div className="text-center">
              <RefreshCw size={24} className="animate-spin text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Loading knowledge graph...</p>
            </div>
          </div>
        )}

        {!loading && stats.nodes === 0 && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center text-slate-500">
              <Network size={40} className="mx-auto mb-3 opacity-40" />
              <p>No graph data yet.</p>
              <p className="text-sm mt-1">Run evidence analysis to populate the knowledge graph.</p>
            </div>
          </div>
        )}

        <div ref={cyRef} id="cytoscape-container" style={{ height: "600px" }} />

        {/* Node Info Panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 card p-4 glass-strong">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: NODE_COLORS[selectedNode.type] || "#64748b" }} />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{selectedNode.type}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-slate-300">×</button>
            </div>
            <p className="text-sm font-medium text-white mb-3">{selectedNode.label}</p>
            {selectedNode.risk_score !== undefined && (
              <div className="mb-3 p-2 rounded-lg text-center"
                style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <div className="text-lg font-bold text-red-400">{Math.round(selectedNode.risk_score * 100)}%</div>
                <div className="text-xs text-slate-400">Risk Score</div>
              </div>
            )}
            <div className="space-y-1">
              {Object.entries(selectedNode.properties)
                .filter(([k]) => !["id", "label", "type", "risk_score"].includes(k))
                .slice(0, 8)
                .map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 text-xs">
                    <span className="text-slate-500 shrink-0 w-24 truncate">{k}:</span>
                    <span className="text-slate-300 truncate">{String(v).substring(0, 40)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
