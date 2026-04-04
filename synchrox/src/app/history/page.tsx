'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Query {
  id: string;
  user_query: string;
  ai_response: string;
  final_response: string;
  confidence_score: number;
  status: string;
  ai_model: string;
  routing_reason: string;
  human_notes: string;
  processing_time_ms: number;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'all',            label: 'All Statuses',      color: 'var(--text-muted)' },
  { value: 'auto_approved',  label: 'Auto Approved',     color: 'var(--accent-green)' },
  { value: 'human_approved', label: 'Human Approved',    color: 'var(--accent-blue)' },
  { value: 'human_edited',   label: 'Human Edited',      color: 'var(--accent-purple)' },
  { value: 'pending_review', label: 'Pending Review',    color: 'var(--accent-amber)' },
  { value: 'rejected',       label: 'Rejected',          color: 'var(--accent-red)' },
];

const DEMO_QUERIES: Query[] = [
  { id: '1', user_query: 'Explain GDPR compliance requirements for a healthcare SaaS startup', ai_response: 'GDPR requires data minimization, consent, and breach notification within 72 hours...', final_response: 'GDPR requires data minimization, consent, and breach notification within 72 hours...', confidence_score: 0.82, status: 'auto_approved', ai_model: 'mistral-7b', routing_reason: 'Confidence above threshold', human_notes: '', processing_time_ms: 1240, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', user_query: 'What happened on the 13th day of the Mahabharata war?', ai_response: 'On the 13th day, Abhimanyu entered the Chakravyuha...', final_response: 'On the 13th day, Abhimanyu entered the Chakravyuha...', confidence_score: 0.91, status: 'auto_approved', ai_model: 'demo-engine', routing_reason: 'High confidence historical query', human_notes: '', processing_time_ms: 340, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', user_query: 'Design a go-to-market strategy for enterprise AI in healthcare', ai_response: 'Consider targeting hospital CFOs with ROI-focused messaging...', final_response: 'After review: Focus on compliance-first positioning...', confidence_score: 0.54, status: 'human_edited', ai_model: 'mistral-7b', routing_reason: 'Below confidence threshold — business strategy domain', human_notes: 'Edited to include regulatory considerations', processing_time_ms: 1820, created_at: new Date(Date.now() - 18000000).toISOString() },
  { id: '4', user_query: 'Predict exact stock price of Tesla in Q4 2025', ai_response: 'Cannot provide exact predictions...', final_response: '', confidence_score: 0.31, status: 'rejected', ai_model: 'mistral-7b', routing_reason: 'Low confidence — speculative financial prediction', human_notes: 'Rejected: Outside scope of verifiable queries', processing_time_ms: 980, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', user_query: 'Who is the current President of India?', ai_response: 'Smt. Droupadi Murmu is the 15th President of India...', final_response: 'Smt. Droupadi Murmu is the 15th President of India...', confidence_score: 0.91, status: 'auto_approved', ai_model: 'demo-engine', routing_reason: 'High confidence factual query', human_notes: '', processing_time_ms: 210, created_at: new Date(Date.now() - 172800000).toISOString() },
];

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    auto_approved : { label: '⚡ Auto',    color: 'var(--accent-green)',  bg: 'rgba(16,185,129,0.12)' },
    human_approved: { label: '✅ Approved', color: 'var(--accent-blue)',   bg: 'rgba(59,130,246,0.12)' },
    human_edited  : { label: '✏️ Edited',  color: 'var(--accent-purple)', bg: 'rgba(139,92,246,0.12)' },
    pending_review: { label: '⏳ Pending', color: 'var(--accent-amber)',  bg: 'rgba(245,158,11,0.12)' },
    rejected      : { label: '❌ Rejected', color: 'var(--accent-red)',    bg: 'rgba(239,68,68,0.12)'  },
  };
  const s = map[status] || { label: status, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' };
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function confBar(score: number) {
  const color = score >= 0.75 ? 'var(--accent-green)' : score >= 0.5 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '48px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score * 100}%`, background: color, borderRadius: '4px' }} />
      </div>
      <span style={{ fontSize: '12px', color, fontWeight: 600, minWidth: '32px' }}>{Math.round(score * 100)}%</span>
    </div>
  );
}

export default function HistoryPage() {
  const [queries, setQueries]     = useState<Query[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('all');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [confMin, setConfMin]     = useState('');
  const [confMax, setConfMax]     = useState('');
  const [sortBy, setSortBy]       = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [isDemo, setIsDemo]       = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQueries = useCallback(async (overrides: Record<string, unknown> = {}) => {
    try {
      const params = new URLSearchParams({
        page     : String(overrides.page     ?? page),
        limit    : '15',
        sortBy   : overrides.sortBy    as string ?? sortBy,
        sortOrder: overrides.sortOrder as string ?? sortOrder,
        ...(search    && { search }),
        ...(status && status !== 'all' && { status }),
        ...(dateFrom  && { dateFrom }),
        ...(dateTo    && { dateTo }),
        ...(confMin   && { confMin }),
        ...(confMax   && { confMax }),
      });

      const res  = await fetch(`/api/queries?${params}`);
      const data = await res.json();

      if (data.queries && data.queries.length > 0) {
        setQueries(data.queries);
        setTotal(data.total || data.queries.length);
        setTotalPages(data.totalPages || 1);
        setIsDemo(false);
      } else {
        setQueries(DEMO_QUERIES);
        setTotal(DEMO_QUERIES.length);
        setTotalPages(1);
        setIsDemo(true);
      }
    } catch {
      setQueries(DEMO_QUERIES);
      setIsDemo(true);
    } finally { setLoading(false); }
  }, [page, sortBy, sortOrder, search, status, dateFrom, dateTo, confMin, confMax]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchQueries(), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [fetchQueries]);

  const exportCSV = () => {
    const headers = ['ID', 'Query', 'Status', 'Confidence', 'Model', 'Processing Time (ms)', 'Created At'];
    const rows    = queries.map(q => [
      q.id, `"${q.user_query.replace(/"/g, '""')}"`, q.status,
      Math.round(q.confidence_score * 100) + '%', q.ai_model || '',
      q.processing_time_ms || '', new Date(q.created_at).toLocaleString(),
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url; a.download = `synchrox-queries-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
      setSortOrder(newOrder);
      fetchQueries({ sortBy: col, sortOrder: newOrder });
    } else {
      setSortBy(col); setSortOrder('desc');
      fetchQueries({ sortBy: col, sortOrder: 'desc' });
    }
  };

  const sortIcon = (col: string) => sortBy === col ? (sortOrder === 'desc' ? ' ↓' : ' ↑') : '';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Query History</h1>
            <p className="page-subtitle">Search, filter, and export all AI orchestration queries</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isDemo && <span style={{ fontSize: '12px', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', padding: '4px 12px', borderRadius: '100px' }}>⚠️ Demo data</span>}
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{total} total queries</span>
            <button onClick={exportCSV} style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* Search */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search queries..."
              style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* Status */}
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Date From */}
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', colorScheme: 'dark' }} />

          {/* Date To */}
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', colorScheme: 'dark' }} />

          {/* Conf Range */}
          <input type="number" min="0" max="1" step="0.05" value={confMin} onChange={e => { setConfMin(e.target.value); setPage(1); }} placeholder="Conf min (0-1)" style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
          <input type="number" min="0" max="1" step="0.05" value={confMax} onChange={e => { setConfMax(e.target.value); setPage(1); }} placeholder="Conf max (0-1)" style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />

          {/* Clear */}
          <button onClick={() => { setSearch(''); setStatus('all'); setDateFrom(''); setDateTo(''); setConfMin(''); setConfMax(''); setPage(1); }} style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: 'var(--accent-red)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            ✕ Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 100px 130px 120px 140px 80px', padding: '12px 24px', borderBottom: '1px solid var(--border-glass)', gap: '12px' }}>
          {[
            { label: 'Query', col: 'user_query' },
            { label: 'Status', col: 'status' },
            { label: 'Confidence', col: 'confidence_score' },
            { label: 'Model', col: 'ai_model' },
            { label: 'Date', col: 'created_at' },
            { label: 'Time', col: 'processing_time_ms' },
          ].map(h => (
            <button key={h.col} onClick={() => handleSort(h.col)} style={{ textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }}>
              {h.label}{sortIcon(h.col)}
            </button>
          ))}
        </div>

        {/* Rows */}
        {queries.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px' }}>
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">No queries found</div>
            <div className="empty-state-sub">Try adjusting your filters</div>
          </div>
        ) : queries.map(q => (
          <div key={q.id}>
            {/* Row */}
            <div
              onClick={() => setExpanded(expanded === q.id ? null : q.id)}
              style={{ display: 'grid', gridTemplateColumns: '3fr 100px 130px 120px 140px 80px', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', gap: '12px', cursor: 'pointer', transition: 'background 0.15s ease', background: expanded === q.id ? 'rgba(59,130,246,0.04)' : 'transparent', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = expanded === q.id ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = expanded === q.id ? 'rgba(59,130,246,0.04)' : 'transparent')}
            >
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {expanded === q.id ? '▾ ' : '▸ '}{q.user_query}
                </div>
              </div>
              <div>{statusBadge(q.status)}</div>
              <div>{confBar(q.confidence_score)}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.ai_model || '—'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(q.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{q.processing_time_ms ? `${q.processing_time_ms}ms` : '—'}</div>
            </div>

            {/* Expanded Detail */}
            {expanded === q.id && (
              <div style={{ padding: '20px 28px 24px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* AI Response */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>AI Response</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', maxHeight: '180px', overflowY: 'auto' }}>
                      {q.ai_response || '—'}
                    </div>
                  </div>
                  {/* Final Response */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      {q.status === 'human_edited' ? '✏️ Edited Response' : 'Final Response'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', maxHeight: '180px', overflowY: 'auto' }}>
                      {q.final_response || q.ai_response || '—'}
                    </div>
                  </div>
                </div>
                {/* Metadata */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔀 <strong style={{ color: 'var(--text-secondary)' }}>Routing:</strong> {q.routing_reason || '—'}</div>
                  {q.human_notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📝 <strong style={{ color: 'var(--text-secondary)' }}>Notes:</strong> {q.human_notes}</div>}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'monospace' }}>ID: {q.id}</div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Page {page} of {totalPages} ({total} total)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setPage(p => Math.max(1, p - 1)); }} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>← Prev</button>
              <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); }} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
