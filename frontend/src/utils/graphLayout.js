/**
 * Hierarchical circular layout helper for VEKTRA policy graphs.
 * Positions the most central (dangerous) node at the origin and distributes
 * secondary nodes in an outer ring, ensuring overlapping edges are visible.
 */
export const getLayoutedElements = (nodes, edges, mostDangerousRuleId) => {
  if (nodes.length === 0) return { nodes: [], edges };

  const centerX = 300;
  const centerY = 250;
  const radius = 180;

  // Identify central node
  let centerNodeId = mostDangerousRuleId;
  if (!centerNodeId && nodes.length > 0) {
    // Fallback: node with highest centrality or first node
    const sorted = [...nodes].sort((a, b) => (b.centrality_score || 0) - (a.centrality_score || 0));
    centerNodeId = sorted[0]?.id;
  }

  const peripheralNodes = nodes.filter(node => node.id !== centerNodeId);
  const nPeripherals = peripheralNodes.length;

  const layoutedNodes = nodes.map((node) => {
    let x = centerX;
    let y = centerY;

    if (node.id === centerNodeId) {
      x = centerX;
      y = centerY;
    } else {
      const idx = peripheralNodes.findIndex(pn => pn.id === node.id);
      const angle = nPeripherals > 0 ? (2 * Math.PI * idx) / nPeripherals : 0;
      x = centerX + radius * Math.cos(angle);
      y = centerY + radius * Math.sin(angle);
    }

    // Return in React Flow node format
    return {
      id: node.id,
      type: "policyNode", // custom node type
      data: { 
        label: node.id,
        severity: node.severity || "SAFE",
        effect: node.effect || "Allow",
        actions: node.actions || [],
        resources: node.resources || [],
        principals: node.principals || [],
        centrality_score: node.centrality_score || 0.0,
        source_file: node.source_file || "",
        isCenter: node.id === centerNodeId
      },
      position: { x, y }
    };
  });

  // Map edges to React Flow edge format
  const layoutedEdges = edges.filter(edge => edge.source !== edge.target).map((edge, idx) => {
    const isConflict = edge.type === "CONFLICTS_WITH";
    const isBypass = edge.type === "BYPASSES";
    const isShadow = edge.type === "SHADOWS";
    const isRedundant = edge.type === "REDUNDANT_WITH";
    const isEscalation = edge.type === "ESCALATES_TO" || edge.type === "GRANTS_ADMIN";
    
    let strokeColor = "#4a5280"; // safe default
    let label = edge.type;
    
    if (edge.severity === "CRITICAL") {
      strokeColor = "#ef4444"; // red
    } else if (edge.severity === "WARNING") {
      strokeColor = "#f59e0b"; // amber
    } else if (edge.severity === "INFO") {
      strokeColor = "#3b82f6"; // blue
    }

    if (edge.type === "ASSUMES") {
      strokeColor = "#06b6d4";
    }

    return {
      id: `edge-${idx}`,
      source: edge.source,
      target: edge.target,
      label: label,
      animated: isConflict || isEscalation,
      style: {
        stroke: strokeColor,
        strokeWidth: isEscalation ? 4 : (isConflict ? 3 : 2),
        strokeDasharray: isBypass ? "6 4" : (isShadow || isRedundant ? "2 4" : undefined),
      },
      labelStyle: {
        fill: "#4a5280",
        fontSize: 8,
        fontWeight: 600
      },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
      labelBgStyle: {
        fill: "#0d0f1a",
        fillOpacity: 0.85
      },
      className: isConflict || isEscalation ? "conflict-edge" : (isShadow || isRedundant ? "overlap-edge" : ""),
      markerEnd: {
        type: "arrow",
        color: strokeColor,
      }
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
};
