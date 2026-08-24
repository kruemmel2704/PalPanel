const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const data = await response.json();
      if (data && (data.message || data.error)) {
        errorMsg = data.message || data.error;
      }
    } catch {
      // not json
    }
    throw new Error(errorMsg);
  }

  // If response is a file (blob)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/zip')) {
    return response.blob();
  }

  return response.json();
}

export const serverApi = {
  getStatus: () => request('/server/status'),
  getMetrics: () => request('/server/metrics'),
  startServer: () => request('/server/start', { method: 'POST' }),
  stopServer: () => request('/server/stop', { method: 'POST' }),
  restartServer: () => request('/server/restart', { method: 'POST' }),
  getLogs: (lines = 50) => request(`/server/logs?lines=${lines}`),
};

export const playersApi = {
  getPlayers: () => request('/players'),
  kickPlayer: (steamId, playerId, message) =>
    request('/players/kick', {
      method: 'POST',
      body: JSON.stringify({ steamId, playerId, message }),
    }),
  banPlayer: (steamId, playerId, message) =>
    request('/players/ban', {
      method: 'POST',
      body: JSON.stringify({ steamId, playerId, message }),
    }),
};

export const rconApi = {
  executeCommand: (command) =>
    request('/rcon/execute', {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),
  broadcast: (message) =>
    request('/rcon/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  saveWorld: () => request('/rcon/save', { method: 'POST' }),
  shutdown: (seconds = 10, message = 'Server is shutting down.') =>
    request('/rcon/shutdown', {
      method: 'POST',
      body: JSON.stringify({ seconds, message }),
    }),
};

export const backupsApi = {
  getBackups: () => request('/backups'),
  createBackup: (customName) =>
    request('/backups/create', {
      method: 'POST',
      body: JSON.stringify({ customName }),
    }),
  deleteBackup: (id) => request(`/backups/${id}`, { method: 'DELETE' }),
  restoreBackup: (id) => request(`/backups/${id}/restore`, { method: 'POST' }),
  downloadUrl: (id) => `/api/backups/${id}/download`,
};

export const configApi = {
  getConfig: () => request('/config'),
  updateConfig: (config) =>
    request('/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
};
