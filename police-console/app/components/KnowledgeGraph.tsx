"use client";
import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
// @ts-ignore
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

export function KnowledgeGraph({ graphData }: { graphData: { nodes: any[]; edges: any[] } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || !graphData || graphData.nodes.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graphData.nodes, ...graphData.edges],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "var(--slate-hi)",
            "border-width": 2,
            "border-color": "var(--rule)",
            label: "data(label)",
            color: "var(--text)",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 6,
            "font-size": "11px",
            "font-family": "'IBM Plex Sans', sans-serif",
            width: 32,
            height: 32,
          }
        },
        {
          selector: 'node[kind="person"]',
          style: {
            "background-color": "var(--void)",
            "border-color": "var(--steel)",
            shape: "ellipse"
          }
        },
        {
          selector: 'node[kind="file"]',
          style: {
            "background-color": "var(--void)",
            "border-color": "var(--text-dim)",
            shape: "rectangle"
          }
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "var(--rule)",
            "target-arrow-color": "var(--rule)",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(kind)",
            "font-size": "9px",
            "text-rotation": "autorotate",
            "text-background-opacity": 1,
            "text-background-color": "var(--void)",
            color: "var(--text-faint)",
            "font-family": "'IBM Plex Mono', monospace",
          }
        },
        {
          selector: 'edge[kind="similarity"]',
          style: {
            "line-style": "dashed",
            "line-color": "var(--pending)",
            "target-arrow-color": "var(--pending)",
          }
        }
      ],
      layout: {
        name: "dagre",
        rankDir: "TB",
        spacingFactor: 1.2,
        animate: true,
      }
    });

    // Add interactivity
    cy.on('tap', 'node', function(evt){
      const node = evt.target;
      cy.elements().removeClass('highlighted');
      node.neighborhood().addClass('highlighted');
      node.addClass('highlighted');
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [graphData]);

  if (!graphData || graphData.nodes.length === 0) {
    return <div className="card" style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>No graph data available. Run pipeline to extract nodes.</div>;
  }

  return (
    <div style={{ position: "relative" }}>
      <div className="panel-header" style={{ marginBottom: "0.5rem" }}>
        <h2>Identity Resolution Graph</h2>
      </div>
      <div ref={containerRef} className="graph-container" style={{ height: "400px" }} />
      <div style={{ position: "absolute", bottom: "1rem", left: "1rem", display: "flex", gap: "1rem", background: "var(--slate-hi)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--rule)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid var(--steel)" }}></div> Person
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
          <div style={{ width: "12px", height: "12px", border: "2px solid var(--text-dim)" }}></div> File
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
          <div style={{ width: "16px", height: "2px", borderTop: "2px dashed var(--pending)" }}></div> Similarity Link (AI)
        </div>
      </div>
    </div>
  );
}
