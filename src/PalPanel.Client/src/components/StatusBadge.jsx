import React from 'react';

export default function StatusBadge({ state = 'Offline', isOnline = false }) {
  let badgeClass = 'badge-offline';
  let dotClass = 'offline';
  let label = state || (isOnline ? 'ONLINE' : 'OFFLINE');

  const normalized = (state || '').toLowerCase();

  if (normalized.includes('online') || isOnline) {
    badgeClass = 'badge-online';
    dotClass = 'online';
    label = 'ONLINE';
  } else if (normalized.includes('start') || normalized.includes('restart')) {
    badgeClass = 'badge-warning';
    dotClass = 'warning';
    label = state.toUpperCase();
  } else if (normalized.includes('stop')) {
    badgeClass = 'badge-warning';
    dotClass = 'warning';
    label = 'STOPPING';
  } else {
    badgeClass = 'badge-offline';
    dotClass = 'offline';
    label = 'OFFLINE';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span className={`pulse-dot ${dotClass}`} />
      {label}
    </span>
  );
}
