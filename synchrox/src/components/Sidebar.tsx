'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';

const navItems = [
  { href: '/',           label: 'Dashboard',        icon: '📊' },
  { href: '/workflows',  label: 'Workflow Builder',  icon: '⚙️' },
  { href: '/review',     label: 'HITL Review',       icon: '👤' },
  { href: '/history',    label: 'Query History',     icon: '🗂️' },
  { href: '/performance',label: 'Performance',       icon: '🏆' },
  { href: '/trust-shield', label: 'Trust Shield',   icon: '🛡️' },
  { href: '/logs',       label: 'System Logs',       icon: '📋' },
  { href: '/analytics',  label: 'Analytics',         icon: '📈' },
];

// Role-based nav visibility
const ROLE_NAV: Record<string, string[]> = {
  admin:    ['/', '/workflows', '/review', '/history', '/performance', '/trust-shield', '/logs', '/analytics'],
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
  const visibleNav = navItems.filter(n => allowedNav.includes(n.href));

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || '?').toUpperCase();

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

  const roleBadgeColor = role === 'admin' ? 'var(--accent-green)' : role === 'reviewer' ? 'var(--accent-amber)' : 'var(--accent-blue)';
  const roleIcon = role === 'admin' ? '⚡' : role === 'reviewer' ? '👤' : '👁️';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <span className="sidebar-logo-text gradient-text">SynchroX</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {visibleNav.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
              {item.href === '/review' && notifications > 0 && (
                <span style={{
                  marginLeft: 'auto', minWidth: '18px', height: '18px', borderRadius: '100px',
                  background: 'var(--accent-amber)', color: '#000', fontSize: '10px',
                  fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                }}>{notifications}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Notification Bell */}
      <div style={{ margin: '8px 0', position: 'relative' }}>
        <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) markRead(); }} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
          borderRadius: '12px', background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, fontFamily: 'Inter, sans-serif',
          transition: 'background 0.2s ease',
        }}>
          <span style={{ fontSize: '18px' }}>🔔</span>
          Notifications
          {notifications > 0 && (
            <span style={{
              marginLeft: 'auto', minWidth: '18px', height: '18px', borderRadius: '100px',
              background: 'var(--accent-red)', color: 'white', fontSize: '10px',
              fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
            }}>{notifications}</span>
          )}
        </button>

        {showNotif && (
          <div style={{
            position: 'fixed', left: '268px', bottom: '120px', width: '300px', zIndex: 100,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
            borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)', fontSize: '13px', fontWeight: 700 }}>
              Notifications
            </div>
            {notifList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                No new notifications
              </div>
            ) : notifList.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{n.title}</div>
                {n.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile */}
      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
          {/* Avatar */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 800, color: 'white', flexShrink: 0,
          }}>{initials}</div>

          {/* Name + Role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span style={{ fontSize: '10px' }}>{roleIcon}</span>
              <span style={{ fontSize: '11px', color: roleBadgeColor, fontWeight: 600, textTransform: 'capitalize' }}>{role}</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={signOut}
            title="Sign out"
            style={{
              width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border-glass)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              transition: 'all 0.2s ease', flexShrink: 0,
            }}
          >↩</button>
        </div>
      </div>
    </aside>
  );
}
