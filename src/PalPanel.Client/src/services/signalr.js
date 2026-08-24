import * as signalR from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.listeners = new Map();
  }

  startConnection() {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/server')
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Register event hooks
    this.connection.on('ReceiveStatus', (status) => this.emit('status', status));
    this.connection.on('ReceivePlayers', (players) => this.emit('players', players));
    this.connection.on('ReceiveMetrics', (metrics) => this.emit('metrics', metrics));
    this.connection.on('ReceiveLogLine', (logLine) => this.emit('logLine', logLine));
    this.connection.on('ReceiveNotification', (title, message, type) =>
      this.emit('notification', { title, message, type, id: Date.now() + Math.random() })
    );

    return this.connection.start().catch((err) => {
      console.warn('SignalR Connection Error:', err);
    });
  }

  stopConnection() {
    if (this.connection) {
      return this.connection.stop();
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
}

export const signalRService = new SignalRService();
