import React, { useEffect } from "react";
import ReactFlow, { 
  Background, 
  Handle, 
  useNodesState, 
  useEdgesState, 
  useReactFlow,
  ReactFlowProvider
} from "reactflow";
import "reactflow/dist/style.css";
import { useVektraStore } from "../store/vektraStore";
import { getLayoutedElements } from "../utils/graphLayout";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

// ── CUSTOM NODE COMPONENT ──
const CustomPolicyNode = ({ data, selected }) => {
  const { severity, label, isCenter, effect } = data;
  
  let bgColor = "bg-safe node-safe-hover";
  let pulseClass = "";
  
  if (severity === "CRITICAL") {
    bgColor = "bg-danger";
    pulseClass = "animate-node-critical";
  } else if (severity === "WARNING") {
    bgColor = "bg-warning";
    pulseClass = "animate-node-warning";
  } else if (severity === "INFO") {
    bgColor = "bg-blue-500";
  }
  
  return (
    <div className="flex flex-col items-center select-none">
      <Handle type="target" position="top" className="w-1.5 h-1.5 bg-muted border-none opacity-60" />
      
      <div className={`w-11 h-11 rounded-full ${bgColor} ${pulseClass} flex items-center justify-center border-2 ${
        selected ? "border-white scale-110 shadow-[0_0_12px_#7c3aed]" : "border-[#0d0f1a]"
      } cursor-pointer transition-all duration-200 relative`}>
        {/* Emblem */}
        <span className="text-[10px] font-bold text-white font-heading select-none">
          {effect === "Deny" ? "D" : "A"}
        </span>
        {isCenter && (
          <span className="absolute -top-1 -right-1 bg-primary text-white text-[7px] font-extrabold px-1 rounded-full border border-[#0d0f1a] shadow-sm">
            ★
          </span>
        )}
      </div>
      
      <span className="text-[9px] font-mono text-slate-300 font-bold mt-1 max-w-[80px] truncate text-center block">
        {label}
      </span>
      <Handle type="source" position="bottom" className="w-1.5 h-1.5 bg-muted border-none opacity-60" />
    </div>
  );
};

const nodeTypes = {
  policyNode: CustomPolicyNode
};

// ── INNER CANVAS COMPONENT ──
function FlowCanvas() {
  const { 
    nodes: rawNodes, 
    edges: rawEdges, 
    stats, 
    selectNode,
    selectedNodeId
  } = useVektraStore();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  // Layout and load elements when raw rules/edges change
  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      rawNodes, 
      rawEdges, 
      stats.most_dangerous_rule
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    // Fit view after layouting
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 100);
  }, [rawNodes, rawEdges, stats.most_dangerous_rule, setNodes, setEdges, fitView]);

  // Sync selectedNodeId state with React Flow node selection
  useEffect(() => {
    setNodes(nds => nds.map(node => ({
      ...node,
      selected: node.id === selectedNodeId
    })));
  }, [selectedNodeId, setNodes]);

  const handleNodeClick = (event, node) => {
    selectNode(node.id);
  };

  const handleResetLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      rawNodes, 
      rawEdges, 
      stats.most_dangerous_rule
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 50);
  };

  return (
    <div className="w-full h-full relative bg-[#08080e] overflow-hidden rounded-xl border border-cardBorder">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#1e2240" gap={24} size={1} />
        
        {/* Custom Glass Control Panel */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#141628]/80 backdrop-blur-md border border-[#1e2240] p-1.5 rounded-lg shadow-lg">
          <button 
            onClick={() => zoomIn()}
            className="p-1.5 text-muted hover:text-slate-200 hover:bg-[#1e2240] rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={() => zoomOut()}
            className="p-1.5 text-muted hover:text-slate-200 hover:bg-[#1e2240] rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            onClick={() => fitView({ duration: 600 })}
            className="p-1.5 text-muted hover:text-slate-200 hover:bg-[#1e2240] rounded transition-colors"
            title="Fit View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#1e2240] mx-0.5" />
          <button 
            onClick={handleResetLayout}
            className="p-1.5 text-muted hover:text-slate-200 hover:bg-[#1e2240] rounded transition-colors"
            title="Reset Layout"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </ReactFlow>
    </div>
  );
}

// ── EXPORTED WRAPPER WITH PROVIDER ──
export default function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
