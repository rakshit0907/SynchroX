'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase not configured. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart.');
      return;
    }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else window.location.href = '/';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-page)' }}>
      {/* Left panel — navy brand */}
      <div style={{ display: 'none', flex: 1, background: 'var(--sf-navy)', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '60px', color: 'white', '@media(min-width:768px)': { display: 'flex' } } as React.CSSProperties}>
        <div style={{ maxWidth: '400px' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '16px' }}>SynchroX</div>
          <p style={{ fontSize: '20px', lineHeight: '1.6', opacity: 0.85, marginBottom: '40px' }}>
            Intelligent AI orchestration with human-in-the-loop control.
          </p>
          {['Enterprise-grade security', 'Real-time HITL review', 'SLA monitoring & alerts', 'Role-based access control'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', opacity: 0.8 }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--sf-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>✓</div>
              <span style={{ fontSize: '15px' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', flex: '0 0 480px', background: 'white' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Logo */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--sf-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900, color: 'white', marginBottom: '20px' }}>S</div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--sf-navy)', letterSpacing: '-0.5px', marginBottom: '6px' }}>Log in to SynchroX</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Enter your credentials to access the platform.</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input id="email" type="email" className="input-field" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', display: 'block', marginBottom: '6px' }}>Password</label>
              <input id="password" type="password" className="input-field" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>

            {error && (
              <div style={{ padding: '11px 14px', borderRadius: '8px', background: '#fff0f0', border: '1px solid #fcc', fontSize: '13px', color: 'var(--accent-red)' }}>
                ⚠️ {error}
              </div>
            )}

            <button id="login-btn" type="submit" disabled={loading} className="btn btn-navy"
              style={{ width: '100%', height: '44px', fontSize: '15px', marginTop: '4px', borderRadius: '8px' }}>
              {loading ? (<><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Signing in...</>) : 'Log In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" style={{ color: 'var(--sf-blue)', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
          </div>

          <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '11px', color: 'var(--text-subtle)' }}>
            Protected by Supabase Auth · End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
