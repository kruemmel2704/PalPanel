import React from 'react';
import {
  LayoutDashboard,
  Users,
  Terminal,
  DatabaseBackup,
  Settings,
  Server,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab, serverStatus, config }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'players', label: 'Spieler', icon: Users, badge: serverStatus?.playerCount },
    { id: 'console', label: 'RCON Konsole', icon: Terminal },
    { id: 'backups', label: 'Welt-Backups', icon: DatabaseBackup },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Brand / Logo */}
      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: 'var(--shadow-glow-cyan)',
          }}
        >
          <Server size={24} />
        </div>
        <div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #f8fafc 0%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            PalPanel
          </h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Palworld Linux Server
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} color={isActive ? '#38bdf8' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--accent-cyan)',
                    color: '#000',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Linux Host & Steam User Card */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Cpu size={15} color="#38bdf8" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Linux Host Info
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>User: </span>
              <code style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>
                {config?.steamUser || 'steam'}
              </code>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Mode: </span>
              <span style={{ color: '#fbbf24' }}>{config?.executionMode || 'Systemd'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Service: </span>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{config?.systemdServiceName || 'palworld.service'}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
