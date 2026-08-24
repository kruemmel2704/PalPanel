namespace PalPanel.Server.Models;

public class ServerStatus
{
    public bool IsOnline { get; set; }
    public string State { get; set; } = "Offline"; // Online, Offline, Starting, Stopping, Restarting, Error
    public string StatusMessage { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string ServerVersion { get; set; } = string.Empty;
    public int PlayerCount { get; set; } = 0;
    public int MaxPlayers { get; set; } = 32;
    public double CpuPercent { get; set; } = 0.0;
    public double MemoryUsedMb { get; set; } = 0.0;
    public double MemoryTotalMb { get; set; } = 0.0;
    public double MemoryPercent { get; set; } = 0.0;
    public long UptimeSeconds { get; set; } = 0;
    public string UptimeFormatted { get; set; } = "0h 0m";
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public List<PlayerInfo> Players { get; set; } = new();
}

public class ServerMetrics
{
    public double CpuPercent { get; set; }
    public double MemoryUsedMb { get; set; }
    public double MemoryTotalMb { get; set; }
    public double MemoryPercent { get; set; }
    public int PlayerCount { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
