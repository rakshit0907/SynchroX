'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReviewQuery {
  id: string;
  user_query: string;
  ai_response: string;
  confidence_score: number;
  status: string;
  routing_reason: string;
  ai_model: string;
  processing_time_ms: number;
  created_at: string;
}

const DEMO_QUERIES: ReviewQuery[] = [
  { id: 'demo1', user_query: 'Draft a compliance report for GDPR data protection audit.', ai_response: 'The regulatory framework requires adherence to GDPR Article 17. I recommend implementing automated compliance checks.', confidence_score: 0.62, status: 'pending_review', routing_reason: 'Confidence (0.62) below threshold (0.75)', ai_model: 'demo', processing_time_ms: 890, created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 'demo2', user_query: 'Create an innovative brand story for our AI-powered product line.', ai_response: "Consider reframing the problem as an opportunity for innovation. The unconventional approach could differentiate your solution.", confidence_score: 0.48, status: 'pending_review', routing_reason: 'Confidence (0.48) below threshold (0.75)', ai_model: 'demo', processing_time_ms: 1120, created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 'demo3', user_query: 'Design the database schema for a microservice payment system with CQRS.', ai_response: 'I suggest using CQRS with event sourcing. This provides strong consistency while maintaining high throughput for reads.', confidence_score: 0.54, status: 'pending_review', routing_reason: 'Confidence (0.54) below threshold (0.75)', ai_model: 'demo', processing_time_ms: 750, created_at: new Date(Date.now() - 1200000).toISOString() },
];

export default function ReviewPage() {
  const [queries, setQueries] = useState<ReviewQuery[]>([]);
  const [selected, setSelected] = useState<ReviewQuery | null>(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/queries?status=pending_review');
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
    fetchPending();
  }, [fetchPending]);

  const selectQuery = (q: ReviewQuery) => {
    setSelected(q);
    setEditedResponse(q.ai_response || '');
    setNotes('');
  };

  const handleAction = async (action: 'approve' | 'edit' | 'reject') => {
    if (!selected) return;
    setActionLoading(true);

    try {
      if (selected.id.startsWith('demo')) {
        // Demo mode
        await new Promise((r) => setTimeout(r, 500));
        setQueries((prev) => prev.filter((q) => q.id !== selected.id));
        setSelected(null);
        setToast(
          action === 'approve' ? '✅ Response approved!'
            : action === 'edit' ? '📝 Edited response approved!'
              : '❌ Response rejected'
        );
      } else {
        await fetch(`/api/queries/${selected.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            editedResponse: action === 'edit' ? editedResponse : undefined,
            notes,
            reason: action === 'reject' ? notes || 'Rejected by reviewer' : undefined,
          }),
        });
        setSelected(null);
        fetchPending();
        setToast(
          action === 'approve' ? '✅ Response approved!'
            : action === 'edit' ? '📝 Edited response approved!'
              : '❌ Response rejected'
        );
      }
    } catch {
      setToast('❌ Action failed');
    } finally {
      setActionLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getConfColor = (score: number) =>
    score >= 0.75 ? 'var(--accent-green)' : score >= 0.5 ? 'var(--accent-amber)' : 'var(--accent-red)';

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
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
        <h1 className="page-title">Human-in-the-Loop Review</h1>
        <p className="page-subtitle">Review, edit, and approve AI responses that didn&apos;t meet the confidence threshold</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', height: 'calc(100vh - 160px)' }}>
        {/* Queue */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Review Queue</h3>
            <span className="badge badge-pending">{queries.length} pending</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {queries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✨</div>
                <div className="empty-state-text">All caught up!</div>
                <div className="empty-state-sub">No queries pending review</div>
              </div>
            ) : (
              queries.map((q) => (
                <div
                  key={q.id}
                  onClick={() => selectQuery(q)}
                  style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    background: selected?.id === q.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    borderLeft: selected?.id === q.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: '8px',
                  }}>
                    {q.user_query}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: getConfColor(q.confidence_score),
                      }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {Math.round(q.confidence_score * 100)}%
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {timeAgo(q.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Review Panel */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Review Response</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="badge badge-pending">
                      Confidence: {Math.round(selected.confidence_score * 100)}%
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px' }}>
                      {selected.ai_model} • {selected.processing_time_ms}ms
                    </span>
                  </div>
                </div>

                <div style={{
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)',
                  fontSize: '12px', color: 'var(--accent-amber)',
                }}>
                  ⚠️ {selected.routing_reason}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {/* Original Query */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                    Original Query
                  </label>
                  <div style={{
                    padding: '16px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                    fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6',
                  }}>
                    {selected.user_query}
                  </div>
                </div>

                {/* AI Response (editable) */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                    AI Response (editable)
                  </label>
                  <textarea
                    className="input-field"
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    style={{ minHeight: '160px' }}
                  />
                </div>

                {/* Reviewer Notes */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                    Reviewer Notes (optional)
                  </label>
                  <input
                    className="input-field"
                    placeholder="Add notes about your decision..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Confidence Visual */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                    Confidence Score
                  </label>
                  <div className="confidence-bar" style={{ height: '10px' }}>
                    <div
                      className={`confidence-fill ${selected.confidence_score >= 0.75 ? 'confidence-high' : selected.confidence_score >= 0.5 ? 'confidence-medium' : 'confidence-low'}`}
                      style={{ width: `${selected.confidence_score * 100}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Low</span>
                    <span>{Math.round(selected.confidence_score * 100)}%</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                padding: '20px 24px', borderTop: '1px solid var(--border-glass)',
                display: 'flex', gap: '12px', justifyContent: 'flex-end',
              }}>
                <button
                  className="btn btn-danger"
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                >
                  ❌ Reject
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAction('edit')}
                  disabled={actionLoading || editedResponse === (selected.ai_response || '')}
                  style={{ opacity: editedResponse === (selected.ai_response || '') ? 0.5 : 1 }}
                >
                  📝 Approve with Edits
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                >
                  {actionLoading ? <div className="spinner" /> : '✅ Approve'}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-text">Select a query to review</div>
              <div className="empty-state-sub">Choose from the queue on the left to start reviewing</div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
