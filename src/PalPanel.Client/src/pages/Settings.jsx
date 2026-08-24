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
} from 'lucide-react';
import { configApi } from '../services/api';

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
      setSaveStatus({ text: `Fehler: ${err.message}`, type: 'error' });
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
              Passe Linux-Pfade, Benutzerrechte (`steam`), RCON- und REST-Zugänge an
            </p>
          </div>
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
                <option value="DirectProcess">Direct Process (su - steam -c PalServer.sh)</option>
                <option value="Docker">Docker Container</option>
                <option value="SSH">Remote SSH</option>
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
