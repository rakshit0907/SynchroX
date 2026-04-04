'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'aiTask' | 'humanReview' | 'decisionGate' | 'serviceTask';
  label: string;
  x: number;
  y: number;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const NODE_TYPES = [
  { type: 'start' as const, label: 'Start Event', icon: '▶️', color: '#10b981' },
  { type: 'aiTask' as const, label: 'AI Agent', icon: '🤖', color: '#3b82f6' },
  { type: 'humanReview' as const, label: 'Human Review', icon: '👤', color: '#f59e0b' },
  { type: 'decisionGate' as const, label: 'Decision Gate', icon: '🔀', color: '#8b5cf6' },
  { type: 'serviceTask' as const, label: 'Service Task', icon: '⚙️', color: '#06b6d4' },
  { type: 'end' as const, label: 'End Event', icon: '⏹️', color: '#ef4444' },
];

const DEFAULT_WORKFLOW: { nodes: WorkflowNode[]; edges: WorkflowEdge[] } = {
  nodes: [
    { id: 'n1', type: 'start', label: 'Query Received', x: 80, y: 200 },
    { id: 'n2', type: 'aiTask', label: 'AI Processing', x: 300, y: 200 },
    { id: 'n3', type: 'decisionGate', label: 'Confidence Check', x: 530, y: 200 },
    { id: 'n4', type: 'end', label: 'Auto Reply', x: 760, y: 100 },
    { id: 'n5', type: 'humanReview', label: 'Human Review', x: 760, y: 300 },
    { id: 'n6', type: 'end', label: 'Final Reply', x: 980, y: 300 },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', label: '' },
    { id: 'e2', source: 'n2', target: 'n3', label: '' },
    { id: 'e3', source: 'n3', target: 'n4', label: '≥ threshold' },
    { id: 'e4', source: 'n3', target: 'n5', label: '< threshold' },
    { id: 'e5', source: 'n5', target: 'n6', label: 'approved' },
  ],
};

export default function WorkflowsPage() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(DEFAULT_WORKFLOW.nodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(DEFAULT_WORKFLOW.edges);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('AI Query Orchestration');
  const [threshold, setThreshold] = useState(0.75);
  const [toast, setToast] = useState<string | null>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<Array<{ _id: string; name: string; status: string }>>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/workflows')
      .then((r) => r.json())
      .then((d) => setSavedWorkflows(d.workflows || []))
      .catch(() => {});
  }, []);

  const addNode = (type: WorkflowNode['type']) => {
    const id = `n${Date.now()}`;
    const label = NODE_TYPES.find((n) => n.type === type)?.label || type;
    setNodes((prev) => [...prev, { id, type, label, x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 }]);
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragging.offsetX;
    const y = e.clientY - rect.top - dragging.offsetY;
    setNodes((prev) => prev.map((n) => (n.id === dragging.id ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)));
  }, [dragging]);

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleNodeMouseDown = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    if (connecting) {
      // Complete connection
      if (connecting !== node.id) {
        const id = `e${Date.now()}`;
        setEdges((prev) => [...prev, { id, source: connecting, target: node.id }]);
      }
      setConnecting(null);
      return;
    }
    setSelectedNode(node);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragging({
      id: node.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  };

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  };

  const deleteEdge = (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 70, y: node.y + 22 };
  };

  const saveWorkflow = async () => {
    try {
      await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          nodes,
          edges,
          confidenceThreshold: threshold,
          status: 'active',
        }),
      });
      setToast('✅ Workflow saved successfully!');
      fetch('/api/workflows').then((r) => r.json()).then((d) => setSavedWorkflows(d.workflows || []));
    } catch {
      setToast('❌ Failed to save workflow');
    }
    setTimeout(() => setToast(null), 3000);
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  };

  const loadDefault = () => {
    setNodes(DEFAULT_WORKFLOW.nodes);
    setEdges(DEFAULT_WORKFLOW.edges);
    setSelectedNode(null);
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Workflow Builder</h1>
          <p className="page-subtitle">Design BPMN orchestration flows with drag-and-drop</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={clearCanvas}>Clear</button>
          <button className="btn btn-secondary btn-sm" onClick={loadDefault}>Load Default</button>
          <button className="btn btn-primary btn-sm" onClick={saveWorkflow}>💾 Save Workflow</button>
        </div>
      </div>

      <div className="builder-layout">
        {/* Node Palette */}
        <div className="glass-card builder-palette">
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            BPMN Nodes
          </h3>
          {NODE_TYPES.map((nt) => (
            <div
              key={nt.type}
              className="palette-item"
              onClick={() => addNode(nt.type)}
            >
              <div className="palette-icon" style={{ background: `${nt.color}20`, border: `1px solid ${nt.color}40` }}>
                {nt.icon}
              </div>
              {nt.label}
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border-glass)', margin: '20px 0', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Actions
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginBottom: '8px' }}
              onClick={() => setConnecting(connecting ? null : '__waiting__')}
            >
              {connecting ? '❌ Cancel' : '🔗 Connect Nodes'}
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {connecting
                ? 'Click a source node, then click a target node'
                : 'Click "Connect" then click two nodes to draw an edge'}
            </p>
          </div>

          {savedWorkflows.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-glass)', margin: '20px 0', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                Saved Workflows
              </h3>
              {savedWorkflows.map((w) => (
                <div key={w.id} style={{ 
                  fontSize: '13px', color: 'var(--text-secondary)', padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{w.name}</span>
                  <span className={`badge badge-${w.status}`}>{w.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="builder-canvas"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={(e) => {
            if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-grid')) {
              setSelectedNode(null);
              if (connecting === '__waiting__') setConnecting(null);
            }
          }}
        >
          <div className="canvas-grid" />

          {/* Connection mode indicator */}
          {connecting && (
            <div style={{
              position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600,
              color: '#60a5fa', zIndex: 30,
            }}>
              🔗 {connecting === '__waiting__' ? 'Click a source node...' : 'Now click a target node...'}
            </div>
          )}

          {/* SVG Edges */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.3)" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const from = getNodeCenter(edge.source);
              const to = getNodeCenter(edge.target);
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              return (
                <g key={edge.id}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="rgba(255,255,255,0.15)" strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                  {edge.label && (
                    <text x={midX} y={midY - 8} textAnchor="middle"
                      style={{ fontSize: '10px', fill: 'var(--text-muted)', fontFamily: 'Inter' }}>
                      {edge.label}
                    </text>
                  )}
                  {/* Invisible click target for deletion */}
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="transparent" strokeWidth="12"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={() => deleteEdge(edge.id)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`workflow-node ${node.type} ${selectedNode?.id === node.id ? 'selected' : ''}`}
              style={{ left: node.x, top: node.y }}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onClick={(e) => {
                e.stopPropagation();
                if (connecting && connecting !== '__waiting__' && connecting !== node.id) {
                  const id = `e${Date.now()}`;
                  setEdges((prev) => [...prev, { id, source: connecting, target: node.id }]);
                  setConnecting(null);
                } else if (connecting === '__waiting__') {
                  setConnecting(node.id);
                } else {
                  setSelectedNode(node);
                }
              }}
            >
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                {NODE_TYPES.find((nt) => nt.type === node.type)?.icon}
              </div>
              {node.label}
            </div>
          ))}

          {nodes.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">⚡</div>
              <div className="empty-state-text">Drop nodes here to build your workflow</div>
              <div className="empty-state-sub">Click nodes from the palette on the left</div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        <div className="glass-card builder-properties">
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            Properties
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Workflow Name
            </label>
            <input
              className="input-field"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Confidence Threshold: {Math.round(threshold * 100)}%
            </label>
            <input
              type="range"
              min="0" max="100"
              value={threshold * 100}
              onChange={(e) => setThreshold(parseInt(e.target.value) / 100)}
              style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {selectedNode ? (
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                {NODE_TYPES.find((nt) => nt.type === selectedNode.type)?.icon} Selected Node
              </h4>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Label
                </label>
                <input
                  className="input-field"
                  value={selectedNode.label}
                  onChange={(e) => {
                    const newLabel = e.target.value;
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, label: newLabel } : n)));
                    setSelectedNode({ ...selectedNode, label: newLabel });
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Type
                </label>
                <div className={`badge badge-${selectedNode.type === 'aiTask' ? 'auto' : selectedNode.type === 'humanReview' ? 'pending' : 'approved'}`}>
                  {selectedNode.type}
                </div>
              </div>
              <div style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Position: ({Math.round(selectedNode.x)}, {Math.round(selectedNode.y)})
              </div>
              <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={() => deleteNode(selectedNode.id)}>
                🗑️ Delete Node
              </button>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <p style={{ marginBottom: '12px' }}>Click a node on the canvas to view/edit its properties.</p>
              <div style={{ fontSize: '12px', lineHeight: '2' }}>
                <div>📊 Nodes: <strong style={{ color: 'var(--text-primary)' }}>{nodes.length}</strong></div>
                <div>🔗 Connections: <strong style={{ color: 'var(--text-primary)' }}>{edges.length}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
