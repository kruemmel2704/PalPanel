import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Server,
  Terminal,
  Shield,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Key,
  Activity,
  Check,
  XCircle,
} from 'lucide-react';
import { configApi, serverApi } from '../services/api';

export default function Settings({ initialConfig, onConfigUpdated }) {
  const [formData, setFormData] = useState({
    serverName: 'Palworld Dedicated Server',
    executionMode: 'Systemd',
    steamUser: 'steam',
    systemdServiceName: 'palworld.service',
    useSudoForSystemctl: true,
    serverExecutablePath: '/home/steam/steamcmd/palworld/PalServer.sh',
    serverWorkingDirectory: '/home/steam/steamcmd/palworld',
    saveDirectoryPath: '/home/steam/steamcmd/palworld/Pal/Saved/SaveGames',
    backupDirectoryPath: './backups',
    sshHost: '127.0.0.1',
    sshPort: 22,
    sshUsername: 'steam',
    sshPassword: '',
    dockerContainerName: 'palworld-server',
    enableRcon: true,
    rconHost: '127.0.0.1',
    rconPort: 25575,
    rconPassword: '',
    enableRestApi: true,
    restApiUrl: 'http://127.0.0.1:8212',
    restApiUser: 'admin',
    restApiPassword: '',
    refreshIntervalSeconds: 3,
    autoRestartOnCrash: false,
    maxPlayers: 32,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setFormData((prev) => ({ ...prev, ...initialConfig }));
    }
  }, [initialConfig]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const handleRunDiagnostics = async () => {
    try {
      setIsRunningDiag(true);
      const res = await serverApi.getDiagnostics();
      setDiagnostics(res);
    } catch (err) {
      setDiagnostics({
        processRunning: false,
        processDetails: `Fehler beim Abrufen: ${err.message}`,
        restApiReachable: false,
        restApiDetails: err.message,
        rconReachable: false,
        rconDetails: err.message,
      });
    } finally {
      setIsRunningDiag(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const updated = await configApi.updateConfig(formData);
      setSaveStatus({ text: 'Einstellungen erfolgreich gespeichert!', type: 'success' });
      if (onConfigUpdated) onConfigUpdated(updated);
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus({ text: `Fehler beim Speichern: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Settings Header */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 32px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 20px -2px rgba(99, 102, 241, 0.35)',
            }}
          >
            <SettingsIcon size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Server- & Linux-Konfiguration
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Passe Linux-Pfade, Betriebsmodus, SSH-Zugänge, RCON- und REST-Zugänge an
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isRunningDiag}
            className="btn btn-secondary"
            style={{ gap: '8px' }}
          >
            <Activity size={16} color="#06b6d4" className={isRunningDiag ? 'animate-spin' : ''} />
            {isRunningDiag ? 'Teste Verbindung...' : 'Verbindung testen (Diagnose)'}
          </button>
        </div>

        {saveStatus && (
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor:
                saveStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              color: saveStatus.type === 'success' ? '#34d399' : '#fb7185',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {saveStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {saveStatus.text}
          </div>
        )}
      </div>

      {/* Diagnostics Results Box */}
      {diagnostics && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '20px 24px',
            marginBottom: '24px',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#06b6d4" />
              <strong style={{ fontSize: '1rem', color: '#ffffff' }}>Diagnose-Ergebnisse</strong>
            </div>
            <button
              onClick={() => setDiagnostics(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Process */}
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {diagnostics.processRunning ? <Check size={16} color="#34d399" /> : <XCircle size={16} color="#fb7185" />}
                <span style={{ fontWeight: 600, color: diagnostics.processRunning ? '#34d399' : '#fb7185' }}>
                  Linux PalServer Prozess
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{diagnostics.processDetails}</p>
            </div>

            {/* REST API */}
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {diagnostics.restApiReachable ? <Check size={16} color="#34d399" /> : <XCircle size={16} color="#fb7185" />}
                <span style={{ fontWeight: 600, color: diagnostics.restApiReachable ? '#34d399' : '#fb7185' }}>
                  Native REST API (Port 8212)
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{diagnostics.restApiDetails}</p>
            </div>

            {/* RCON */}
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {diagnostics.rconReachable ? <Check size={16} color="#34d399" /> : <XCircle size={16} color="#fb7185" />}
                <span style={{ fontWeight: 600, color: diagnostics.rconReachable ? '#34d399' : '#fb7185' }}>
                  Source RCON (Port 25575)
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{diagnostics.rconDetails}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Linux Server & Process Management */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Cpu size={20} color="#06b6d4" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              1. Linux Server & Prozess-Steuerung
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Server Name
              </label>
              <input
                type="text"
                name="serverName"
                className="input-control"
                value={formData.serverName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Betriebsmodus (Execution Mode)
              </label>
              <select
                name="executionMode"
                className="input-control"
                value={formData.executionMode}
                onChange={handleChange}
              >
                <option value="Systemd">Systemd (Empfohlen für Linux Host)</option>
                <option value="SSH">Remote SSH (Empfohlen bei Docker-Betrieb)</option>
                <option value="DirectProcess">Direct Process (su - steam -c PalServer.sh)</option>
                <option value="Docker">Docker Container</option>
                <option value="Simulated">Simuliert (Dev Test)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Linux Benutzer (Steam User)
              </label>
              <input
                type="text"
                name="steamUser"
                className="input-control"
                value={formData.steamUser}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Systemd Service Name
              </label>
              <input
                type="text"
                name="systemdServiceName"
                className="input-control"
                value={formData.systemdServiceName}
                onChange={handleChange}
              />
            </div>

            {/* Conditional SSH Settings */}
            {formData.executionMode === 'SSH' && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '16px',
                  backgroundColor: 'rgba(6, 182, 212, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                }}
              >
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={16} color="#22d3ee" />
                  <strong style={{ fontSize: '0.9rem', color: '#22d3ee' }}>
                    SSH-Zugangsdaten für Linux Host
                  </strong>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    SSH Host
                  </label>
                  <input
                    type="text"
                    name="sshHost"
                    className="input-control"
                    placeholder="127.0.0.1"
                    value={formData.sshHost}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    SSH Port
                  </label>
                  <input
                    type="number"
                    name="sshPort"
                    className="input-control"
                    placeholder="22"
                    value={formData.sshPort}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    SSH Benutzer (z.B. steam oder root)
                  </label>
                  <input
                    type="text"
                    name="sshUsername"
                    className="input-control"
                    placeholder="steam"
                    value={formData.sshUsername}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    SSH Passwort / Sudo-Passwort
                  </label>
                  <input
                    type="password"
                    name="sshPassword"
                    className="input-control"
                    placeholder="••••••••"
                    value={formData.sshPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Conditional Docker Settings */}
            {formData.executionMode === 'Docker' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Docker Container Name des Palworld Servers
                </label>
                <input
                  type="text"
                  name="dockerContainerName"
                  className="input-control"
                  placeholder="palworld-server"
                  value={formData.dockerContainerName}
                  onChange={handleChange}
                />
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                PalServer Executable Pfad (Linux)
              </label>
              <input
                type="text"
                name="serverExecutablePath"
                className="input-control"
                value={formData.serverExecutablePath}
                onChange={handleChange}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                SaveGames Ordnerpfad (für automatische Backups)
              </label>
              <input
                type="text"
                name="saveDirectoryPath"
                className="input-control"
                value={formData.saveDirectoryPath}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="useSudoForSystemctl"
                name="useSudoForSystemctl"
                checked={formData.useSudoForSystemctl}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: '#06b6d4', cursor: 'pointer' }}
              />
              <label htmlFor="useSudoForSystemctl" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                'sudo' für systemctl Befehle verwenden
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="autoRestartOnCrash"
                name="autoRestartOnCrash"
                checked={formData.autoRestartOnCrash}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: '#06b6d4', cursor: 'pointer' }}
              />
              <label htmlFor="autoRestartOnCrash" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Automatischer Neustart bei Serverabsturz (Watchdog)
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: RCON Protocol Settings */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Terminal size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              2. Palworld RCON Protokoll
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                RCON Host
              </label>
              <input
                type="text"
                name="rconHost"
                className="input-control"
                value={formData.rconHost}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                RCON Port (Standard: 25575)
              </label>
              <input
                type="number"
                name="rconPort"
                className="input-control"
                value={formData.rconPort}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                RCON Admin-Passwort
              </label>
              <input
                type="password"
                name="rconPassword"
                className="input-control"
                placeholder="••••••••"
                value={formData.rconPassword}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Palworld Native REST API */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Server size={20} color="#10b981" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              3. Palworld Native REST API (v0.2.0+)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                REST API URL
              </label>
              <input
                type="text"
                name="restApiUrl"
                className="input-control"
                value={formData.restApiUrl}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                REST API Benutzer
              </label>
              <input
                type="text"
                name="restApiUser"
                className="input-control"
                value={formData.restApiUser}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                REST API Passwort
              </label>
              <input
                type="password"
                name="restApiPassword"
                className="input-control"
                placeholder="••••••••"
                value={formData.restApiPassword}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '40px' }}>
          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-primary"
            style={{ padding: '12px 32px', fontSize: '1rem' }}
          >
            <Save size={18} />
            {isSaving ? 'Speichere...' : 'Einstellungen Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
