using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public interface IBackupManagerService
{
    Task<List<BackupInfo>> GetBackupsAsync();
    Task<BackupInfo?> CreateBackupAsync(string? customName = null);
    Task<bool> DeleteBackupAsync(string backupId);
    Task<bool> RestoreBackupAsync(string backupId);
    string? GetBackupFilePath(string backupId);
}
