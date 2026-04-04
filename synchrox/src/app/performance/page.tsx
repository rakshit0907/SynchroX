'use client';

import { useState, useEffect } from 'react';

interface Summary {
  totalProcessed: number; humanReviewed: number; autoApproved: number;
  approvalRate: number; editRate: number; rejectionRate: number;
  automationRate: number; avgConfReviewed: number; avgProcTimeMs: number;
  approved: number; edited: number; rejected: number;
}
interface DayTrend { date: string; approved: number; edited: number; rejected: number; auto: number; }
interface ConfBucket { range: string; count: number; }
interface ModelStat  { model: string; count: number; }
interface Reviewer   { id: string; name: string; role: string; reviews: number; approvals: number; edits: number; rejections: number; avgTimeMin: number; }

const DEMO_SUMMARY: Summary = { totalProcessed: 142, humanReviewed: 38, autoApproved: 104, approvalRate: 58, editRate: 29, rejectionRate: 13, automationRate: 73, avgConfReviewed: 61, avgProcTimeMs: 1240, approved: 22, edited: 11, rejected: 5 };
const DEMO_REVIEWERS: Reviewer[] = [
  { id: '1', name: 'Rakshit Sharma', role: 'admin',    reviews: 21, approvals: 12, edits: 7, rejections: 2, avgTimeMin: 4 },
  { id: '2', name: 'Priya Mehta',    role: 'reviewer', reviews: 17, approvals: 10, edits: 4, rejections: 3, avgTimeMin: 6 },
];
const DEMO_DAILY: DayTrend[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - 13 + i);
  return { date: d.toISOString().slice(0, 10), approved: Math.floor(Math.random() * 5), edited: Math.floor(Math.random() * 3), rejected: Math.floor(Math.random() * 2), auto: Math.floor(Math.random() * 12) + 3 };
});
const DEMO_CONF: ConfBucket[] = [{ range: '0–25%', count: 5 }, { range: '25–50%', count: 14 }, { range: '50–65%', count: 12 }, { range: '65–75%', count: 7 }];
const DEMO_MODELS: ModelStat[] = [{ model: 'mistral-7b', count: 89 }, { model: 'demo-engine', count: 41 }, { model: 'zephyr-7b', count: 12 }];

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="glass-card" style={{ padding: '22px 24px' }}>
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: color || 'var(--text-primary)', marginBottom: '4px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: '12px', color, fontWeight: 700, minWidth: '24px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function DonutSegment({ pct, color, offset }: { pct: number; color: string; offset: number }) {
  const r = 54, circ = 2 * Math.PI * r;
  const dashArr = `${(pct / 100) * circ} ${circ}`;
  return <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={dashArr} strokeDashoffset={-offset * circ / 100} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }} />;
}

export default function PerformancePage() {
  const [summary, setSummary]   = useState<Summary>(DEMO_SUMMARY);
  const [daily, setDaily]       = useState<DayTrend[]>(DEMO_DAILY);
  const [conf, setConf]         = useState<ConfBucket[]>(DEMO_CONF);
  const [models, setModels]     = useState<ModelStat[]>(DEMO_MODELS);
  const [reviewers, setReviewers] = useState<Reviewer[]>(DEMO_REVIEWERS);
  const [loading, setLoading]   = useState(true);
  const [isDemo, setIsDemo]     = useState(false);

  useEffect(() => {
    fetch('/api/performance')
      .then(r => r.json())
      .then(d => {
        if (d.summary) {
          setSummary(d.summary); setDaily(d.dailyTrend || DEMO_DAILY);
          setConf(d.confDistribution || DEMO_CONF); setModels(d.modelBreakdown || DEMO_MODELS);
          setReviewers(d.reviewers?.length ? d.reviewers : DEMO_REVIEWERS);
          setIsDemo(d.summary.totalProcessed === 0);
        } else setIsDemo(true);
      })
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
    </div>
  );

  // Donut chart data
  const total = summary.approved + summary.edited + summary.rejected || 1;
  const approvedPct  = Math.round((summary.approved / total) * 100);
  const editedPct    = Math.round((summary.edited   / total) * 100);
  const rejectedPct  = 100 - approvedPct - editedPct;

  // Bar chart max
  const maxDaily = Math.max(...daily.map(d => d.approved + d.edited + d.rejected + d.auto), 1);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Reviewer Performance</h1>
            <p className="page-subtitle">Audit metrics, decision quality, and reviewer efficiency</p>
          </div>
          {isDemo && <span style={{ fontSize: '12px', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', padding: '4px 12px', borderRadius: '100px' }}>⚠️ Demo data</span>}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <KpiCard icon="📋" label="Total Processed"  value={summary.totalProcessed}           sub="All AI queries" />
        <KpiCard icon="🤖" label="Automation Rate"  value={`${summary.automationRate}%`}      color="var(--accent-green)"  sub="Auto-approved (no HITL)" />
        <KpiCard icon="👤" label="Human Reviewed"   value={summary.humanReviewed}             sub="Required HITL review" />
        <KpiCard icon="✅" label="Approval Rate"    value={`${summary.approvalRate}%`}         color="var(--accent-blue)"   sub="Of reviewed queries" />
        <KpiCard icon="✏️" label="Edit Rate"        value={`${summary.editRate}%`}            color="var(--accent-purple)" sub="Modified before approve" />
        <KpiCard icon="❌" label="Rejection Rate"   value={`${summary.rejectionRate}%`}        color="var(--accent-red)"    sub="Queries rejected" />
        <KpiCard icon="🎯" label="Avg AI Confidence" value={`${summary.avgConfReviewed}%`}    color="var(--accent-amber)"  sub="Of HITL-escalated queries" />
        <KpiCard icon="⚡" label="Avg Process Time" value={`${(summary.avgProcTimeMs / 1000).toFixed(1)}s`} sub="AI response generation" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Daily Trend Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px' }}>📅 Daily Review Activity (Last 14 Days)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
            {daily.map((d) => {
              const h = maxDaily > 0 ? ((d.approved + d.edited + d.rejected + d.auto) / maxDaily) * 130 : 0;
              const autoH    = maxDaily > 0 ? (d.auto     / maxDaily) * 130 : 0;
              const appH     = maxDaily > 0 ? (d.approved / maxDaily) * 130 : 0;
              const editH    = maxDaily > 0 ? (d.edited   / maxDaily) * 130 : 0;
              const rejH     = maxDaily > 0 ? (d.rejected / maxDaily) * 130 : 0;
              const label    = new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }} title={`${label}: ${d.auto} auto, ${d.approved} approved, ${d.edited} edited, ${d.rejected} rejected`}>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '130px', gap: '1px' }}>
                    {rejH  > 0 && <div style={{ height: `${rejH}px`,  background: 'var(--accent-red)',    borderRadius: '2px' }} />}
                    {editH > 0 && <div style={{ height: `${editH}px`, background: 'var(--accent-purple)', borderRadius: '2px' }} />}
                    {appH  > 0 && <div style={{ height: `${appH}px`,  background: 'var(--accent-blue)',   borderRadius: '2px' }} />}
                    {autoH > 0 && <div style={{ height: `${autoH}px`, background: 'var(--accent-green)',  borderRadius: '2px 2px 0 0' }} />}
                    {h === 0 && <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }} />}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap', marginTop: '4px' }}>{label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
            {[['var(--accent-green)', 'Auto-Approved'], ['var(--accent-blue)', 'Human Approved'], ['var(--accent-purple)', 'Edited'], ['var(--accent-red)', 'Rejected']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Breakdown Donut */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', alignSelf: 'flex-start' }}>🍩 Decision Split</h3>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            <DonutSegment pct={approvedPct} color="var(--accent-blue)"   offset={0} />
            <DonutSegment pct={editedPct}   color="var(--accent-purple)" offset={approvedPct} />
            <DonutSegment pct={rejectedPct > 0 ? rejectedPct : 0} color="var(--accent-red)" offset={approvedPct + editedPct} />
            <text x="60" y="55" textAnchor="middle" style={{ fill: 'var(--text-primary)', fontSize: '16px', fontWeight: 800, fontFamily: 'Inter' }}>{summary.humanReviewed}</text>
            <text x="60" y="70" textAnchor="middle" style={{ fill: 'var(--text-muted)', fontSize: '9px', fontFamily: 'Inter' }}>reviewed</text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', width: '100%' }}>
            {[
              { label: 'Approved', count: summary.approved, color: 'var(--accent-blue)', pct: approvedPct },
              { label: 'Edited',   count: summary.edited,   color: 'var(--accent-purple)', pct: editedPct },
              { label: 'Rejected', count: summary.rejected, color: 'var(--accent-red)', pct: rejectedPct },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{r.label}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: r.color }}>{r.count}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Confidence Distribution */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>🎯 HITL Confidence Distribution</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>AI confidence ranges of queries escalated to human review</p>
          {conf.map(c => (
            <div key={c.range} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{c.range}</span>
                <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{c.count}</span>
              </div>
              <MiniBar value={c.count} max={Math.max(...conf.map(x => x.count), 1)} color="var(--accent-amber)" />
            </div>
          ))}
        </div>

        {/* Model Usage */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>🤖 AI Model Usage</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Query distribution across AI models</p>
          {models.slice(0, 6).map((m, i) => {
            const colors = ['var(--accent-blue)', 'var(--accent-purple)', 'var(--accent-cyan)', 'var(--accent-green)', 'var(--accent-amber)', 'var(--accent-red)'];
            return (
              <div key={m.model} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '11px' }}>{m.model}</span>
                  <span style={{ color: colors[i % colors.length], fontWeight: 600 }}>{m.count}</span>
                </div>
                <MiniBar value={m.count} max={Math.max(...models.map(x => x.count), 1)} color={colors[i % colors.length]} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviewer Leaderboard */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>🏆 Reviewer Leaderboard</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Performance metrics per reviewer (real data once queries include reviewer tracking)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
          {reviewers.map((r, i) => (
            <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: i === 0 ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'white' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : r.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.role} · avg {r.avgTimeMin}min/review</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '20px', fontWeight: 800, color: 'var(--accent-blue)' }}>{r.reviews}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { label: 'Approved', val: r.approvals, color: 'var(--accent-green)' },
                  { label: 'Edited',   val: r.edits,     color: 'var(--accent-purple)' },
                  { label: 'Rejected', val: r.rejections, color: 'var(--accent-red)' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
