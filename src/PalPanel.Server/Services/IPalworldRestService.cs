using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public interface IPalworldRestService
{
    Task<List<PlayerInfo>?> GetPlayersAsync();
    Task<ServerStatus?> GetServerInfoAsync();
    Task<bool> SaveWorldAsync();
    Task<bool> AnnounceAsync(string message);
    Task<bool> KickPlayerAsync(string userId, string? message = null);
    Task<bool> BanPlayerAsync(string userId, string? message = null);
    Task<bool> StopServerAsync(int waitTimeSeconds = 10, string message = "Stopping server");
}
