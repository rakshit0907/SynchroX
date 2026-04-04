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
          <circle
            cx="80" cy="80" r="70" fill="none"
            stroke="url(#gradient-ai)" strokeWidth="14"
            strokeDasharray={`${aiDash} ${440 - aiDash}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
          <circle
            cx="80" cy="80" r="70" fill="none"
            stroke="url(#gradient-human)" strokeWidth="14"
            strokeDasharray={`${humanDash} ${440 - humanDash}`}
            strokeDashoffset={`${-aiDash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
          <defs>
            <linearGradient id="gradient-ai" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="gradient-human" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '28px', fontWeight: 800 }}>{total}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total</span>
        </div>
      </div>
      <div className="donut-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--accent-blue)' }} />
          <span>AI Automated — {Math.round(aiPct)}%</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--accent-amber)' }} />
          <span>Human Review — {Math.round(humanPct)}%</span>
        </div>
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // Use demo data if DB is not connected
      setStats({
        totalQueries: 147,
        autoApproved: 98,
        pendingReview: 12,
        humanApproved: 23,
        humanEdited: 11,
        rejected: 3,
        processing: 0,
        avgConfidence: 0.76,
        avgProcessingTime: 842,
        hitlRate: 31.3,
        recentQueries: [
          { id: '1', user_query: 'Analyze our Q3 revenue forecast and identify growth opportunities', status: 'auto_approved', confidence_score: 0.91, created_at: new Date().toISOString() },
          { id: '2', user_query: 'Draft a compliance report for GDPR data protection audit', status: 'pending_review', confidence_score: 0.62, created_at: new Date(Date.now() - 300000).toISOString() },
          { id: '3', user_query: 'Design a microservice architecture for the payment system', status: 'human_edited', confidence_score: 0.54, created_at: new Date(Date.now() - 600000).toISOString() },
          { id: '4', user_query: 'Generate marketing copy for the product launch campaign', status: 'auto_approved', confidence_score: 0.88, created_at: new Date(Date.now() - 900000).toISOString() },
          { id: '5', user_query: 'Review and optimize the database query performance', status: 'human_approved', confidence_score: 0.71, created_at: new Date(Date.now() - 1200000).toISOString() },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const submitQuery = async () => {
    if (!query.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const status = data.query?.status;
      const conf = data.query?.confidence_score;
      setToast(
        status === 'auto_approved'
          ? `✅ Auto-approved (confidence: ${Math.round(conf * 100)}%)`
          : `⚠️ Routed to human review (confidence: ${Math.round(conf * 100)}%)`
      );
      setQuery('');
      fetchStats();
    } catch {
      setToast('❌ Failed to submit query');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
      </div>
    );
  }

  const s = stats!;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Real-time overview of the SynchroX orchestration engine</p>
      </div>

      {/* Query Submission */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
              Submit a Query
            </label>
            <input
              className="input-field"
              placeholder="Enter your query for AI processing..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitQuery()}
            />
          </div>
          <button className="btn btn-primary" onClick={submitQuery} disabled={submitting} style={{ height: '46px', minWidth: '140px' }}>
            {submitting ? <div className="spinner" /> : '🚀 Process'}
          </button>
        </div>
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
          <div className="metric-value" style={{ color: 'var(--accent-green)' }}>
            {Math.round(s.avgConfidence * 100)}%
          </div>
          <div className="metric-change">Across all responses</div>
        </div>
        <div className="glass-card metric-card amber">
          <div className="metric-label">HITL Rate</div>
          <div className="metric-value" style={{ color: 'var(--accent-amber)' }}>
            {s.hitlRate}%
          </div>
          <div className="metric-change">Escalated to human</div>
        </div>
        <div className="glass-card metric-card purple">
          <div className="metric-label">Pending Review</div>
          <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>
            {s.pendingReview}
          </div>
          <div className="metric-change">Awaiting human action</div>
        </div>
      </div>

      {/* Charts & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        {/* Donut Chart */}
        <div className="glass-card">
          <div style={{ padding: '20px 24px 0' }}>
            <h3 className="section-title">AI vs Human Distribution</h3>
          </div>
          <DonutChart
            ai={s.autoApproved}
            human={s.humanApproved + s.humanEdited + s.pendingReview}
          />
        </div>

        {/* Recent Activity */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 0' }}>
            <h3 className="section-title">Recent Activity</h3>
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {s.recentQueries.map((q) => (
              <div key={q.id} className="activity-item">
                <div
                  className="activity-dot"
                  style={{
                    background: q.status === 'auto_approved'
                      ? 'var(--accent-green)'
                      : q.status === 'pending_review'
                        ? 'var(--accent-amber)'
                        : 'var(--accent-blue)',
                  }}
                />
                <div className="activity-content">
                  <div className="activity-text" style={{ 
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' 
                  }}>
                    {q.user_query}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge ${STATUS_MAP[q.status]?.class || ''}`}>
                      {STATUS_MAP[q.status]?.label || q.status}
                    </span>
                    <ConfidenceBar score={q.confidence_score} />
                    <span className="activity-time">{timeAgo(q.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Overview */}
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
              <div style={{ fontSize: '28px', fontWeight: 800, color: item.color, marginBottom: '4px' }}>
                {item.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
