'use client';

import { useState, useEffect } from 'react';

interface Settings {
  confidence_threshold: number;
  hf_model: string;
  sla_warning_mins: number;
  sla_breach_mins: number;
  sla_critical_mins: number;
  email_notifications: boolean;
  auto_escalate: boolean;
  max_retries: number;
}

const MODELS = [
  { value: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B Instruct v0.3 (Recommended)' },
  { value: 'meta-llama/Llama-3.2-3B-Instruct',   label: 'Llama 3.2 3B Instruct' },
  { value: 'HuggingFaceH4/zephyr-7b-beta',        label: 'Zephyr 7B Beta (Deprecated)' },
  { value: 'microsoft/DialoGPT-medium',            label: 'DialoGPT Medium' },
];

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function ToggleSwitch({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{label}</div>
        {desc && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: value ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '3px', left: value ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    confidence_threshold: 0.75,
    hf_model: 'mistralai/Mistral-7B-Instruct-v0.3',
    sla_warning_mins: 20,
    sla_breach_mins: 30,
    sla_critical_mins: 60,
    email_notifications: true,
    auto_escalate: true,
    max_retries: 2,
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.settings) setSettings(d.settings); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res  = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const data = await res.json();
      setToast({ msg: data.saved ? '✅ Settings saved to database' : '💾 Settings saved (local mode — add platform_settings table to persist)', type: 'success' });
    } catch {
      setToast({ msg: '❌ Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const upd = (key: keyof Settings) => (val: unknown) => setSettings(s => ({ ...s, [key]: val }));

  const confPct    = Math.round(settings.confidence_threshold * 100);
  const confColor  = confPct >= 80 ? 'var(--accent-green)' : confPct >= 65 ? 'var(--accent-blue)' : 'var(--accent-amber)';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
    </div>
  );

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000, padding: '14px 20px', borderRadius: '12px', background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, backdropFilter: 'blur(12px)', maxWidth: '420px' }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Platform Settings</h1>
            <p className="page-subtitle">Configure AI orchestration, SLA thresholds, and notification preferences</p>
          </div>
          <button onClick={save} disabled={saving} style={{ padding: '10px 24px', borderRadius: '12px', background: 'var(--gradient-primary)', border: 'none', color: 'white', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving ? 0.7 : 1 }}>
            {saving ? '⏳ Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* AI Configuration */}
      <Section title="AI Configuration" icon="🤖">
        {/* Confidence Threshold */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Confidence Threshold</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Queries below this confidence score are routed to human review</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: confColor, minWidth: '70px', textAlign: 'right' }}>{confPct}%</div>
          </div>
          <input
            type="range" min="0.4" max="0.95" step="0.01"
            value={settings.confidence_threshold}
            onChange={e => upd('confidence_threshold')(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: confColor, height: '6px', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            <span>40% (More Human Review)</span>
            <span>95% (More Automation)</span>
          </div>
          {/* Visual scale */}
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {confPct < 60 && '⚠️ Very low — most queries will need human review. Good for high-stakes use cases.'}
            {confPct >= 60 && confPct < 70 && '📋 Low-moderate — significant human oversight. Recommended for compliance-heavy domains.'}
            {confPct >= 70 && confPct < 80 && '✅ Balanced — recommended for most production workloads (default: 75%).'}
            {confPct >= 80 && confPct < 90 && '🚀 High automation — only very uncertain queries escalated. Suitable for mature AI systems.'}
            {confPct >= 90 && '⚡ Maximum automation — minimal human review. Use only for well-validated AI responses.'}
          </div>
        </div>

        {/* Model */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>AI Model</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Set HF_MODEL in .env.local to apply — this updates configuration display only</div>
          <select value={settings.hf_model} onChange={e => upd('hf_model')(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Max Retries */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Max AI Retries</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>Number of retries if AI call fails before falling back to demo mode</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => upd('max_retries')(n)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${settings.max_retries === n ? 'var(--accent-blue)' : 'var(--border-glass)'}`, background: settings.max_retries === n ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', color: settings.max_retries === n ? 'var(--accent-blue)' : 'var(--text-muted)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {n}×
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* SLA Configuration */}
      <Section title="SLA Thresholds" icon="⏱️">
        {[
          { key: 'sla_warning_mins' as const,  label: 'Warning Threshold',  desc: 'Show amber warning badge after this many minutes', color: 'var(--accent-amber)' },
          { key: 'sla_breach_mins' as const,   label: 'Breach Threshold',   desc: 'Show red pulsing badge + log SLA breach event',    color: 'var(--accent-red)' },
          { key: 'sla_critical_mins' as const, label: 'Critical Threshold', desc: 'Send escalation email to admins',                   color: '#ff2244' },
        ].map(({ key, label, desc, color }) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => upd(key)(Math.max(5, settings[key] - 5))} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>−</button>
              <div style={{ minWidth: '64px', textAlign: 'center', fontSize: '16px', fontWeight: 700, color }}>{settings[key]}m</div>
              <button onClick={() => upd(key)(settings[key] + 5)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>+</button>
            </div>
          </div>
        ))}
      </Section>

      {/* Notifications */}
      <Section title="Notifications & Escalation" icon="🔔">
        <ToggleSwitch value={settings.email_notifications} onChange={upd('email_notifications')} label="Email Notifications" desc="Send HITL alert emails to reviewers when confidence is below threshold" />
        <ToggleSwitch value={settings.auto_escalate}      onChange={upd('auto_escalate')}      label="Auto-Escalate Critical"  desc="Automatically send escalation emails to admins when SLA critical threshold is breached" />
      </Section>

      {/* Environment */}
      <Section title="Environment Info" icon="⚙️">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { label: 'SUPABASE_URL',      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing', ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
            { label: 'SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing', ok: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
            { label: 'HF_MODEL',          value: '⚙️ Set in .env.local (server-side)',  ok: true },
            { label: 'SMTP_USER',         value: '⚙️ Set in .env.local (server-side)',  ok: true },
          ].map(e => (
            <div key={e.label} style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontFamily: 'monospace' }}>{e.label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: e.ok ? 'var(--accent-green)' : 'var(--accent-red)' }}>{e.value}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
