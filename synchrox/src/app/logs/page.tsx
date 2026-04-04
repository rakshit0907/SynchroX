'use client';

import { useState, useEffect, useCallback } from 'react';

interface LogEntry {
  id: string;
  query_id: string;
  event: string;
  details: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

interface QueryEntry {
  id: string;
  user_query: string;
  status: string;
  confidence_score: number;
  ai_model: string;
  created_at: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  query_received:    { label: 'Query Received',    icon: '📥', color: 'var(--accent-blue)' },
  ai_processing:     { label: 'AI Processing',     icon: '🤖', color: 'var(--accent-cyan)' },
  ai_response:       { label: 'AI Response',       icon: '💬', color: 'var(--accent-blue)' },
  confidence_check:  { label: 'Confidence Check',  icon: '🔀', color: 'var(--accent-purple)' },
  auto_approved:     { label: 'Auto Approved',     icon: '✅', color: 'var(--accent-green)' },
  routed_to_human:   { label: 'Routed to Human',   icon: '👤', color: 'var(--accent-amber)' },
  human_approved:    { label: 'Human Approved',    icon: '✅', color: 'var(--accent-green)' },
  human_edited:      { label: 'Human Edited',      icon: '📝', color: 'var(--accent-purple)' },
  human_rejected:    { label: 'Human Rejected',    icon: '❌', color: 'var(--accent-red)' },
  response_delivered:{ label: 'Response Delivered',icon: '📤', color: 'var(--accent-green)' },
};

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  auto_approved:   { label: 'Auto Approved',  class: 'badge-auto' },
  pending_review:  { label: 'Pending Review', class: 'badge-pending' },
  human_approved:  { label: 'Approved',       class: 'badge-approved' },
  human_edited:    { label: 'Edited',         class: 'badge-edited' },
  rejected:        { label: 'Rejected',       class: 'badge-rejected' },
  processing:      { label: 'Processing',     class: 'badge-processing' },
};

const DEMO_QUERIES: QueryEntry[] = [
  { id: 'q1', user_query: 'Analyze Q3 revenue forecast and identify growth opportunities', status: 'auto_approved', confidence_score: 0.91, ai_model: 'demo', created_at: new Date(Date.now() - 120000).toISOString() },
  { id: 'q2', user_query: 'Draft GDPR compliance report for data protection audit', status: 'pending_review', confidence_score: 0.62, ai_model: 'demo', created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 'q3', user_query: 'Design microservice architecture for payment system', status: 'human_edited', confidence_score: 0.54, ai_model: 'demo', created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 'q4', user_query: 'Generate marketing copy for product launch campaign', status: 'auto_approved', confidence_score: 0.88, ai_model: 'demo', created_at: new Date(Date.now() - 900000).toISOString() },
  { id: 'q5', user_query: 'Review and optimize database query performance metrics', status: 'human_approved', confidence_score: 0.71, ai_model: 'demo', created_at: new Date(Date.now() - 1500000).toISOString() },
];

const DEMO_LOGS: Record<string, LogEntry[]> = {
  q1: [
    { id: 'l1', query_id: 'q1', event: 'query_received', details: 'Query received: "Analyze Q3 revenue forecast..."', metadata: {}, timestamp: new Date(Date.now() - 125000).toISOString() },
    { id: 'l2', query_id: 'q1', event: 'ai_processing', details: 'AI model processing query...', metadata: {}, timestamp: new Date(Date.now() - 124000).toISOString() },
    { id: 'l3', query_id: 'q1', event: 'ai_response', details: 'Response generated. Confidence: 0.91', metadata: { tokensUsed: 287 }, timestamp: new Date(Date.now() - 123000).toISOString() },
    { id: 'l4', query_id: 'q1', event: 'confidence_check', details: 'Confidence 0.91 ≥ threshold 0.75', metadata: { meetsThreshold: true }, timestamp: new Date(Date.now() - 122000).toISOString() },
    { id: 'l5', query_id: 'q1', event: 'auto_approved', details: 'Auto-approved — confidence above threshold', metadata: {}, timestamp: new Date(Date.now() - 121000).toISOString() },
    { id: 'l6', query_id: 'q1', event: 'response_delivered', details: 'Final response delivered to user', metadata: {}, timestamp: new Date(Date.now() - 120000).toISOString() },
  ],
  q2: [
    { id: 'l7', query_id: 'q2', event: 'query_received', details: 'Query received: "Draft GDPR compliance..."', metadata: {}, timestamp: new Date(Date.now() - 310000).toISOString() },
    { id: 'l8', query_id: 'q2', event: 'ai_processing', details: 'AI model processing query...', metadata: {}, timestamp: new Date(Date.now() - 309000).toISOString() },
    { id: 'l9', query_id: 'q2', event: 'ai_response', details: 'Response generated. Confidence: 0.62', metadata: { tokensUsed: 342 }, timestamp: new Date(Date.now() - 308000).toISOString() },
    { id: 'l10', query_id: 'q2', event: 'confidence_check', details: 'Confidence 0.62 < threshold 0.75', metadata: { meetsThreshold: false }, timestamp: new Date(Date.now() - 307000).toISOString() },
    { id: 'l11', query_id: 'q2', event: 'routed_to_human', details: 'Low confidence — escalated to HITL review', metadata: {}, timestamp: new Date(Date.now() - 306000).toISOString() },
  ],
};

export default function LogsPage() {
  const [queries, setQueries] = useState<QueryEntry[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<QueryEntry | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [usingDemo, setUsingDemo] = useState(false);

  const fetchQueries = useCallback(async () => {
    try {
      const res = await fetch('/api/queries?limit=50');
      const data = await res.json();
      if (data.queries && data.queries.length > 0) {
        setQueries(data.queries);
        setUsingDemo(false);
      } else {
        setQueries(DEMO_QUERIES);
        setUsingDemo(true);
      }
    } catch {
      setQueries(DEMO_QUERIES);
      setUsingDemo(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchQueries();
    // Poll every 5 seconds for realtime-like updates
    const t = setInterval(fetchQueries, 5000);
    return () => clearInterval(t);
  }, [fetchQueries]);

  const fetchLogs = useCallback(async (q: QueryEntry) => {
    setSelectedQuery(q);
    setLogLoading(true);
    if (usingDemo || q.id.startsWith('demo') || q.id.startsWith('q')) {
      await new Promise(r => setTimeout(r, 300));
      setLogs(DEMO_LOGS[q.id] || []);
    } else {
      try {
        const res = await fetch(`/api/logs?queryId=${q.id}`);
        const data = await res.json();
        setLogs(data.logs || []);
      } catch { setLogs([]); }
    }
    setLogLoading(false);
  }, [usingDemo]);

  const deleteQuery = async (q: QueryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (q.id.startsWith('demo') || q.id.startsWith('q')) {
      setQueries(prev => prev.filter(x => x.id !== q.id));
      if (selectedQuery?.id === q.id) { setSelectedQuery(null); setLogs([]); }
      setToast('🗑️ Query removed from view');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setDeletingId(q.id);
    try {
      await fetch(`/api/queries/${q.id}`, { method: 'DELETE' });
      setQueries(prev => prev.filter(x => x.id !== q.id));
      if (selectedQuery?.id === q.id) { setSelectedQuery(null); setLogs([]); }
      setToast('🗑️ Query and logs deleted');
    } catch {
      setToast('❌ Delete failed');
    } finally {
      setDeletingId(null);
      setTimeout(() => setToast(null), 2000);
    }
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  const filteredQueries = filter === 'all' ? queries : queries.filter(q => q.status === filter);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
    </div>
  );

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">System Logs</h1>
          <p className="page-subtitle">
            Full audit trail for every query — persists permanently until deleted
            {usingDemo && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(245,158,11,0.2)' }}>Demo Data</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse-glow 2s infinite' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Live • refreshes every 5s</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'auto_approved', 'pending_review', 'human_approved', 'human_edited', 'rejected'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: '100px', border: `1px solid ${filter === f ? 'rgba(59,130,246,0.4)' : 'var(--border-glass)'}`,
            background: filter === f ? 'rgba(59,130,246,0.1)' : 'transparent', color: filter === f ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
          }}>
            {f === 'all' ? `All (${queries.length})` : STATUS_MAP[f]?.label || f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: 'calc(100vh - 240px)' }}>
        {/* Query List */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredQueries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">No queries found</div>
              </div>
            ) : filteredQueries.map((q) => (
              <div key={q.id} onClick={() => fetchLogs(q)} style={{
                padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
                background: selectedQuery?.id === q.id ? 'rgba(59,130,246,0.06)' : 'transparent',
                borderLeft: selectedQuery?.id === q.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
                transition: 'all 0.2s ease', position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginBottom: '8px' }}>
                    {q.user_query}
                  </div>
                  <button
                    onClick={(e) => deleteQuery(q, e)}
                    disabled={deletingId === q.id}
                    style={{
                      width: '24px', height: '24px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)',
                      color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', flexShrink: 0, transition: 'all 0.2s ease',
                    }}
                    title="Delete query and all logs"
                  >
                    {deletingId === q.id ? '...' : '🗑'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`badge ${STATUS_MAP[q.status]?.class || 'badge-processing'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {STATUS_MAP[q.status]?.label || q.status}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '4px',
                        width: `${q.confidence_score * 100}%`,
                        background: q.confidence_score >= 0.75 ? 'var(--accent-green)' : q.confidence_score >= 0.5 ? 'var(--accent-amber)' : 'var(--accent-red)',
                      }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{Math.round(q.confidence_score * 100)}%</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(q.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Log Timeline */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selectedQuery ? (
            <>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Event Timeline</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedQuery.user_query}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {logLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
                    <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '2px' }} />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">No logs available</div>
                  </div>
                ) : (
                  <div className="log-timeline">
                    {logs.map((log) => {
                      const conf = EVENT_CONFIG[log.event];
                      return (
                        <div key={log.id} className={`log-entry ${log.event}`}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '16px' }}>{conf?.icon || '📌'}</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: conf?.color || 'var(--text-primary)' }}>
                              {conf?.label || log.event}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', paddingLeft: '26px' }}>{log.details}</p>
                          {Object.keys(log.metadata || {}).length > 0 && (
                            <div style={{ marginLeft: '26px', marginTop: '6px', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {JSON.stringify(log.metadata)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">Select a query to view its event log</div>
              <div className="empty-state-sub">Click any row on the left</div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
