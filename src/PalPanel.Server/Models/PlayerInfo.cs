namespace PalPanel.Server.Models;

public class PlayerInfo
{
    public string Name { get; set; } = string.Empty;
    public string PlayerId { get; set; } = string.Empty;
    public string SteamId { get; set; } = string.Empty;
    public string Ip { get; set; } = string.Empty;
    public int Ping { get; set; } = 0;
    public string Location { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public DateTime? ConnectedAt { get; set; }
    public string FormattedConnectedTime { get; set; } = string.Empty;
}
