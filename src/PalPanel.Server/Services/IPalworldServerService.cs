using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public class ServerActionResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
}

public interface IPalworldServerService
{
    Task<ServerActionResult> StartServerAsync();
    Task<ServerActionResult> StopServerAsync();
    Task<ServerActionResult> RestartServerAsync();
    Task<ServerStatus> GetStatusAsync();
    Task<ServerMetrics> GetMetricsAsync();
    Task<List<string>> GetRecentLogsAsync(int lineCount = 50);
}
