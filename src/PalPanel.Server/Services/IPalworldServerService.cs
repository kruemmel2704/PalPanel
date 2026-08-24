using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public class ServerActionResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
}

public class ConnectionDiagnostics
{
    public bool ProcessRunning { get; set; }
    public string ProcessDetails { get; set; } = string.Empty;
    public bool RestApiReachable { get; set; }
    public string RestApiDetails { get; set; } = string.Empty;
    public bool RconReachable { get; set; }
    public string RconDetails { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public interface IPalworldServerService
{
    Task<ServerActionResult> StartServerAsync();
    Task<ServerActionResult> StopServerAsync();
    Task<ServerActionResult> RestartServerAsync();
    Task<ServerStatus> GetStatusAsync();
    Task<ServerMetrics> GetMetricsAsync();
    Task<List<string>> GetRecentLogsAsync(int lineCount = 50);
    Task<ConnectionDiagnostics> RunDiagnosticsAsync();
}
