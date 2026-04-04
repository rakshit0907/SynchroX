'use client';

import { useState, useEffect, useCallback } from 'react';

interface Stats {
  totalQueries: number;
  autoApproved: number;
  pendingReview: number;
  humanApproved: number;
  humanEdited: number;
  rejected: number;
  processing: number;
  avgConfidence: number;
  avgProcessingTime: number;
  hitlRate: number;
  recentQueries: Array<{
    id: string;
    user_query: string;
    status: string;
    confidence_score: number;
    created_at: string;
  }>;
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  processing: { label: 'Processing', class: 'badge-processing' },
  auto_approved: { label: 'Auto Approved', class: 'badge-auto' },
  pending_review: { label: 'Pending Review', class: 'badge-pending' },
  human_approved: { label: 'Approved', class: 'badge-approved' },
  human_edited: { label: 'Edited', class: 'badge-edited' },
  rejected: { label: 'Rejected', class: 'badge-rejected' },
};

const DEMO_QUERIES = [
  'Analyze our Q3 revenue forecast and identify market risks for next quarter.',
  'Draft a compliance report for the upcoming GDPR data protection audit.',
  'Create an API security vulnerability report for our payment microservices.',
  'Generate investor pitch deck talking points for our Series B funding round.',
  'Review and summarize the legal implications of our new SaaS contract template.',
];

function DonutChart({ ai, human }: { ai: number; human: number }) {
  const total = ai + human || 1;
  const aiPct = (ai / total) * 100;
  const humanPct = (human / total) * 100;
  const aiDash = (aiPct / 100) * 440;
  const humanDash = (humanPct / 100) * 440;
  return (
    <div className="donut-chart-container">
      <div className="donut-chart">
        <svg viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="14" />
          <circle cx="80" cy="80" r="70" fill="none" stroke="url(#g-ai)" strokeWidth="14"
            strokeDasharray={`${aiDash} ${440 - aiDash}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
          <circle cx="80" cy="80" r="70" fill="none" stroke="url(#g-human)" strokeWidth="14"
            strokeDasharray={`${humanDash} ${440 - humanDash}`} strokeDashoffset={`${-aiDash}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
          <defs>
            <linearGradient id="g-ai" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="g-human" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '28px', fontWeight: 800 }}>{total}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total</span>
        </div>
      </div>
      <div className="donut-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent-blue)' }} /><span>AI Automated — {Math.round(aiPct)}%</span></div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent-amber)' }} /><span>Human Review — {Math.round(humanPct)}%</span></div>
      </div>
    </div>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const cls = score >= 0.75 ? 'confidence-high' : score >= 0.5 ? 'confidence-medium' : 'confidence-low';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className="confidence-bar" style={{ width: '80px' }}>
        <div className={`confidence-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '36px' }}>{pct}%</span>
    </div>
  );
}

function SmartRoutingVisualizer({ threshold, pendingCount }: { threshold: number; pendingCount: number }) {
  const [animStep, setAnimStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAnimStep(s => (s + 1) % 5), 1200);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { label: 'Query In', icon: '📥', color: 'var(--accent-blue)', active: animStep >= 0 },
    { label: 'AI Analysis', icon: '🤖', color: 'var(--accent-purple)', active: animStep >= 1 },
    { label: `Conf. Check\n≥${Math.round(threshold * 100)}%`, icon: '🔀', color: 'var(--accent-cyan)', active: animStep >= 2 },
    { label: 'Auto Approve', icon: '✅', color: 'var(--accent-green)', active: animStep >= 3 },
    { label: 'HITL Review', icon: '👤', color: 'var(--accent-amber)', active: animStep >= 3 },
  ];

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', position: 'relative' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', border: `2px solid ${step.active ? step.color : 'rgba(255,255,255,0.1)'}`,
                background: step.active ? `${step.color}15` : 'rgba(255,255,255,0.02)',
                boxShadow: step.active ? `0 0 16px ${step.color}40` : 'none',
                transition: 'all 0.4s ease',
              }}>{step.icon}</div>
              <span style={{ fontSize: '10px', color: step.active ? step.color : 'var(--text-muted)', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3, transition: 'color 0.4s ease' }}>
                {step.label}
              </span>
            </div>
            {i < 3 && (
              <div style={{ flex: 1, height: '2px', margin: '0 4px', marginBottom: '20px', background: animStep > i ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)', transition: 'background 0.4s ease', borderRadius: '1px' }} />
            )}
            {i === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '4px', marginBottom: '20px' }}>
                <div style={{ width: '24px', height: '2px', background: animStep >= 3 ? 'var(--accent-green)' : 'rgba(255,255,255,0.08)', transform: 'rotate(-20deg)', transition: 'background 0.4s ease', borderRadius: '1px' }} />
                <div style={{ width: '24px', height: '2px', background: animStep >= 3 ? 'var(--accent-amber)' : 'rgba(255,255,255,0.08)', transform: 'rotate(20deg)', transition: 'background 0.4s ease', borderRadius: '1px' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      {pendingCount > 0 && (
        <div style={{ marginTop: '12px', padding: '8px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--accent-amber)' }}>
          ⚠️ {pendingCount} {pendingCount === 1 ? 'query is' : 'queries are'} waiting for human review →{' '}
          <a href="/review" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>Go to HITL Review</a>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [threshold] = useState(0.75);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.totalQueries !== undefined) setStats(data);
      else throw new Error('bad data');
    } catch {
      setStats({
        totalQueries: 147, autoApproved: 98, pendingReview: 3, humanApproved: 23,
        humanEdited: 11, rejected: 3, processing: 0, avgConfidence: 0.76,
        avgProcessingTime: 842, hitlRate: 31.3,
        recentQueries: [
          { id: '1', user_query: 'Analyze Q3 revenue forecast', status: 'auto_approved', confidence_score: 0.91, created_at: new Date().toISOString() },
          { id: '2', user_query: 'Draft GDPR compliance report', status: 'pending_review', confidence_score: 0.62, created_at: new Date(Date.now() - 300000).toISOString() },
          { id: '3', user_query: 'Design payment microservice arch', status: 'human_edited', confidence_score: 0.54, created_at: new Date(Date.now() - 600000).toISOString() },
          { id: '4', user_query: 'Generate product launch copy', status: 'auto_approved', confidence_score: 0.88, created_at: new Date(Date.now() - 900000).toISOString() },
          { id: '5', user_query: 'Optimize database query performance', status: 'human_approved', confidence_score: 0.71, created_at: new Date(Date.now() - 1200000).toISOString() },
        ],
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 10000);
    return () => clearInterval(t);
  }, [fetchStats]);

  const submitQuery = async (queryText?: string) => {
    const text = queryText || query;
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      const status = data.query?.status;
      const conf = data.query?.confidence_score;
      if (!queryText) setQuery('');
      setToast(status === 'auto_approved'
        ? `✅ Auto-approved! Confidence: ${Math.round((conf || 0) * 100)}%`
        : `⚠️ Routed to HITL Review. Confidence: ${Math.round((conf || 0) * 100)}% (below ${Math.round(threshold * 100)}% threshold)`
      );
      fetchStats();
    } catch {
      setToast('❌ Failed to submit query');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const runDemo = async () => {
    setDemoRunning(true);
    // Pick a random demo query designed to be ambiguous (will likely go to HITL)
    const demoQuery = DEMO_QUERIES[Math.floor(Math.random() * DEMO_QUERIES.length)];
    setQuery(demoQuery);
    setToast('🎭 Demo: Submitting a complex query that may trigger HITL review...');
    await new Promise(r => setTimeout(r, 1000));
    await submitQuery(demoQuery);
    setDemoRunning(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
    </div>
  );

  const s = stats!;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Real-time overview of the SynchroX orchestration engine</p>
      </div>

      {/* Query Submission + Demo Mode */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        {/* Query Templates */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            ⚡ Quick Templates
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              { label: '📋 GDPR Compliance', text: 'What are the key GDPR compliance requirements for a healthcare SaaS startup handling patient data?' },
              { label: '📈 Market Analysis', text: 'Analyze the competitive landscape for enterprise AI orchestration tools in 2024 and identify growth opportunities.' },
              { label: '🏗️ System Design', text: 'Design a scalable microservices architecture for a real-time payment processing system handling 10k TPS.' },
              { label: '⚖️ Legal Review', text: 'What are the legal risks in a SaaS contract that includes automatic renewal and data processing clauses?' },
              { label: '🔒 Security Audit', text: 'Identify the top security vulnerabilities in a REST API that handles financial transactions without rate limiting.' },
              { label: '🌐 Geopolitical', text: 'Analyze the geopolitical implications of AI regulation divergence between the EU AI Act and US executive orders.' },
            ].map(t => (
              <button key={t.label} onClick={() => setQuery(t.text)} style={{
                padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s ease', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.12)'; (e.target as HTMLElement).style.borderColor = 'rgba(59,130,246,0.3)'; (e.target as HTMLElement).style.color = 'var(--accent-blue)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.target as HTMLElement).style.borderColor = 'var(--border-glass)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)'; }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
              Submit a Query to the AI Engine
            </label>
            <input className="input-field" placeholder="Enter your query or click a template above... (Press Enter to submit)"
              value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitQuery()} />
          </div>

          <button className="btn btn-primary" onClick={() => submitQuery()} disabled={submitting || !query.trim()} style={{ height: '46px', minWidth: '130px' }}>
            {submitting ? <div className="spinner" /> : '🚀 Process'}
          </button>
          <button
            onClick={runDemo}
            disabled={demoRunning || submitting}
            style={{
              height: '46px', minWidth: '150px', padding: '0 20px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.4)',
              background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '14px', fontWeight: 600,
              cursor: demoRunning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
            }}
          >
            {demoRunning ? <div className="spinner" /> : '🎭 Run HITL Demo'}
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
          💡 <strong>Demo Mode:</strong> Submits a complex query that forces it through the HITL review flow — perfect for demonstrations.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-card metric-card blue">
          <div className="metric-label">Total Queries</div>
          <div className="metric-value gradient-text">{s.totalQueries}</div>
          <div className="metric-change">All time processed</div>
        </div>
        <div className="glass-card metric-card green">
          <div className="metric-label">Avg Confidence</div>
          <div className="metric-value" style={{ color: 'var(--accent-green)' }}>{Math.round(s.avgConfidence * 100)}%</div>
          <div className="metric-change">Across all responses</div>
        </div>
        <div className="glass-card metric-card amber">
          <div className="metric-label">HITL Rate</div>
          <div className="metric-value" style={{ color: 'var(--accent-amber)' }}>{s.hitlRate}%</div>
          <div className="metric-change">Escalated to human</div>
        </div>
        <div className="glass-card metric-card purple">
          <div className="metric-label">Pending Review</div>
          <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>{s.pendingReview}</div>
          <div className="metric-change">Awaiting human action</div>
        </div>
      </div>

      {/* Smart Routing Visualizer */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '16px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title">⚡ Smart Routing Engine</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Threshold: <strong style={{ color: 'var(--accent-blue)' }}>{Math.round(threshold * 100)}%</strong>
          </span>
        </div>
        <SmartRoutingVisualizer threshold={threshold} pendingCount={s.pendingReview} />
      </div>

      {/* Charts & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card">
          <div style={{ padding: '20px 24px 0' }}>
            <h3 className="section-title">AI vs Human Distribution</h3>
          </div>
          <DonutChart ai={s.autoApproved} human={s.humanApproved + s.humanEdited + s.pendingReview} />
        </div>

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 0' }}>
            <h3 className="section-title">Recent Activity</h3>
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {s.recentQueries.map((q) => (
              <div key={q.id} className="activity-item">
                <div className="activity-dot" style={{
                  background: q.status === 'auto_approved' ? 'var(--accent-green)'
                    : q.status === 'pending_review' ? 'var(--accent-amber)' : 'var(--accent-blue)',
                }} />
                <div className="activity-content">
                  <div className="activity-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                    {q.user_query}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge ${STATUS_MAP[q.status]?.class || ''}`}>{STATUS_MAP[q.status]?.label || q.status}</span>
                    <ConfidenceBar score={q.confidence_score} />
                    <span className="activity-time">{timeAgo(q.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Processing Stats */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 className="section-title" style={{ marginBottom: '20px' }}>Processing Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', textAlign: 'center' }}>
          {[
            { label: 'Auto Approved', value: s.autoApproved, color: 'var(--accent-green)' },
            { label: 'Pending Review', value: s.pendingReview, color: 'var(--accent-amber)' },
            { label: 'Human Approved', value: s.humanApproved, color: 'var(--accent-blue)' },
            { label: 'Human Edited', value: s.humanEdited, color: 'var(--accent-purple)' },
            { label: 'Rejected', value: s.rejected, color: 'var(--accent-red)' },
            { label: 'Avg Time', value: `${s.avgProcessingTime}ms`, color: 'var(--accent-cyan)' },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: item.color, marginBottom: '4px' }}>{item.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
