import React, { useState } from 'react';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import {
  Play,
  Square,
  RotateCcw,
  Save,
  Users,
  Cpu,
  HardDrive,
  Clock,
  Send,
  Radio,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { serverApi, rconApi } from '../services/api';

export default function Dashboard({
  serverStatus,
  metrics,
  players,
  config,
  onRefresh,
  setTab,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null); // { text, details, type }

  const handleStart = async () => {
    try {
      setIsProcessing(true);
      setActionFeedback({ text: 'Starte Palworld Server...', type: 'info' });
      const res = await serverApi.startServer();
      if (res.success) {
        setActionFeedback({ text: res.message || 'Server gestartet!', details: res.details, type: 'success' });
      } else {
        setActionFeedback({ text: res.message || 'Konnte Server nicht starten.', details: res.details, type: 'error' });
      }
      setTimeout(onRefresh, 1500);
    } catch (err) {
      setActionFeedback({ text: `Fehler beim Starten: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Bist du sicher, dass du den Palworld-Server stoppen möchtest?')) return;
    try {
      setIsProcessing(true);
      setActionFeedback({ text: 'Stoppe Palworld Server...', type: 'info' });
      const res = await serverApi.stopServer();
      if (res.success) {
        setActionFeedback({ text: res.message || 'Server gestoppt.', details: res.details, type: 'success' });
      } else {
        setActionFeedback({ text: res.message || 'Fehler beim Stoppen.', details: res.details, type: 'error' });
      }
      setTimeout(onRefresh, 1500);
    } catch (err) {
      setActionFeedback({ text: `Fehler beim Stoppen: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestart = async () => {
    if (!window.confirm('Server wirklich neustarten? Spieler werden kurz getrennt.')) return;
    try {
      setIsProcessing(true);
      setActionFeedback({ text: 'Starte Palworld Server neu...', type: 'info' });
      const res = await serverApi.restartServer();
      if (res.success) {
        setActionFeedback({ text: res.message || 'Server neu gestartet.', details: res.details, type: 'success' });
      } else {
        setActionFeedback({ text: res.message || 'Fehler beim Neustart.', details: res.details, type: 'error' });
      }
      setTimeout(onRefresh, 2000);
    } catch (err) {
      setActionFeedback({ text: `Fehler beim Neustart: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveWorld = async () => {
    try {
      setIsProcessing(true);
      setActionFeedback({ text: 'Speichere Palworld-Welt...', type: 'info' });
      await rconApi.saveWorld();
      setActionFeedback({ text: 'Welt erfolgreich gespeichert!', type: 'success' });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err) {
      setActionFeedback({ text: `Fehler beim Speichern: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    try {
      setBroadcastStatus('Sende Nachricht...');
      await rconApi.broadcast(broadcastMessage.trim());
      setBroadcastStatus('Nachricht gesendet!');
      setBroadcastMessage('');
      setTimeout(() => setBroadcastStatus(null), 3000);
    } catch (err) {
      setBroadcastStatus(`Fehler: ${err.message}`);
    }
  };

  const isOnline = serverStatus?.isOnline ?? false;
  const cpuPercent = metrics?.cpuPercent ?? serverStatus?.cpuPercent ?? 0;
  const memoryPercent = metrics?.memoryPercent ?? serverStatus?.memoryPercent ?? 0;
  const memoryUsedMb = metrics?.memoryUsedMb ?? serverStatus?.memoryUsedMb ?? 0;
  const memoryTotalMb = metrics?.memoryTotalMb ?? serverStatus?.memoryTotalMb ?? 16384;
  const playerCount = serverStatus?.playerCount ?? players?.length ?? 0;
  const maxPlayers = serverStatus?.maxPlayers ?? config?.maxPlayers ?? 32;

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 20px',
            background:
              actionFeedback.type === 'error'
                ? 'rgba(244, 63, 94, 0.15)'
                : actionFeedback.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(6, 182, 212, 0.15)',
            border: `1px solid ${
              actionFeedback.type === 'error'
                ? 'rgba(244, 63, 94, 0.4)'
                : actionFeedback.type === 'success'
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(6, 182, 212, 0.4)'
            }`,
            borderRadius: 'var(--radius-md)',
            color:
              actionFeedback.type === 'error'
                ? '#fb7185'
                : actionFeedback.type === 'success'
                ? '#34d399'
                : '#22d3ee',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{actionFeedback.text}</span>
            <button
              onClick={() => setActionFeedback(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
              }}
            >
              ✕
            </button>
          </div>
          {actionFeedback.details && (
            <div style={{ fontSize: '0.85rem', opacity: 0.9, whiteSpace: 'pre-wrap' }}>
              {actionFeedback.details}
            </div>
          )}
        </div>
      )}

      {/* Hero Control Card */}
      <div
        className="glass-panel"
        style={{
          padding: '28px 32px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          background: 'linear-gradient(135deg, rgba(13, 22, 40, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {serverStatus?.serverName || 'Palworld Dedicated Server'}
            </h2>
            <StatusBadge state={serverStatus?.state} isOnline={isOnline} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Linux Benutzer: <strong style={{ color: '#38bdf8' }}>{config?.steamUser || 'steam'}</strong> • Modus:{' '}
            <strong style={{ color: '#fbbf24' }}>{config?.executionMode || 'Systemd'}</strong> • Version:{' '}
            <span style={{ color: 'var(--text-muted)' }}>{serverStatus?.serverVersion || 'v0.3.x'}</span>
          </p>
        </div>

        {/* Server Actions Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {!isOnline ? (
            <button
              onClick={handleStart}
              disabled={isProcessing}
              className="btn btn-success"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Play size={18} fill="#ffffff" />
              Server Starten
            </button>
          ) : (
            <>
              <button
                onClick={handleStop}
                disabled={isProcessing}
                className="btn btn-danger"
                style={{ padding: '10px 18px' }}
              >
                <Square size={16} fill="#ffffff" />
                Stoppen
              </button>

              <button
                onClick={handleRestart}
                disabled={isProcessing}
                className="btn btn-warning"
                style={{ padding: '10px 18px' }}
              >
                <RotateCcw size={16} />
                Neustarten
              </button>
            </>
          )}

          <button
            onClick={handleSaveWorld}
            disabled={isProcessing || !isOnline}
            className="btn btn-primary"
            style={{ padding: '10px 18px' }}
          >
            <Save size={16} />
            Welt Speichern
          </button>
        </div>
      </div>

      {/* 4 Live Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <MetricCard
          title="Server Status"
          value={isOnline ? 'Online' : 'Offline'}
          subtext={isOnline ? `Uptime: ${serverStatus?.uptimeFormatted || '0h'}` : 'Gestoppt'}
          icon={Clock}
          color={isOnline ? 'emerald' : 'rose'}
        />

        <MetricCard
          title="Aktive Spieler"
          value={`${playerCount} / ${maxPlayers}`}
          subtext={`${maxPlayers - playerCount} Plätze frei`}
          icon={Users}
          color="cyan"
          progress={(playerCount / maxPlayers) * 100}
        />

        <MetricCard
          title="CPU Auslastung"
          value={`${cpuPercent.toFixed(1)}%`}
          subtext="Palworld Prozess"
          icon={Cpu}
          color={cpuPercent > 80 ? 'rose' : cpuPercent > 50 ? 'amber' : 'cyan'}
          progress={cpuPercent}
        />

        <MetricCard
          title="RAM Verbrauch"
          value={`${(memoryUsedMb / 1024).toFixed(2)} GB`}
          subtext={`${memoryPercent.toFixed(0)}% von ${(memoryTotalMb / 1024).toFixed(0)} GB`}
          icon={HardDrive}
          color={memoryPercent > 85 ? 'rose' : memoryPercent > 60 ? 'amber' : 'indigo'}
          progress={memoryPercent}
        />
      </div>

      {/* In-Game Broadcast Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              In-Game Broadcast (Nachricht an alle Spieler)
            </h3>
          </div>
          {broadcastStatus && (
            <span style={{ fontSize: '0.8rem', color: broadcastStatus.includes('Fehler') ? '#fb7185' : '#34d399' }}>
              {broadcastStatus}
            </span>
          )}
        </div>

        <form onSubmit={handleSendBroadcast} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="input-control"
            placeholder={isOnline ? 'Nachricht eingeben (z.B. Serverneustart in 10 Minuten)...' : 'Server ist offline.'}
            disabled={!isOnline}
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!isOnline || !broadcastMessage.trim()}
            className="btn btn-primary"
            style={{ flexShrink: 0 }}
          >
            <Send size={16} />
            Senden
          </button>
        </form>
      </div>

      {/* Lower Split: Connected Players Overview & Server Quick Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Connected Players Preview Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Verbundene Spieler ({playerCount})
              </h3>
            </div>
            <button
              onClick={() => setTab('players')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', gap: '4px' }}
            >
              Alle verwalten <ExternalLink size={12} />
            </button>
          </div>

          {players && players.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {players.slice(0, 5).map((p, idx) => (
                <div
                  key={p.steamId || p.playerId || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: '#ffffff',
                      }}
                    >
                      {p.name ? p.name[0].toUpperCase() : 'P'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {p.steamId || p.playerId}
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-online" style={{ fontSize: '0.7rem' }}>
                    Online
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 0',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
              }}
            >
              {isOnline ? 'Zurzeit keine Spieler auf dem Server.' : 'Server ist offline.'}
            </div>
          )}
        </div>

        {/* Linux Server Quick Specs Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '12px',
            }}
          >
            <Cpu size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Server & Netzwerk-Details
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Game Port (UDP):</span>
              <code style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>8211</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>RCON Port (TCP):</span>
              <code style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{config?.rconPort || 25575}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>REST API:</span>
              <code style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>{config?.restApiUrl || 'http://127.0.0.1:8212'}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Linux Benutzer:</span>
              <code style={{ fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>{config?.steamUser || 'steam'}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Savegames Pfad:</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={config?.saveDirectoryPath}>
                {config?.saveDirectoryPath || '/home/steam/.../SaveGames'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Auto-Restart bei Absturz:</span>
              <span style={{ color: config?.autoRestartOnCrash ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
                {config?.autoRestartOnCrash ? 'Aktiviert' : 'Deaktiviert'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
