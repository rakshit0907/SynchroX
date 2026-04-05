'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

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
  { id: 'demo1', user_query: 'Draft a compliance report for our upcoming GDPR data protection audit including key areas and recommended actions.', ai_response: 'The regulatory framework requires adherence to data protection standards including GDPR Article 17 (Right to Erasure). I recommend implementing automated compliance checks and quarterly audits.', confidence_score: 0.62, status: 'pending_review', routing_reason: 'Confidence (0.62) below threshold (0.75) — legal/compliance domain requires human verification', ai_model: 'demo', processing_time_ms: 890, created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 'demo2', user_query: 'Create an innovative brand story for our new AI-powered product line targeting enterprise customers in healthcare.', ai_response: 'Consider reframing your solution as a clinical intelligence platform. Emphasize safety, regulatory compliance (FDA/CE), and ROI metrics that resonate with hospital procurement teams.', confidence_score: 0.48, status: 'pending_review', routing_reason: 'Confidence (0.48) below threshold (0.75) — creative/brand content requires human tone-check', ai_model: 'demo', processing_time_ms: 1120, created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 'demo3', user_query: 'Design the database schema for our new microservice-based payment processing system with CQRS pattern.', ai_response: 'Recommend using CQRS with event sourcing and Kafka for the event bus. Write side: PostgreSQL with optimistic locking. Read side: Redis for fast queries. Audit log: Append-only tables.', confidence_score: 0.54, status: 'pending_review', routing_reason: 'Confidence (0.54) below threshold (0.75) — architectural decisions need senior review', ai_model: 'demo', processing_time_ms: 750, created_at: new Date(Date.now() - 1200000).toISOString() },
];

function ExplainableAIPanel({ query }: { query: ReviewQuery }) {
  const score = query.confidence_score;
  const factors = [
    { name: 'Domain Confidence', score: Math.min(1, score + 0.1), desc: score > 0.7 ? 'Well-understood domain' : 'Specialized or ambiguous domain', color: 'var(--accent-blue)' },
    { name: 'Response Coherence', score: Math.min(1, score + 0.15), desc: score > 0.65 ? 'Logically structured response' : 'Some logical gaps detected', color: 'var(--accent-purple)' },
    { name: 'Factual Certainty', score: Math.max(0, score - 0.05), desc: score > 0.7 ? 'High factual alignment' : 'Unverified claims present', color: 'var(--accent-cyan)' },
    { name: 'Risk Level', score: 1 - score, desc: score > 0.7 ? 'Low risk of error' : 'Moderate-high error risk', color: score > 0.7 ? 'var(--accent-green)' : 'var(--accent-amber)' },
  ];

  const routingSteps = [
    { step: 'Query received', done: true, color: 'var(--accent-blue)' },
    { step: `AI processed (${query.ai_model})`, done: true, color: 'var(--accent-purple)' },
    { step: `Confidence: ${Math.round(score * 100)}% < 75%`, done: true, color: 'var(--accent-amber)' },
    { step: 'Routed to HITL review', done: true, color: 'var(--accent-amber)' },
    { step: 'Awaiting your decision', done: false, color: 'var(--text-muted)' },
  ];

  return (
    <div style={{ borderTop: '1px solid var(--border-glass)', padding: '20px 24px' }}>
      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
        🧠 Explainable AI
      </h4>

      {/* Routing Decision Trail */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Routing Decision Trail</div>
        {routingSteps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.done ? s.color : 'rgba(255,255,255,0.1)', flexShrink: 0, boxShadow: s.done ? `0 0 8px ${s.color}60` : 'none' }} />
            <span style={{ fontSize: '12px', color: s.done ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{s.step}</span>
          </div>
        ))}
      </div>

      {/* Confidence Factor Breakdown */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Confidence Breakdown</div>
        {factors.map((f) => (
          <div key={f.name} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
              <span style={{ color: f.color, fontWeight: 600 }}>{Math.round(f.score * 100)}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: f.color, width: `${f.score * 100}%`, borderRadius: '4px', transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Why HITL */}
      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        <strong style={{ color: 'var(--accent-amber)' }}>Why HITL?</strong><br />
        {query.routing_reason || 'Confidence below threshold — human verification required.'}
      </div>
    </div>
  );
}

function ContextSummary({ query }: { query: ReviewQuery }) {
  const text = query.user_query.toLowerCase();
  const intents = [
    { kw: ['analyze', 'analysis', 'forecast', 'identify'], label: 'Analysis', icon: '📊', color: 'var(--accent-blue)' },
    { kw: ['draft', 'create', 'generate', 'write'], label: 'Generation', icon: '✍️', color: 'var(--accent-purple)' },
    { kw: ['design', 'architecture', 'schema', 'structure'], label: 'Architecture', icon: '🏗️', color: 'var(--accent-cyan)' },
    { kw: ['compliance', 'gdpr', 'legal', 'regulation', 'audit'], label: 'Compliance', icon: '⚖️', color: 'var(--accent-amber)' },
    { kw: ['security', 'vulnerability', 'risk', 'threat'], label: 'Security', icon: '🛡️', color: 'var(--accent-red)' },
    { kw: ['review', 'optimize', 'improve', 'enhance'], label: 'Review', icon: '🔍', color: 'var(--accent-green)' },
  ];
  const detected = intents.filter(i => i.kw.some(kw => text.includes(kw)));
  const wordCount = query.user_query.split(' ').length;
  const sentences = query.user_query.split(/[.!?]+/).filter(Boolean).length;
  const complexity = wordCount > 30 ? 'High' : wordCount > 15 ? 'Medium' : 'Low';
  const complexityColor = wordCount > 30 ? 'var(--accent-red)' : wordCount > 15 ? 'var(--accent-amber)' : 'var(--accent-green)';

  return (
    <div style={{ borderTop: '1px solid var(--border-glass)', padding: '20px 24px' }}>
      <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
        📋 Context Summary
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'Words', value: wordCount },
          { label: 'Sentences', value: sentences },
          { label: 'Complexity', value: complexity, color: complexityColor },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: stat.color || 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Detected Intents</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {detected.length > 0 ? detected.map((d) => (
            <span key={d.label} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', background: `${d.color}15`, color: d.color, border: `1px solid ${d.color}30` }}>
              {d.icon} {d.label}
            </span>
          )) : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>General query</span>}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Suggested Actions</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          {detected.some(d => d.label === 'Compliance') && <div>• Verify regulatory references before approving</div>}
          {detected.some(d => d.label === 'Architecture') && <div>• Check with engineering lead for technical accuracy</div>}
          {detected.some(d => d.label === 'Security') && <div>• Flag for security team review if needed</div>}
          {detected.some(d => d.label === 'Generation') && <div>• Check tone and brand alignment before approval</div>}
          {detected.length === 0 && <div>• Review response for factual accuracy and completeness</div>}
          <div>• Approve as-is, edit response, or reject with reason</div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const [queries, setQueries] = useState<ReviewQuery[]>([]);
  const [selected, setSelected] = useState<ReviewQuery | null>(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<'edit' | 'explain' | 'context'>('edit');
  const [slaStats, setSlaStats] = useState<{ total_pending: number; within_sla: number; warning: number; breached: number; critical: number; avg_wait_mins: number } | null>(null);
  const [tick, setTick] = useState(0); // forces re-render every minute for live timers
  const { profile } = useAuth();
  const canReview = profile?.role === 'admin' || profile?.role === 'reviewer';

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/queries?status=pending_review');
      const data = await res.json();
      if (data.queries && data.queries.length > 0) setQueries(data.queries);
      else setQueries(DEMO_QUERIES);
    } catch {
      setQueries(DEMO_QUERIES);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchPending();
    const t = setInterval(fetchPending, 5000);
    return () => clearInterval(t);
  }, [fetchPending]);

  // SLA checker — runs every 5 mins
  useEffect(() => {
    const checkSLA = async () => {
      try {
        const res = await fetch('/api/sla');
        const data = await res.json();
        if (data.stats) setSlaStats(data.stats);
      } catch { /* ignore */ }
    };
    checkSLA();
    const slaInterval = setInterval(checkSLA, 5 * 60 * 1000);
    return () => clearInterval(slaInterval);
  }, []);

  // Live SLA timer — ticks every 30s to update displayed wait times
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const selectQuery = (q: ReviewQuery) => {
    setSelected(q);
    setEditedResponse(q.ai_response || '');
    setNotes('');
    setActivePanel('edit');
  };

  const handleAction = async (action: 'approve' | 'edit' | 'reject') => {
    if (!selected) return;
    setActionLoading(true);
    try {
      if (selected.id.startsWith('demo')) {
        await new Promise((r) => setTimeout(r, 600));
        setQueries((prev) => prev.filter((q) => q.id !== selected.id));
        setSelected(null);
      } else {
        await fetch(`/api/queries/${selected.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, editedResponse: action === 'edit' ? editedResponse : undefined, notes, reason: action === 'reject' ? notes || 'Rejected by reviewer' : undefined }),
        });
        setSelected(null);
        fetchPending();
      }
      setToast(action === 'approve' ? '✅ Response approved!' : action === 'edit' ? '📝 Edited response approved!' : '❌ Response rejected');
    } catch {
      setToast('❌ Action failed');
    } finally {
      setActionLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getConfColor = (s: number) => s >= 0.75 ? 'var(--accent-green)' : s >= 0.5 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };
  const getSLAStatus = (createdAt: string) => {
    void tick; // depend on tick so timers update every 30s
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 20) return { label: `⏱ ${mins}m`, color: 'var(--accent-green)',  bg: 'rgba(16,185,129,0.1)',  urgent: false };
    if (mins < 30) return { label: `⚠️ ${mins}m`, color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.1)', urgent: false };
    if (mins < 60) return { label: `🚨 ${mins}m`, color: 'var(--accent-red)',   bg: 'rgba(239,68,68,0.1)',  urgent: true };
    return { label: `🔴 ${Math.floor(mins/60)}h ${mins%60}m`, color: '#ff4444', bg: 'rgba(239,68,68,0.15)', urgent: true };
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
    </div>
  );

  const tabStyle = (tab: typeof activePanel) => ({
    padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none',
    background: activePanel === tab ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: activePanel === tab ? 'var(--accent-blue)' : 'var(--text-muted)',
    fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
  });

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">HITL Review</h1>
            <p className="page-subtitle">Review, edit, and approve AI responses — with Explainable AI insights</p>
          </div>
          {!canReview && (
            <div style={{ padding: '10px 18px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👁️</span>
              <span style={{ fontSize: '13px', color: 'var(--accent-amber)', fontWeight: 600 }}>Read-only — Viewers cannot approve, edit, or reject queries</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr 320px', gap: '20px', height: 'calc(100vh - 160px)' }}>
        {/* Queue */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Review Queue</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse-glow 2s infinite' }} />
              <span className="badge badge-pending">{queries.length} pending</span>
            </div>
          </div>
          {/* SLA Stats Bar */}
          {slaStats && slaStats.total_pending > 0 && (
            <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {slaStats.within_sla > 0 && <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>✅ {slaStats.within_sla} on track</span>}
              {slaStats.warning > 0 && <span style={{ fontSize: '11px', color: 'var(--accent-amber)' }}>⚠️ {slaStats.warning} warning</span>}
              {slaStats.breached > 0 && <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>🚨 {slaStats.breached} breached</span>}
              {slaStats.avg_wait_mins > 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>avg {slaStats.avg_wait_mins}m wait</span>}
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {queries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✨</div>
                <div className="empty-state-text">All caught up!</div>
                <div className="empty-state-sub">No queries pending review</div>
              </div>
            ) : queries.map((q) => (
              <div key={q.id} onClick={() => selectQuery(q)} style={{
                padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
                background: selected?.id === q.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                borderLeft: selected?.id === q.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                  {q.user_query}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getConfColor(q.confidence_score) }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{Math.round(q.confidence_score * 100)}%</span>
                  </div>
                  {(() => { const sla = getSLAStatus(q.created_at); return (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: sla.color, background: sla.bg, padding: '2px 8px', borderRadius: '100px', animation: sla.urgent ? 'pulse-glow 1.5s infinite' : 'none' }}>
                      {sla.label}
                    </span>
                  ); })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Panel */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Review Response</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="badge badge-pending">Confidence: {Math.round(selected.confidence_score * 100)}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px' }}>{selected.processing_time_ms}ms</span>
                  </div>
                </div>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
                  <button style={tabStyle('edit')} onClick={() => setActivePanel('edit')}>✏️ Edit</button>
                  <button style={tabStyle('explain')} onClick={() => setActivePanel('explain')}>🧠 Explain</button>
                  <button style={tabStyle('context')} onClick={() => setActivePanel('context')}>📋 Context</button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {activePanel === 'edit' && (
                  <div style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Original Query</label>
                      <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                        {selected.user_query}
                      </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>AI Response (editable)</label>
                      <textarea className="input-field" value={editedResponse} onChange={(e) => setEditedResponse(e.target.value)} style={{ minHeight: '160px' }} />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Notes (optional)</label>
                      <input className="input-field" placeholder="Add reviewer notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Confidence Score</label>
                      <div className="confidence-bar" style={{ height: '10px' }}>
                        <div className={`confidence-fill ${selected.confidence_score >= 0.75 ? 'confidence-high' : selected.confidence_score >= 0.5 ? 'confidence-medium' : 'confidence-low'}`} style={{ width: `${selected.confidence_score * 100}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span>Low</span><span>{Math.round(selected.confidence_score * 100)}%</span><span>High</span>
                      </div>
                    </div>
                  </div>
                )}
                {activePanel === 'explain' && <ExplainableAIPanel query={selected} />}
                {activePanel === 'context' && <ContextSummary query={selected} />}
              </div>

              {canReview ? (
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-danger" onClick={() => handleAction('reject')} disabled={actionLoading}>❌ Reject</button>
                  <button className="btn btn-secondary" onClick={() => handleAction('edit')} disabled={actionLoading || editedResponse === (selected.ai_response || '')} style={{ opacity: editedResponse === (selected.ai_response || '') ? 0.5 : 1 }}>
                    📝 Approve with Edits
                  </button>
                  <button className="btn btn-success" onClick={() => handleAction('approve')} disabled={actionLoading}>
                    {actionLoading ? <div className="spinner" /> : '✅ Approve'}
                  </button>
                </div>
              ) : (
                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-glass)', background: 'rgba(245,158,11,0.04)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--accent-amber)' }}>👁️ You have read-only access. Ask an admin to assign you the <strong>reviewer</strong> role to take actions.</span>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-text">Select a query to review</div>
              <div className="empty-state-sub">Choose from the queue on the left</div>
            </div>
          )}
        </div>

        {/* Info Panel (always visible) */}
        <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>HITL Guide</h3>
          </div>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Decision Guide</div>
              {[
                { action: '✅ Approve', desc: 'Response is accurate and complete. Send as-is.', color: 'var(--accent-green)' },
                { action: '📝 Edit', desc: 'Response is mostly good but needs corrections.', color: 'var(--accent-blue)' },
                { action: '❌ Reject', desc: 'Response is wrong or inappropriate.', color: 'var(--accent-red)' },
              ].map((item) => (
                <div key={item.action} style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: item.color, marginBottom: '4px' }}>{item.action}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '8px' }}>💡 Tips</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                <div>• Switch to <strong>Explain</strong> tab to see why the AI was uncertain</div>
                <div>• Check <strong>Context</strong> tab for intent analysis</div>
                <div>• Use Notes to leave audit trail</div>
                <div>• Queue auto-refreshes every 5s</div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '4px' }}>🎭 Demo Mode</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Click <strong>Run HITL Demo</strong> on the Dashboard to auto-submit a query that appears here for review.
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
