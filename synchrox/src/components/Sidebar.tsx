'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/workflows', label: 'Workflow Builder', icon: '⚡' },
  { href: '/trust-shield', label: 'Trust Shield', icon: '🛡️' },
  { href: '/review', label: 'HITL Review', icon: '👤' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/logs', label: 'Logs', icon: '📋' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; severity: string; read: boolean; created_at: string }>>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 15000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' });
    setNotifications(p => p.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚙️</div>
          <span className="sidebar-logo-text gradient-text">SynchroX</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-glass)' }}>
          <button
            onClick={() => setShowPanel(!showPanel)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: showPanel ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
            }}
          >
            <span>🔔</span>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'var(--accent-red)', color: 'white',
                fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '100px',
              }}>{unreadCount}</span>
            )}
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Engine Active</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>SynchroX v1.1 • Supabase</div>
        </div>
      </aside>

      {showPanel && (
        <>
          <div onClick={() => setShowPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.3)' }} />
          <div style={{
            position: 'fixed', left: '260px', top: 0, bottom: 0, width: '360px',
            background: 'rgba(10,14,26,0.97)', backdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--border-glass)', zIndex: 60, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>🔔 Notifications</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {unreadCount > 0 && <button className="btn btn-sm btn-secondary" onClick={markAllRead}>Mark all read</button>}
                <button className="btn btn-sm btn-secondary" onClick={() => setShowPanel(false)}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔔</div>
                  <div className="empty-state-text">No notifications</div>
                </div>
              ) : notifications.map((n) => (
                <div key={n.id} style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: n.read ? 'transparent' : 'rgba(59,130,246,0.04)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{n.title}</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
