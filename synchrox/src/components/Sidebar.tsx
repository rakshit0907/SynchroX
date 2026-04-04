'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';

const navGroups = [
  {
    label: 'Main',
    items: [
      { href: '/',           label: 'Dashboard',       icon: '◉' },
      { href: '/workflows',  label: 'Workspace Builder',icon: '⬡' },
    ],
  },
  {
    label: 'AI Oversight',
    items: [
      { href: '/review',     label: 'HITL Review',     icon: '◈' },
      { href: '/history',    label: 'Query History',   icon: '☰' },
      { href: '/performance',label: 'Performance',     icon: '◎' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/trust-shield', label: 'Trust Shield', icon: '⬡' },
      { href: '/logs',       label: 'System Logs',     icon: '☷' },
      { href: '/analytics',  label: 'Analytics',       icon: '▦' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/settings',   label: 'Settings',        icon: '⚙' },
    ],
  },
];

// Role-based nav visibility
const ROLE_NAV: Record<string, string[]> = {
  admin:    ['/', '/workflows', '/review', '/history', '/performance', '/trust-shield', '/logs', '/analytics', '/settings'],
  reviewer: ['/', '/review', '/history', '/performance', '/trust-shield', '/logs', '/analytics'],
  viewer:   ['/', '/history', '/logs', '/analytics'],
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [notifications, setNotifications] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [notifList, setNotifList] = useState<Array<{ id: string; title: string; message: string; severity: string; created_at: string }>>([]);

  const role = profile?.role || 'viewer';
  const allowedNav = ROLE_NAV[role] || ROLE_NAV.viewer;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || '?').toUpperCase();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.unreadCount || 0);
      setNotifList((data.notifications || []).slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 15000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const markRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' });
    setNotifications(0);
  };

  const roleBadge: Record<string, { bg: string; color: string; label: string }> = {
    admin:    { bg: '#e3f5e9', color: '#194e31', label: 'Admin' },
    reviewer: { bg: '#fef7e7', color: '#7a4200', label: 'Reviewer' },
    viewer:   { bg: '#e8f4ff', color: '#014486', label: 'Viewer' },
  };
  const rb = roleBadge[role] || roleBadge.viewer;

  return (
    <>
      {/* ── Top Bar (Salesforce-style navy) ─── */}
      <header className="topbar">
        <Link href="/" className="topbar-logo">
          <div className="topbar-logo-icon">S</div>
          <span className="topbar-logo-text">SynchroX</span>
        </Link>

        <nav className="topbar-nav">
          <Link href="/"          className={`topbar-link ${pathname === '/' ? 'active' : ''}`}>Dashboard</Link>
          <Link href="/review"    className={`topbar-link ${pathname.startsWith('/review') ? 'active' : ''}`}>HITL Review</Link>
          <Link href="/analytics" className={`topbar-link ${pathname.startsWith('/analytics') ? 'active' : ''}`}>Analytics</Link>
          <Link href="/trust-shield" className={`topbar-link ${pathname.startsWith('/trust-shield') ? 'active' : ''}`}>Trust Shield</Link>
        </nav>

        <div className="topbar-actions">
          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotif(!showNotif); if (!showNotif) markRead(); }}
              style={{ position: 'relative', width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              🔔
              {notifications > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#d83a00', fontSize: '9px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifications}</span>
              )}
            </button>
            {showNotif && (
              <div style={{ position: 'absolute', top: '44px', right: 0, width: '320px', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden', zIndex: 200 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>Notifications</span>
                  <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>×</button>
                </div>
                {notifList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>No new notifications</div>
                ) : notifList.map(n => (
                  <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-body)', marginBottom: '2px' }}>{n.title}</div>
                    {n.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1b96ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white' }}>{initials}</div>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
          </div>

          <button onClick={signOut} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Left Sidebar ─── */}
      <aside className="sidebar">
        {navGroups.map(group => {
          const visibleItems = group.items.filter(i => allowedNav.includes(i.href));
          if (!visibleItems.length) return null;
          return (
            <div key={group.label}>
              <div className="sidebar-section-label">{group.label}</div>
              <nav className="sidebar-nav" style={{ padding: '0 8px 4px' }}>
                {visibleItems.map(item => {
                  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                      {item.label}
                      {item.href === '/review' && notifications > 0 && (
                        <span style={{ marginLeft: 'auto', minWidth: '18px', height: '18px', borderRadius: '100px', background: '#d83a00', color: 'white', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{notifications}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}

        {/* User section at bottom */}
        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <span style={{ fontSize: '10px', fontWeight: 700, background: rb.bg, color: rb.color, padding: '1px 7px', borderRadius: '100px', display: 'inline-block', marginTop: '2px' }}>{rb.label}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
