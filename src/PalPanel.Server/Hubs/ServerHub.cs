using Microsoft.AspNetCore.SignalR;
using PalPanel.Server.Models;

namespace PalPanel.Server.Hubs;

public interface IServerHubClient
{
    Task ReceiveStatus(ServerStatus status);
    Task ReceivePlayers(List<PlayerInfo> players);
    Task ReceiveMetrics(ServerMetrics metrics);
    Task ReceiveLogLine(string logLine);
    Task ReceiveNotification(string title, string message, string type);
}

public class ServerHub : Hub<IServerHubClient>
{
    private readonly ILogger<ServerHub> _logger;

    public ServerHub(ILogger<ServerHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogDebug("Client connected to ServerHub: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("Client disconnected from ServerHub: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
