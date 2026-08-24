namespace PalPanel.Server.Models;

public class RconCommandRequest
{
    public string Command { get; set; } = string.Empty;
}

public class BroadcastRequest
{
    public string Message { get; set; } = string.Empty;
}

public class KickBanRequest
{
    public string SteamId { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ShutdownRequest
{
    public int Seconds { get; set; } = 10;
    public string Message { get; set; } = "Server is shutting down.";
}

public class RconResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Output { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
