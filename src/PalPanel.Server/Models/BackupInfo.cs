namespace PalPanel.Server.Models;

public class BackupInfo
{
    public string Id { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string SizeFormatted { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string FilePath { get; set; } = string.Empty;
}
