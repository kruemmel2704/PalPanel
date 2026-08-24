using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public interface IPalworldRconService
{
    Task<RconResponse> ExecuteCommandAsync(string command);
    Task<List<PlayerInfo>> GetPlayersAsync();
    Task<string> GetServerInfoAsync();
    Task<RconResponse> SaveWorldAsync();
    Task<RconResponse> BroadcastAsync(string message);
    Task<RconResponse> KickPlayerAsync(string steamIdOrPlayerId, string? message = null);
    Task<RconResponse> BanPlayerAsync(string steamIdOrPlayerId, string? message = null);
    Task<RconResponse> ShutdownAsync(int seconds, string message);
    Task<RconResponse> DoExitAsync();
}
