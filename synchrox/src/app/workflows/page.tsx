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
    { id: 'n1', type: 'start', label: 'Query Received', x: 80, y: 220 },
    { id: 'n2', type: 'aiTask', label: 'AI Processing', x: 320, y: 220 },
    { id: 'n3', type: 'decisionGate', label: 'Confidence Check', x: 560, y: 220 },
    { id: 'n4', type: 'end', label: 'Auto Reply', x: 800, y: 100 },
    { id: 'n5', type: 'humanReview', label: 'Human Review', x: 800, y: 340 },
    { id: 'n6', type: 'end', label: 'Final Reply', x: 1040, y: 340 },
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
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('AI Query Orchestration');
  const [threshold, setThreshold] = useState(0.75);
  const [toast, setToast] = useState<string | null>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<Array<{ id: string; name: string; status: string }>>([]);
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
    // Place node in visible canvas area accounting for pan/zoom
    const cx = (300 - pan.x) / zoom;
    const cy = (200 - pan.y) / zoom;
    setNodes((prev) => [...prev, { id, type, label, x: cx + Math.random() * 100, y: cy + Math.random() * 100 }]);
  };

  // Zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => {
      const next = Math.min(Math.max(prev * delta, 0.3), 3);
      // Zoom toward mouse position
      setPan((p) => ({
        x: mouseX - (mouseX - p.x) * (next / prev),
        y: mouseY - (mouseY - p.y) * (next / prev),
      }));
      return next;
    });
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.workflow-node')) return;
    setPanning({ startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (panning) {
      setPan({
        x: panning.panX + (e.clientX - panning.startX),
        y: panning.panY + (e.clientY - panning.startY),
      });
      return;
    }
    if (!dragging) return;
    const dx = (e.clientX - dragging.startX) / zoom;
    const dy = (e.clientY - dragging.startY) / zoom;
    setNodes((prev) => prev.map((n) => n.id === dragging.id
      ? { ...n, x: Math.max(0, dragging.nodeX + dx), y: Math.max(0, dragging.nodeY + dy) }
      : n
    ));
  }, [dragging, panning, zoom]);

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(null);
  }, []);

  const handleNodeMouseDown = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    if (connecting) {
      if (connecting !== node.id) {
        const id = `e${Date.now()}`;
        setEdges((prev) => [...prev, { id, source: connecting, target: node.id }]);
      }
      setConnecting(null);
      return;
    }
    setSelectedNode(node);
    setDragging({ id: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y });
  };

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x * zoom + pan.x + 70 * zoom, y: node.y * zoom + pan.y + 22 * zoom };
  };

  const saveWorkflow = async () => {
    try {
      await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workflowName, nodes, edges, confidenceThreshold: threshold, status: 'active' }),
      });
      setToast('✅ Workflow saved!');
      fetch('/api/workflows').then((r) => r.json()).then((d) => setSavedWorkflows(d.workflows || []));
    } catch {
      setToast('❌ Failed to save');
    }
    setTimeout(() => setToast(null), 3000);
  };

  const zoomIn = () => setZoom((z) => Math.min(z * 1.2, 3));
  const zoomOut = () => setZoom((z) => Math.max(z * 0.8, 0.3));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Workflow Builder</h1>
          <p className="page-subtitle">Design BPMN orchestration flows — drag, pan, and zoom the canvas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setNodes([]); setEdges([]); setSelectedNode(null); }}>Clear</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setNodes(DEFAULT_WORKFLOW.nodes); setEdges(DEFAULT_WORKFLOW.edges); resetView(); }}>Load Default</button>
          <button className="btn btn-primary btn-sm" onClick={saveWorkflow}>💾 Save Workflow</button>
        </div>
      </div>

      <div className="builder-layout">
        {/* Node Palette */}
        <div className="glass-card builder-palette">
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>BPMN Nodes</h3>
          {NODE_TYPES.map((nt) => (
            <div key={nt.type} className="palette-item" onClick={() => addNode(nt.type)}>
              <div className="palette-icon" style={{ background: `${nt.color}20`, border: `1px solid ${nt.color}40` }}>{nt.icon}</div>
              {nt.label}
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border-glass)', margin: '20px 0', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Actions</h3>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: '8px' }}
              onClick={() => setConnecting(connecting ? null : '__waiting__')}>
              {connecting ? '❌ Cancel' : '🔗 Connect Nodes'}
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {connecting ? 'Click source, then target node' : 'Click "Connect" then pick two nodes'}
            </p>
          </div>

          {savedWorkflows.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '20px', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Saved</h3>
              {savedWorkflows.map((w) => (
                <div key={w.id} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{w.name}</span>
                  <span className={`badge badge-${w.status}`} style={{ fontSize: '10px', padding: '2px 8px' }}>{w.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(10,14,26,0.8)', borderRadius: '10px', border: '1px solid var(--border-glass)', width: 'fit-content' }}>
            <button className="btn btn-secondary btn-sm" onClick={zoomOut} style={{ padding: '4px 10px', fontSize: '16px', lineHeight: 1 }}>−</button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '44px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button className="btn btn-secondary btn-sm" onClick={zoomIn} style={{ padding: '4px 10px', fontSize: '16px', lineHeight: 1 }}>+</button>
            <div style={{ width: '1px', height: '20px', background: 'var(--border-glass)', margin: '0 4px' }} />
            <button className="btn btn-secondary btn-sm" onClick={resetView} style={{ padding: '4px 10px', fontSize: '11px' }}>⌖ Reset</button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Scroll to zoom • Drag canvas to pan</span>
          </div>

          {/* Canvas Area */}
          <div
            ref={canvasRef}
            className="builder-canvas"
            style={{ flex: 1, cursor: panning ? 'grabbing' : connecting ? 'crosshair' : 'grab', userSelect: 'none', overflow: 'hidden', position: 'relative' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
          >
            <div className="canvas-grid" />

            {connecting && (
              <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#60a5fa', zIndex: 30 }}>
                🔗 {connecting === '__waiting__' ? 'Click a source node...' : 'Now click a target node...'}
              </div>
            )}

            {/* Transformed layer - zoom + pan applied here */}
            <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
              {/* SVG Edges */}
              <svg style={{ position: 'absolute', inset: 0, width: '4000px', height: '3000px', pointerEvents: 'none', zIndex: 5, overflow: 'visible' }}>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.3)" />
                  </marker>
                </defs>
                {edges.map((edge) => {
                  const from = nodes.find(n => n.id === edge.source);
                  const to = nodes.find(n => n.id === edge.target);
                  if (!from || !to) return null;
                  const fx = from.x + 70, fy = from.y + 22;
                  const tx = to.x, ty = to.y + 22;
                  const midX = (fx + tx) / 2, midY = (fy + ty) / 2;
                  return (
                    <g key={edge.id}>
                      <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="rgba(255,255,255,0.15)" strokeWidth="2" markerEnd="url(#arrowhead)" />
                      {edge.label && <text x={midX} y={midY - 8} textAnchor="middle" style={{ fontSize: '11px', fill: 'rgba(255,255,255,0.4)', fontFamily: 'Inter' }}>{edge.label}</text>}
                      <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="transparent" strokeWidth="14"
                        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onClick={() => setEdges((prev) => prev.filter((e) => e.id !== edge.id))} />
                    </g>
                  );
                })}
              </svg>

              {/* Nodes */}
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className={`workflow-node ${node.type} ${selectedNode?.id === node.id ? 'selected' : ''}`}
                  style={{ left: node.x, top: node.y, position: 'absolute', cursor: 'move' }}
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
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{NODE_TYPES.find((nt) => nt.type === node.type)?.icon}</div>
                  {node.label}
                </div>
              ))}

              {nodes.length === 0 && (
                <div className="empty-state" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                  <div className="empty-state-icon">⚡</div>
                  <div className="empty-state-text">Drop nodes here to build your workflow</div>
                  <div className="empty-state-sub">Click nodes from the palette on the left</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="glass-card builder-properties">
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Properties</h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Workflow Name</label>
            <input className="input-field" value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Confidence Threshold: {Math.round(threshold * 100)}%
            </label>
            <input type="range" min="0" max="100" value={threshold * 100} onChange={(e) => setThreshold(parseInt(e.target.value) / 100)}
              style={{ width: '100%', accentColor: 'var(--accent-blue)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {/* Canvas info */}
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <div>📊 Nodes: <strong style={{ color: 'var(--text-primary)' }}>{nodes.length}</strong></div>
            <div>🔗 Connections: <strong style={{ color: 'var(--text-primary)' }}>{edges.length}</strong></div>
            <div>🔍 Zoom: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(zoom * 100)}%</strong></div>
          </div>

          {selectedNode ? (
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                {NODE_TYPES.find((nt) => nt.type === selectedNode.type)?.icon} Selected Node
              </h4>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Label</label>
                <input className="input-field" value={selectedNode.label} onChange={(e) => {
                  const newLabel = e.target.value;
                  setNodes((prev) => prev.map((n) => n.id === selectedNode.id ? { ...n, label: newLabel } : n));
                  setSelectedNode({ ...selectedNode, label: newLabel });
                }} />
              </div>
              <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Type: <span className={`badge badge-${selectedNode.type === 'aiTask' ? 'auto' : selectedNode.type === 'humanReview' ? 'pending' : 'approved'}`} style={{ fontSize: '10px' }}>{selectedNode.type}</span>
              </div>
              <div style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Position: ({Math.round(selectedNode.x)}, {Math.round(selectedNode.y)})
              </div>
              <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={() => deleteNode(selectedNode.id)}>
                🗑️ Delete Node
              </button>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '8px' }}>Click a node to edit its properties.</p>
              <p>Click edges to delete them.</p>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
