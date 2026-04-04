'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

const ROLES = [
  { value: 'reviewer', label: '👤 Reviewer', desc: 'Can review and approve AI responses' },
  { value: 'viewer', label: '👁️ Viewer', desc: 'Read-only access to logs and analytics' },
  { value: 'admin', label: '⚡ Admin', desc: 'Full access including user management' },
];

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'reviewer' | 'viewer' | 'admin'>('reviewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase not configured. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart.');
      return;
    }
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 1 }}>
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', maxWidth: '420px', width: '100%', borderRadius: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Check your email</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '24px' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            Click it to activate your account and start using SynchroX.
          </p>
          <Link href="/auth/login" className="btn btn-secondary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            ← Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', zIndex: 1,
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'var(--gradient-primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '28px',
            margin: '0 auto 16px', boxShadow: 'var(--glow-blue)',
          }}>⚡</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            <span className="gradient-text">SynchroX</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Create your account</p>
        </div>

        <div className="glass-card" style={{ padding: '36px', borderRadius: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Join SynchroX</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            Set up your account and choose your role
          </p>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                className="input-field"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                className="input-field"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>
                Your Role
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ROLES.map((r) => (
                  <label key={r.value} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                    borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s ease',
                    border: `1px solid ${role === r.value ? 'rgba(59,130,246,0.4)' : 'var(--border-glass)'}`,
                    background: role === r.value ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value as typeof role)}
                      style={{ accentColor: 'var(--accent-blue)' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                fontSize: '13px', color: 'var(--accent-red)',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              id="signup-btn"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '46px', fontSize: '15px', marginTop: '4px' }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="spinner" />
                  <span>Creating account...</span>
                </div>
              ) : 'Create Account →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in →
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Protected by Supabase Auth · End-to-end encrypted
        </p>
      </div>
    </div>
  );
}
