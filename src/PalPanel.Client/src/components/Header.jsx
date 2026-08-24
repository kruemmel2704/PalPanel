import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { RefreshCw, Bell, Shield, Server, Terminal, Save, Play, Square, RotateCcw } from 'lucide-react';

export default function Header({
  serverStatus,
  currentTab,
  onRefresh,
  isRefreshing,
  notifications,
  onClearNotifications,
}) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const tabTitles = {
    dashboard: 'Server Übersicht & Dashboard',
    players: 'Verbundene Spieler & Verwaltung',
    console: 'Live RCON Konsole & Befehle',
    backups: 'Welt-Sicherungen (Backups)',
    settings: 'Server- & Linux-Konfiguration',
  };

  return (
    <header
      style={{
        height: '70px',
        padding: '0 32px',
        backgroundColor: 'rgba(13, 18, 31, 0.75)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 15,
      }}
    >
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {tabTitles[currentTab] || 'PalPanel'}
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {serverStatus?.serverName || 'Palworld Dedicated Server'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Real-time Status Badge */}
        <StatusBadge state={serverStatus?.state} isOnline={serverStatus?.isOnline} />

        {/* Live Clock */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {time}
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary btn-icon"
          title="Status manuell aktualisieren"
          style={{ cursor: 'pointer' }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>

        {/* Notifications Dropdown Toggle */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn btn-secondary btn-icon"
            style={{ position: 'relative', cursor: 'pointer' }}
            title="Benachrichtigungen"
          >
            <Bell size={16} />
            {notifications && notifications.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: 'var(--accent-cyan)',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px var(--accent-cyan)',
                }}
              />
            )}
          </button>

          {showNotifications && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '320px',
                padding: '16px',
                zIndex: 50,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '8px',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Benachrichtigungen
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={onClearNotifications}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Alle leeren
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Keine neuen Ereignisse
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: `3px solid ${n.type === 'warning' ? '#f59e0b' : '#06b6d4'}`,
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
