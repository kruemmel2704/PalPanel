import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Console from './pages/Console';
import Backups from './pages/Backups';
import Settings from './pages/Settings';
import { serverApi, playersApi, configApi } from './services/api';
import { signalRService } from './services/signalr';

export default function App() {
  const [currentTab, setTab] = useState('dashboard');
  const [serverStatus, setServerStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [players, setPlayers] = useState([]);
  const [config, setConfig] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [statusData, playersData, configData] = await Promise.allSettled([
        serverApi.getStatus(),
        playersApi.getPlayers(),
        configApi.getConfig(),
      ]);

      if (statusData.status === 'fulfilled') setServerStatus(statusData.value);
      if (playersData.status === 'fulfilled') setPlayers(playersData.value || []);
      if (configData.status === 'fulfilled') setConfig(configData.value);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Start SignalR Connection for live WebSocket streaming
    signalRService.startConnection();

    const unsubStatus = signalRService.on('status', (newStatus) => {
      setServerStatus(newStatus);
      if (newStatus?.players) setPlayers(newStatus.players);
    });

    const unsubPlayers = signalRService.on('players', (newPlayers) => {
      setPlayers(newPlayers || []);
    });

    const unsubMetrics = signalRService.on('metrics', (newMetrics) => {
      setMetrics(newMetrics);
    });

    const unsubNotification = signalRService.on('notification', (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
    });

    return () => {
      unsubStatus();
      unsubPlayers();
      unsubMetrics();
      unsubNotification();
      signalRService.stopConnection();
    };
  }, [fetchData]);

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setTab={setTab}
        serverStatus={serverStatus}
        config={config}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          serverStatus={serverStatus}
          currentTab={currentTab}
          onRefresh={fetchData}
          isRefreshing={isRefreshing}
          notifications={notifications}
          onClearNotifications={handleClearNotifications}
        />

        <main style={{ flex: 1 }}>
          {currentTab === 'dashboard' && (
            <Dashboard
              serverStatus={serverStatus}
              metrics={metrics}
              players={players}
              config={config}
              onRefresh={fetchData}
              setTab={setTab}
            />
          )}

          {currentTab === 'players' && (
            <Players
              players={players}
              serverStatus={serverStatus}
              onRefresh={fetchData}
              isRefreshing={isRefreshing}
            />
          )}

          {currentTab === 'console' && <Console serverStatus={serverStatus} />}

          {currentTab === 'backups' && <Backups />}

          {currentTab === 'settings' && (
            <Settings initialConfig={config} onConfigUpdated={(cfg) => setConfig(cfg)} />
          )}
        </main>
      </div>
    </div>
  );
}
