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
            "background-color": "#FFFFFF",
            "border-width": 2,
            "border-color": "#003B6F",
            label: "data(label)",
            color: "#17212B",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 6,
            "font-size": "11px",
            "font-family": "Lato, sans-serif",
            width: 34,
            height: 34,
          },
        },
        {
          selector: 'node[kind="person"]',
          style: {
            "background-color": "#EBF2F8",
            "border-color": "#003B6F",
            shape: "ellipse",
          },
        },
        {
          selector: 'node[kind="file"]',
          style: {
            "background-color": "#FDF8EE",
            "border-color": "#C9972B",
            shape: "rectangle",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#D9E0E6",
            "target-arrow-color": "#003B6F",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(kind)",
            "font-size": "10px",
            "text-rotation": "autorotate",
            "text-background-opacity": 1,
            "text-background-color": "#FFFFFF",
            color: "#5F6B76",
          },
        },
        {
          selector: 'edge[kind="similarity"]',
          style: {
            "line-style": "dashed",
            "line-color": "#C9972B",
            "target-arrow-color": "#C9972B",
          },
        },
      ],
      layout: {
        name: "dagre",
        rankDir: "TB",
        spacingFactor: 1.2,
        animate: true,
      } as any,
    });

    cy.on("tap", "node", function (evt) {
      const node = evt.target;
      cy.elements().removeClass("highlighted");
      node.neighborhood().addClass("highlighted");
      node.addClass("highlighted");
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [graphData]);

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="card" style={{ height: "360px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray-500)" }}>
        No entity graph data available. Run intelligence analysis pipeline to extract entities.
      </div>
    );
  }

  return (
    <div className="card" style={{ position: "relative", padding: "16px" }}>
      <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.9375rem", marginBottom: "12px" }}>
        Entity Resolution & Relationship Graph
      </div>
      <div ref={containerRef} style={{ height: "380px", background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius-sm)" }} />
      <div style={{ display: "flex", gap: "16px", background: "var(--white)", padding: "8px 12px", border: "var(--border)", borderRadius: "var(--radius-sm)", marginTop: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#EBF2F8", border: "2px solid #003B6F" }}></div>
          Person Entity
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
          <div style={{ width: "12px", height: "12px", background: "#FDF8EE", border: "2px solid #C9972B" }}></div>
          Evidence File
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
          <div style={{ width: "16px", height: "2px", borderTop: "2px dashed #C9972B" }}></div>
          AI Semantic Similarity Link
        </div>
      </div>
    </div>
  );
}
