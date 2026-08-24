using Microsoft.AspNetCore.SignalR;
using PalPanel.Server.Hubs;
using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public class ServerMonitorWorker : BackgroundService
{
    private readonly ILogger<ServerMonitorWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<ServerHub, IServerHubClient> _hubContext;
    private readonly PalPanelConfig _config;

    private bool _wasOnline = false;
    private readonly HashSet<string> _previousPlayerSteamIds = new();

    public ServerMonitorWorker(
        ILogger<ServerMonitorWorker> logger,
        IServiceProvider serviceProvider,
        IHubContext<ServerHub, IServerHubClient> hubContext,
        PalPanelConfig config)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _hubContext = hubContext;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Palworld ServerMonitorWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var serverService = scope.ServiceProvider.GetRequiredService<IPalworldServerService>();

                var status = await serverService.GetStatusAsync();
                var metrics = await serverService.GetMetricsAsync();
                metrics.PlayerCount = status.PlayerCount;

                // Broadcast Status & Metrics via SignalR
                await _hubContext.Clients.All.ReceiveStatus(status);
                await _hubContext.Clients.All.ReceivePlayers(status.Players);
                await _hubContext.Clients.All.ReceiveMetrics(metrics);

                // Detect Player Join / Leave notifications
                var currentPlayerSteamIds = status.Players.Select(p => p.SteamId).Where(id => !string.IsNullOrEmpty(id)).ToHashSet();
                
                // Joined players
                foreach (var player in status.Players)
                {
                    if (!string.IsNullOrEmpty(player.SteamId) && !_previousPlayerSteamIds.Contains(player.SteamId) && _wasOnline)
                    {
                        await _hubContext.Clients.All.ReceiveNotification(
                            "Player Joined",
                            $"{player.Name} joined the Palworld server.",
                            "info"
                        );
                    }
                }

                // Left players
                if (_wasOnline)
                {
                    var leftIds = _previousPlayerSteamIds.Except(currentPlayerSteamIds);
                    if (leftIds.Any())
                    {
                        await _hubContext.Clients.All.ReceiveNotification(
                            "Player Left",
                            $"A player disconnected from the server.",
                            "default"
                        );
                    }
                }

                _previousPlayerSteamIds.Clear();
                foreach (var id in currentPlayerSteamIds)
                {
                    _previousPlayerSteamIds.Add(id);
                }

                // Auto-Restart logic if crashed
                if (_config.AutoRestartOnCrash && _wasOnline && !status.IsOnline)
                {
                    _logger.LogWarning("Palworld server appears to have crashed! Triggering auto-restart...");
                    await _hubContext.Clients.All.ReceiveNotification("Crash Detected", "Server stopped unexpectedly. Auto-restarting...", "warning");
                    await serverService.StartServerAsync();
                }

                _wasOnline = status.IsOnline;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ServerMonitorWorker iteration");
            }

            int delaySeconds = Math.Max(2, _config.RefreshIntervalSeconds);
            await Task.Delay(TimeSpan.FromSeconds(delaySeconds), stoppingToken);
        }
    }
}
