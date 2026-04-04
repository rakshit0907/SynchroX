'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsData {
  overview: {
    totalWorkflowsExecuted: number;
    totalQueries: number;
    totalTrustShieldScans: number;
    activeWorkflows: number;
  };
  aiVsHuman: {
    aiAutoApproved: number;
    humanReviewed: number;
    humanEdited: number;
    rejected: number;
    ratio: string;
  };
  confidence: {
    average: number;
    high: number;
    medium: number;
    low: number;
    distribution: Array<{ range: string; count: number }>;
  };
  trustShield: {
    totalScans: number;
    aiGenerated: number;
    authentic: number;
    inconclusive: number;
    avgConfidence: number;
  };
  weeklyTrend: Array<{ day: string; queries: number; trustShield: number }>;
}

const DEMO: AnalyticsData = {
  overview: { totalWorkflowsExecuted: 12, totalQueries: 847, totalTrustShieldScans: 234, activeWorkflows: 5 },
  aiVsHuman: { aiAutoApproved: 614, humanReviewed: 178, humanEdited: 41, rejected: 14, ratio: '73:27' },
  confidence: {
    average: 0.79, high: 614, medium: 178, low: 55,
    distribution: [
      { range: '0–20%', count: 12 }, { range: '20–40%', count: 43 },
      { range: '40–60%', count: 112 }, { range: '60–80%', count: 287 }, { range: '80–100%', count: 393 },
    ],
  },
  trustShield: { totalScans: 234, aiGenerated: 89, authentic: 112, inconclusive: 33, avgConfidence: 0.72 },
  weeklyTrend: [
    { day: 'Mon', queries: 124, trustShield: 31 }, { day: 'Tue', queries: 98, trustShield: 24 },
    { day: 'Wed', queries: 156, trustShield: 42 }, { day: 'Thu', queries: 134, trustShield: 38 },
    { day: 'Fri', queries: 187, trustShield: 56 }, { day: 'Sat', queries: 72, trustShield: 19 },
    { day: 'Sun', queries: 76, trustShield: 24 },
  ],
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="glass-card metric-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-change">{sub}</div>
    </div>
  );
}

function BarChart({ data, maxValue, color }: { data: Array<{ label: string; value: number }>; maxValue: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.value}</span>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0', background: color,
              height: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%`,
              minHeight: d.value > 0 ? '4px' : '0', transition: 'height 0.8s ease',
            }} />
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>(DEMO);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (json.overview) setData(json);
      else setData(DEMO);
    } catch {
      setData(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
    </div>
  );

  const totalQ = data.aiVsHuman.aiAutoApproved + data.aiVsHuman.humanReviewed + data.aiVsHuman.humanEdited + data.aiVsHuman.rejected || 1;
  const aiPct = Math.round((data.aiVsHuman.aiAutoApproved / totalQ) * 100);
  const maxTrend = Math.max(...data.weeklyTrend.map(d => d.queries), 1);
  const maxDistrib = Math.max(...data.confidence.distribution.map(d => d.count), 1);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">System-wide performance metrics and AI decision intelligence</p>
      </div>

      {/* Overview Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <StatCard label="Total Queries" value={data.overview.totalQueries} sub="Processed by engine" color="var(--accent-blue)" />
        <StatCard label="Avg Confidence" value={`${Math.round(data.confidence.average * 100)}%`} sub="Across all responses" color="var(--accent-green)" />
        <StatCard label="AI Automation" value={`${aiPct}%`} sub={data.aiVsHuman.ratio + ' ratio'} color="var(--accent-purple)" />
        <StatCard label="Trust Shield Scans" value={data.overview.totalTrustShieldScans} sub="Media files analyzed" color="var(--accent-cyan)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Weekly Activity */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '20px' }}>Weekly Query Volume</h3>
          <BarChart
            data={data.weeklyTrend.map(d => ({ label: d.day, value: d.queries }))}
            maxValue={maxTrend}
            color="rgba(59,130,246,0.7)"
          />
        </div>

        {/* Confidence Distribution */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '20px' }}>Confidence Distribution</h3>
          <BarChart
            data={data.confidence.distribution.map(d => ({ label: d.range, value: d.count }))}
            maxValue={maxDistrib}
            color="rgba(139,92,246,0.7)"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* AI vs Human */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '20px' }}>Decision Breakdown</h3>
          {[
            { label: 'AI Auto-Approved', value: data.aiVsHuman.aiAutoApproved, total: totalQ, color: 'var(--accent-green)' },
            { label: 'Human Reviewed', value: data.aiVsHuman.humanReviewed, total: totalQ, color: 'var(--accent-amber)' },
            { label: 'Human Edited', value: data.aiVsHuman.humanEdited, total: totalQ, color: 'var(--accent-purple)' },
            { label: 'Rejected', value: data.aiVsHuman.rejected, total: totalQ, color: 'var(--accent-red)' },
          ].map((item) => (
            <div key={item.label} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ color: item.color, fontWeight: 600 }}>
                  {item.value} ({Math.round((item.value / item.total) * 100)}%)
                </span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: item.color, borderRadius: '10px',
                  width: `${(item.value / item.total) * 100}%`, transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Trust Shield Summary */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '20px' }}>🛡️ Trust Shield Results</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'AI Generated', value: data.trustShield.aiGenerated, color: '#f87171' },
              { label: 'Authentic', value: data.trustShield.authentic, color: '#34d399' },
              { label: 'Inconclusive', value: data.trustShield.inconclusive, color: '#fbbf24' },
              { label: 'Avg Confidence', value: `${Math.round(data.trustShield.avgConfidence * 100)}%`, color: 'var(--accent-cyan)' },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Detection Rate</div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ height: '100%', background: '#f87171', width: `${(data.trustShield.aiGenerated / (data.trustShield.totalScans || 1)) * 100}%`, transition: 'width 0.8s ease' }} />
              <div style={{ height: '100%', background: '#34d399', width: `${(data.trustShield.authentic / (data.trustShield.totalScans || 1)) * 100}%`, transition: 'width 0.8s ease' }} />
              <div style={{ height: '100%', background: '#fbbf24', width: `${(data.trustShield.inconclusive / (data.trustShield.totalScans || 1)) * 100}%`, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span style={{ color: '#f87171' }}>■ AI Generated</span>
              <span style={{ color: '#34d399' }}>■ Authentic</span>
              <span style={{ color: '#fbbf24' }}>■ Inconclusive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Tier Cards */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 className="section-title" style={{ marginBottom: '20px' }}>Confidence Tiers</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { label: 'High Confidence', value: data.confidence.high, desc: '≥ 75% — auto-approved', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.06)' },
            { label: 'Medium Confidence', value: data.confidence.medium, desc: '50–74% — reviewed', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.06)' },
            { label: 'Low Confidence', value: data.confidence.low, desc: '< 50% — escalated', color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.06)' },
          ].map((tier) => (
            <div key={tier.label} style={{ padding: '20px', background: tier.bg, borderRadius: '12px', border: `1px solid ${tier.color}20` }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: tier.color, marginBottom: '4px' }}>{tier.value}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{tier.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tier.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
