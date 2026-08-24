import React, { useState } from 'react';
import Modal from '../components/Modal';
import {
  Users,
  Search,
  UserX,
  ShieldBan,
  Copy,
  Check,
  MapPin,
  Wifi,
  RefreshCw,
  MessageSquare,
  Send,
} from 'lucide-react';
import { playersApi, rconApi } from '../services/api';

export default function Players({ players, serverStatus, onRefresh, isRefreshing }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Modal states
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionType, setActionType] = useState(null); // 'kick' | 'ban' | 'message'
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openActionModal = (player, type) => {
    setSelectedPlayer(player);
    setActionType(type);
    setActionReason('');
    setActionMessage(null);
  };

  const closeActionModal = () => {
    setSelectedPlayer(null);
    setActionType(null);
    setActionReason('');
    setActionMessage(null);
  };

  const handleExecuteAction = async () => {
    if (!selectedPlayer) return;
    setIsProcessing(true);
    setActionMessage(null);

    try {
      const targetId = selectedPlayer.steamId || selectedPlayer.playerId;

      if (actionType === 'kick') {
        await playersApi.kickPlayer(selectedPlayer.steamId, selectedPlayer.playerId, actionReason);
        setActionMessage({ text: `Spieler ${selectedPlayer.name} wurde gekickt!`, type: 'success' });
      } else if (actionType === 'ban') {
        await playersApi.banPlayer(selectedPlayer.steamId, selectedPlayer.playerId, actionReason);
        setActionMessage({ text: `Spieler ${selectedPlayer.name} wurde gebannt!`, type: 'success' });
      } else if (actionType === 'message') {
        await rconApi.broadcast(`[Admin_an_${selectedPlayer.name}]:_${actionReason}`);
        setActionMessage({ text: `Nachricht an ${selectedPlayer.name} gesendet!`, type: 'success' });
      }

      setTimeout(() => {
        closeActionModal();
        onRefresh();
      }, 1500);
    } catch (err) {
      setActionMessage({ text: `Fehler: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPlayers = (players || []).filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.steamId && p.steamId.toLowerCase().includes(query)) ||
      (p.playerId && p.playerId.toLowerCase().includes(query))
    );
  });

  const isOnline = serverStatus?.isOnline ?? false;

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Top Header Card */}
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
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow-cyan)',
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Verbundene Spieler
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {isOnline
                ? `${players?.length || 0} von ${serverStatus?.maxPlayers || 32} Spielern derzeit online`
                : 'Server ist derzeit offline'}
            </p>
          </div>
        </div>

        {/* Search Bar & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Spieler suchen (Name, Steam-ID)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-icon"
            title="Spielerliste aktualisieren"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Players Table / Grid */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {filteredPlayers.length > 0 ? (
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
                  <th style={{ padding: '16px 24px' }}>Spieler</th>
                  <th style={{ padding: '16px 20px' }}>Steam ID</th>
                  <th style={{ padding: '16px 20px' }}>Player UID</th>
                  <th style={{ padding: '16px 20px' }}>Level / Ort</th>
                  <th style={{ padding: '16px 20px' }}>Ping</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player, idx) => (
                  <tr
                    key={player.steamId || player.playerId || idx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Player Name & Avatar */}
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '1rem',
                            boxShadow: '0 4px 10px rgba(6, 182, 212, 0.2)',
                          }}
                        >
                          {player.name ? player.name[0].toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {player.name}
                          </div>
                          <span className="badge badge-online" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            Online
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Steam ID */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: '#38bdf8',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            padding: '3px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {player.steamId || 'N/A'}
                        </code>
                        {player.steamId && (
                          <button
                            onClick={() => handleCopy(player.steamId, `steam-${idx}`)}
                            className="btn btn-secondary btn-icon"
                            style={{ padding: '4px' }}
                            title="Steam-ID kopieren"
                          >
                            {copiedId === `steam-${idx}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Player UID */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: '#fbbf24',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            padding: '3px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {player.playerId || 'N/A'}
                        </code>
                        {player.playerId && (
                          <button
                            onClick={() => handleCopy(player.playerId, `uid-${idx}`)}
                            className="btn btn-secondary btn-icon"
                            style={{ padding: '4px' }}
                            title="Player-UID kopieren"
                          >
                            {copiedId === `uid-${idx}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Level / Location */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          Lvl {player.level || 1}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} color="#06b6d4" />
                          {player.location || 'Palpagos'}
                        </span>
                      </div>
                    </td>

                    {/* Ping */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wifi size={14} color={player.ping < 60 ? '#34d399' : player.ping < 120 ? '#fbbf24' : '#fb7185'} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {player.ping ? `${player.ping} ms` : 'Live'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => openActionModal(player, 'message')}
                          className="btn btn-secondary btn-sm"
                          title="Direktnachricht senden"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          onClick={() => openActionModal(player, 'kick')}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#fbbf24' }}
                          title="Spieler Kicken"
                        >
                          <UserX size={14} />
                          Kick
                        </button>
                        <button
                          onClick={() => openActionModal(player, 'ban')}
                          className="btn btn-danger btn-sm"
                          title="Spieler Bannen"
                        >
                          <ShieldBan size={14} />
                          Ban
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
              <Users size={28} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {searchQuery ? 'Keine Spieler gefunden' : isOnline ? 'Keine aktiven Spieler online' : 'Server ist offline'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px' }}>
              {searchQuery
                ? 'Versuche einen anderen Suchbegriff.'
                : isOnline
                ? 'Sobald Spieler dem Server beitreten, werden sie hier in Echtzeit aufgelistet.'
                : 'Starte den Palworld-Server auf dem Dashboard, um verbundene Spieler zu sehen.'}
            </p>
          </div>
        )}
      </div>

      {/* Action Modal (Kick, Ban, Message) */}
      <Modal
        isOpen={Boolean(selectedPlayer && actionType)}
        onClose={closeActionModal}
        title={
          actionType === 'kick'
            ? `Spieler kicken: ${selectedPlayer?.name}`
            : actionType === 'ban'
            ? `Spieler bannen: ${selectedPlayer?.name}`
            : `Nachricht an: ${selectedPlayer?.name}`
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {actionMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                color: actionMessage.type === 'success' ? '#34d399' : '#fb7185',
                fontSize: '0.85rem',
              }}
            >
              {actionMessage.text}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              {actionType === 'message' ? 'Nachricht' : 'Begründung / Nachricht an Spieler'}
            </label>
            <input
              type="text"
              className="input-control"
              placeholder={
                actionType === 'message'
                  ? 'Deine Nachricht an den Spieler...'
                  : 'Grund (z.B. Regelverstoß, AFK)...'
              }
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button onClick={closeActionModal} disabled={isProcessing} className="btn btn-secondary">
              Abbrechen
            </button>
            <button
              onClick={handleExecuteAction}
              disabled={isProcessing}
              className={actionType === 'ban' ? 'btn btn-danger' : actionType === 'kick' ? 'btn btn-warning' : 'btn btn-primary'}
            >
              {actionType === 'ban' ? (
                <>
                  <ShieldBan size={16} /> Bannen
                </>
              ) : actionType === 'kick' ? (
                <>
                  <UserX size={16} /> Kicken
                </>
              ) : (
                <>
                  <Send size={16} /> Senden
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
