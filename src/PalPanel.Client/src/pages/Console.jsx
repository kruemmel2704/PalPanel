import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Send, Trash2, Shield, Play, Save, Users, Info, Power } from 'lucide-react';
import { rconApi, serverApi } from '../services/api';

export default function Console({ serverStatus }) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [logs, setLogs] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    // Initial fetch of logs
    serverApi
      .getLogs(40)
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(
            data.map((text) => ({
              type: 'system',
              text,
              time: new Date().toLocaleTimeString(),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSendCommand = async (cmdToSend) => {
    const targetCmd = cmdToSend || command;
    if (!targetCmd.trim()) return;

    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { type: 'input', text: `> ${targetCmd}`, time }]);
    setHistory((prev) => [targetCmd, ...prev.filter((h) => h !== targetCmd)]);
    setHistoryIndex(-1);
    setCommand('');
    setIsExecuting(true);

    try {
      const res = await rconApi.executeCommand(targetCmd);
      if (res.success) {
        setLogs((prev) => [
          ...prev,
          {
            type: 'output',
            text: res.output || 'Befehl erfolgreich ausgeführt (keine Rückgabe).',
            time: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        setLogs((prev) => [
          ...prev,
          {
            type: 'error',
            text: res.message || 'Fehler beim Ausführen des Befehls.',
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          type: 'error',
          text: `Verbindungsfehler: ${err.message}`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCommand(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setCommand(history[prevIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const quickCommands = [
    { label: 'ShowPlayers', cmd: 'ShowPlayers', icon: Users, desc: 'Zeigt alle Spieler mit UID und Steam-ID' },
    { label: 'Info', cmd: 'Info', icon: Info, desc: 'Server Version & Name abrufen' },
    { label: 'Save', cmd: 'Save', icon: Save, desc: 'Weltzustand auf Festplatte speichern' },
    { label: 'Shutdown 60s', cmd: 'Shutdown 60 Serverneustart_in_60_Sekunden', icon: Power, desc: '60s Countdown Shutdown' },
  ];

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Console Header */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 28px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22d3ee',
              boxShadow: 'var(--shadow-glow-cyan)',
            }}
          >
            <TerminalIcon size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
              Live RCON Konsole
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Interaktive Source-RCON Befehlsschnittstelle für den Palworld Dedicated Server
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setLogs([])}
            className="btn btn-secondary btn-sm"
            title="Konsole leeren"
          >
            <Trash2 size={14} /> Konsole leeren
          </button>
        </div>
      </div>

      {/* Quick Macro Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {quickCommands.map((qc) => {
          const Icon = qc.icon;
          return (
            <button
              key={qc.cmd}
              onClick={() => handleSendCommand(qc.cmd)}
              disabled={isExecuting || !serverStatus?.isOnline}
              className="btn btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
              }}
              title={qc.desc}
            >
              <Icon size={16} color="#38bdf8" />
              <span>{qc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Terminal Display */}
      <div
        className="glass-panel"
        style={{
          backgroundColor: '#05070d',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '520px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Terminal Titlebar */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: '#0a0e1a',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f43f5e' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span style={{ marginLeft: '12px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              palworld-rcon@localhost:25575
            </span>
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: serverStatus?.isOnline ? '#34d399' : '#fb7185',
            }}
          >
            {serverStatus?.isOnline ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Terminal Logs Area */}
        <div
          style={{
            flex: 1,
            padding: '16px 20px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: '8px' }}>
            // PalPanel RCON Console bereit. Tippe z.B. 'ShowPlayers', 'Save' oder 'Info'.
          </div>

          {logs.map((item, idx) => {
            let textColor = '#cbd5e1';
            if (item.type === 'input') textColor = '#38bdf8';
            else if (item.type === 'error') textColor = '#fb7185';
            else if (item.type === 'output') textColor = '#34d399';
            else if (item.type === 'system') textColor = '#94a3b8';

            return (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: '#475569', fontSize: '0.75rem', userSelect: 'none', flexShrink: 0 }}>
                  [{item.time}]
                </span>
                <span
                  style={{
                    color: textColor,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontWeight: item.type === 'input' ? 600 : 400,
                  }}
                >
                  {item.text}
                </span>
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCommand();
          }}
          style={{
            padding: '14px 18px',
            backgroundColor: '#0a0e1a',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            $&gt;
          </span>
          <input
            type="text"
            className="input-control"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0',
            }}
            placeholder={
              serverStatus?.isOnline
                ? "RCON Befehl eingeben (z.B. Broadcast Hallo!)... [Pfeiltasten für Verlauf]"
                : 'Server ist offline. RCON nicht erreichbar.'
            }
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting || !serverStatus?.isOnline}
            autoFocus
          />
          <button
            type="submit"
            disabled={isExecuting || !serverStatus?.isOnline || !command.trim()}
            className="btn btn-primary btn-sm"
          >
            <Send size={14} /> Senden
          </button>
        </form>
      </div>
    </div>
  );
}
