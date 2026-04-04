'use client';

import { useState, useEffect, useCallback } from 'react';

interface LogEntry {
  _id: string;
  queryId: string;
  event: string;
  details: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

interface QueryEntry {
  _id: string;
  userQuery: string;
  status: string;
  confidenceScore: number;
  aiModel: string;
  createdAt: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  query_received: { label: 'Query Received', icon: '📥', color: 'var(--accent-blue)' },
  ai_processing: { label: 'AI Processing', icon: '⚙️', color: 'var(--accent-cyan)' },
  ai_response: { label: 'AI Response', icon: '🤖', color: 'var(--accent-blue)' },
  confidence_check: { label: 'Confidence Check', icon: '📊', color: 'var(--accent-purple)' },
  auto_approved: { label: 'Auto Approved', icon: '✅', color: 'var(--accent-green)' },
  routed_to_human: { label: 'Routed to Human', icon: '👤', color: 'var(--accent-amber)' },
  human_approved: { label: 'Human Approved', icon: '✅', color: 'var(--accent-green)' },
  human_edited: { label: 'Human Edited', icon: '📝', color: 'var(--accent-purple)' },
  human_rejected: { label: 'Rejected', icon: '❌', color: 'var(--accent-red)' },
  response_delivered: { label: 'Delivered', icon: '📤', color: 'var(--accent-green)' },
};

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  processing: { label: 'Processing', class: 'badge-processing' },
  auto_approved: { label: 'Auto Approved', class: 'badge-auto' },
  pending_review: { label: 'Pending Review', class: 'badge-pending' },
  human_approved: { label: 'Approved', class: 'badge-approved' },
  human_edited: { label: 'Edited', class: 'badge-edited' },
  rejected: { label: 'Rejected', class: 'badge-rejected' },
};

const DEMO_QUERIES: QueryEntry[] = [
  { _id: 'q1', userQuery: 'Analyze Q3 revenue forecast and identify growth opportunities', status: 'auto_approved', confidenceScore: 0.91, aiModel: 'synchrox-sim-v1', createdAt: new Date(Date.now() - 120000).toISOString() },
  { _id: 'q2', userQuery: 'Draft GDPR compliance report for data protection audit', status: 'pending_review', confidenceScore: 0.62, aiModel: 'synchrox-sim-v1', createdAt: new Date(Date.now() - 300000).toISOString() },
  { _id: 'q3', userQuery: 'Design microservice architecture for payment system', status: 'human_edited', confidenceScore: 0.54, aiModel: 'synchrox-sim-v1', createdAt: new Date(Date.now() - 600000).toISOString() },
  { _id: 'q4', userQuery: 'Generate marketing copy for product launch campaign', status: 'auto_approved', confidenceScore: 0.88, aiModel: 'synchrox-sim-v1', createdAt: new Date(Date.now() - 900000).toISOString() },
  { _id: 'q5', userQuery: 'Review and optimize database query performance metrics', status: 'human_approved', confidenceScore: 0.71, aiModel: 'synchrox-sim-v1', createdAt: new Date(Date.now() - 1500000).toISOString() },
  { _id: 'q6', userQuery: 'Create API documentation for the orchestration endpoints', status: 'auto_approved', confidenceScore: 0.85, aiModel: 'synchrox-sim-v1', createdAt: new Date(Date.now() - 2000000).toISOString() },
  { _id: 'q7', userQuery: 'Evaluate security vulnerabilities in authentication flow', status: 'rejected', confidenceScore: 0.32, aiModel: 'synchrox-sim-v1', createdAt: new Date(Date.now() - 3000000).toISOString() },
];

const DEMO_LOGS: Record<string, LogEntry[]> = {
  q1: [
    { _id: 'l1', queryId: 'q1', event: 'query_received', details: 'User submitted query: "Analyze Q3 revenue forecast..."', metadata: {}, timestamp: new Date(Date.now() - 125000).toISOString() },
    { _id: 'l2', queryId: 'q1', event: 'ai_processing', details: 'AI agent is analyzing the query...', metadata: {}, timestamp: new Date(Date.now() - 124000).toISOString() },
    { _id: 'l3', queryId: 'q1', event: 'ai_response', details: 'AI generated response with confidence: 0.91', metadata: { model: 'synchrox-sim-v1', tokensUsed: 287 }, timestamp: new Date(Date.now() - 123000).toISOString() },
    { _id: 'l4', queryId: 'q1', event: 'confidence_check', details: 'Confidence 0.91 vs threshold 0.75', metadata: { meetsThreshold: true }, timestamp: new Date(Date.now() - 122000).toISOString() },
    { _id: 'l5', queryId: 'q1', event: 'auto_approved', details: 'Response auto-approved based on confidence threshold', metadata: {}, timestamp: new Date(Date.now() - 121000).toISOString() },
    { _id: 'l6', queryId: 'q1', event: 'response_delivered', details: 'Final response delivered to user', metadata: {}, timestamp: new Date(Date.now() - 120000).toISOString() },
  ],
  q2: [
    { _id: 'l7', queryId: 'q2', event: 'query_received', details: 'User submitted query: "Draft GDPR compliance report..."', metadata: {}, timestamp: new Date(Date.now() - 310000).toISOString() },
    { _id: 'l8', queryId: 'q2', event: 'ai_processing', details: 'AI agent is analyzing the query...', metadata: {}, timestamp: new Date(Date.now() - 309000).toISOString() },
    { _id: 'l9', queryId: 'q2', event: 'ai_response', details: 'AI generated response with confidence: 0.62', metadata: { model: 'synchrox-sim-v1', tokensUsed: 342 }, timestamp: new Date(Date.now() - 308000).toISOString() },
    { _id: 'l10', queryId: 'q2', event: 'confidence_check', details: 'Confidence 0.62 vs threshold 0.75', metadata: { meetsThreshold: false }, timestamp: new Date(Date.now() - 307000).toISOString() },
    { _id: 'l11', queryId: 'q2', event: 'routed_to_human', details: 'Low confidence (0.62 < 0.75). Escalated to human reviewer.', metadata: {}, timestamp: new Date(Date.now() - 306000).toISOString() },
  ],
};

export default function LogsPage() {
  const [queries, setQueries] = useState<QueryEntry[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<QueryEntry | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchQueries = useCallback(async () => {
    try {
      const res = await fetch('/api/queries?limit=50');
      const data = await res.json();
      if (data.queries && data.queries.length > 0) {
        setQueries(data.queries);
      } else {
        setQueries(DEMO_QUERIES);
      }
    } catch {
      setQueries(DEMO_QUERIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const fetchLogs = async (queryId: string) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/logs?queryId=${queryId}`);
      const data = await res.json();
      if (data.logs && data.logs.length > 0) {
        setLogs(data.logs.reverse());
      } else {
        setLogs(DEMO_LOGS[queryId] || []);
      }
    } catch {
      setLogs(DEMO_LOGS[queryId] || []);
    } finally {
      setLogsLoading(false);
    }
  };

  const selectQuery = (q: QueryEntry) => {
    setSelectedQuery(q);
    fetchLogs(q.id);
  };

  const filteredQueries = queries.filter((q) => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (search && !q.user_query.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Decision Logs</h1>
        <p className="page-subtitle">Full transparency into AI decisions, routing logic, and human interventions</p>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px 24px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="input-field"
          placeholder="🔍 Search queries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '280px' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'auto_approved', 'pending_review', 'human_approved', 'human_edited', 'rejected'].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
              style={{ fontSize: '11px', padding: '5px 12px' }}
            >
              {f === 'all' ? 'All' : STATUS_MAP[f]?.label || f}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          {filteredQueries.length} results
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: 'calc(100vh - 240px)' }}>
        {/* Query List */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Conversation History</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredQueries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">No matching queries</div>
                <div className="empty-state-sub">Try adjusting your search or filters</div>
              </div>
            ) : (
              filteredQueries.map((q) => (
                <div
                  key={q.id}
                  onClick={() => selectQuery(q)}
                  style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    background: selectedQuery?.id === q.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: '8px',
                  }}>
                    {q.user_query}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${STATUS_MAP[q.status]?.class || 'badge-draft'}`}>
                      {STATUS_MAP[q.status]?.label || q.status}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div className="confidence-bar" style={{ width: '50px' }}>
                        <div
                          className={`confidence-fill ${q.confidence_scor >= 0.75 ? 'confidence-high' : q.confidence_scor >= 0.5 ? 'confidence-medium' : 'confidence-low'}`}
                          style={{ width: `${q.confidence_scor * 100}%` }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {Math.round(q.confidence_scor * 100)}%
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {timeAgo(q.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Decision Timeline */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Decision Timeline</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {!selectedQuery ? (
              <div className="empty-state" style={{ height: '100%' }}>
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-text">Select a query to view logs</div>
                <div className="empty-state-sub">Click on a conversation to see the full decision trail</div>
              </div>
            ) : logsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="spinner" />
              </div>
            ) : (
              <div className="log-timeline">
                {logs.map((log) => {
                  const config = EVENT_CONFIG[log.event] || { label: log.event, icon: '📌', color: 'var(--text-muted)' };
                  return (
                    <div key={log.id} className={`log-entry ${log.event}`}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px' }}>{config.icon}</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: config.color }}>
                              {config.label}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {formatTime(log.timestamp)}
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginLeft: '26px' }}>
                            {log.details}
                          </p>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div style={{
                              marginTop: '8px', marginLeft: '26px', padding: '8px 12px',
                              background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                              fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace',
                            }}>
                              {Object.entries(log.metadata).map(([k, v]) => (
                                <div key={k}>
                                  <span style={{ color: 'var(--accent-cyan)' }}>{k}</span>: {JSON.stringify(v)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {logs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No detailed logs available for this query (demo mode)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
