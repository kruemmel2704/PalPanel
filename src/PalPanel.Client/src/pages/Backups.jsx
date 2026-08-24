import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import {
  DatabaseBackup,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  HardDrive,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileArchive,
} from 'lucide-react';
import { backupsApi } from '../services/api';

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [restoreModalBackup, setRestoreModalBackup] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchBackups = async () => {
    try {
      setIsLoading(true);
      const data = await backupsApi.getBackups();
      setBackups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async (e) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      setNotification({ text: 'Erstelle Backup der Palworld-Welt...', type: 'info' });
      await backupsApi.createBackup(backupName.trim() || null);
      setBackupName('');
      setNotification({ text: 'Backup erfolgreich erstellt!', type: 'success' });
      await fetchBackups();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ text: `Fehler: ${err.message}`, type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBackup = async (id) => {
    if (!window.confirm('Möchtest du dieses Backup wirklich unwiderruflich löschen?')) return;
    try {
      await backupsApi.deleteBackup(id);
      setNotification({ text: 'Backup gelöscht.', type: 'success' });
      await fetchBackups();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ text: `Fehler: ${err.message}`, type: 'error' });
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreModalBackup) return;
    try {
      setIsRestoring(true);
      await backupsApi.restoreBackup(restoreModalBackup.id);
      setNotification({ text: 'Welt-Stand erfolgreich wiederhergestellt!', type: 'success' });
      setRestoreModalBackup(null);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ text: `Fehler beim Wiederherstellen: ${err.message}`, type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Top Banner */}
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
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow-emerald)',
            }}
          >
            <DatabaseBackup size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Welt-Sicherungen & Backups
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Erstelle automatische und manuelle Snapshots des SaveGame-Ordners
            </p>
          </div>
        </div>

        <button
          onClick={fetchBackups}
          disabled={isLoading}
          className="btn btn-secondary btn-icon"
          title="Backups neu laden"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            backgroundColor:
              notification.type === 'success'
                ? 'rgba(16, 185, 129, 0.2)'
                : notification.type === 'info'
                ? 'rgba(6, 182, 212, 0.2)'
                : 'rgba(244, 63, 94, 0.2)',
            color:
              notification.type === 'success'
                ? '#34d399'
                : notification.type === 'info'
                ? '#22d3ee'
                : '#fb7185',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {notification.text}
        </div>
      )}

      {/* Create Backup Action Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          marginBottom: '28px',
        }}
      >
        <form onSubmit={handleCreateBackup} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="input-control"
              placeholder="Optional: Name oder Notiz für das Backup (z.B. vor_boss_fight)..."
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="btn btn-success"
            style={{ padding: '10px 22px' }}
          >
            <Plus size={16} />
            {isCreating ? 'Erstelle Backup...' : 'Jetzt Sichern'}
          </button>
        </form>
      </div>

      {/* Backups List */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {backups.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '16px 24px' }}>Dateiname</th>
                  <th style={{ padding: '16px 20px' }}>Erstellt am</th>
                  <th style={{ padding: '16px 20px' }}>Dateigröße</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileArchive size={18} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {b.fileName}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="var(--text-muted)" />
                        {new Date(b.createdAt).toLocaleString()}
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {b.sizeFormatted}
                      </span>
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <a
                          href={backupsApi.downloadUrl(b.id)}
                          download={b.fileName}
                          className="btn btn-secondary btn-sm"
                          title="Backup herunterladen"
                          style={{ textDecoration: 'none' }}
                        >
                          <Download size={14} /> Download
                        </a>

                        <button
                          onClick={() => setRestoreModalBackup(b)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#fbbf24' }}
                          title="Backup wiederherstellen"
                        >
                          <RotateCcw size={14} /> Wiederherstellen
                        </button>

                        <button
                          onClick={() => handleDeleteBackup(b.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#fb7185' }}
                          title="Backup löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <DatabaseBackup size={28} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Noch keine Welt-Backups vorhanden
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Klicke oben auf "Jetzt Sichern", um deinen ersten Snapshot zu erstellen.
            </p>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={Boolean(restoreModalBackup)}
        onClose={() => setRestoreModalBackup(null)}
        title="Welt-Backup wiederherstellen"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Möchtest du das Backup <strong style={{ color: '#ffffff' }}>{restoreModalBackup?.fileName}</strong> wirklich in den SaveGames-Ordner entpacken?
          </p>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fb7185',
              fontSize: '0.85rem',
            }}
          >
            ⚠️ <strong>Hinweis:</strong> Es wird empfohlen, den Palworld-Server vor dem Wiederherstellen zu stoppen! Vorhandene Weltdateien werden überschrieben.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              onClick={() => setRestoreModalBackup(null)}
              disabled={isRestoring}
              className="btn btn-secondary"
            >
              Abbrechen
            </button>
            <button
              onClick={handleRestoreBackup}
              disabled={isRestoring}
              className="btn btn-warning"
            >
              {isRestoring ? 'Stelle wieder her...' : 'Jetzt Wiederherstellen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
