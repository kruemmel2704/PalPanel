using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public interface IPalworldServerService
{
    Task<bool> StartServerAsync();
    Task<bool> StopServerAsync();
    Task<bool> RestartServerAsync();
    Task<ServerStatus> GetStatusAsync();
    Task<ServerMetrics> GetMetricsAsync();
    Task<List<string>> GetRecentLogsAsync(int lineCount = 50);
}
