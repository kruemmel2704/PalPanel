using System.IO.Compression;
using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public class BackupManagerService : IBackupManagerService
{
    private readonly ILogger<BackupManagerService> _logger;
    private readonly PalPanelConfig _config;
    private readonly IPalworldRconService _rconService;

    public BackupManagerService(
        ILogger<BackupManagerService> logger,
        PalPanelConfig config,
        IPalworldRconService rconService)
    {
        _logger = logger;
        _config = config;
        _rconService = rconService;
        EnsureBackupDirectoryExists();
    }

    private void EnsureBackupDirectoryExists()
    {
        try
        {
            if (!Directory.Exists(_config.BackupDirectoryPath))
            {
                Directory.CreateDirectory(_config.BackupDirectoryPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create backup directory at {Path}", _config.BackupDirectoryPath);
        }
    }

    public Task<List<BackupInfo>> GetBackupsAsync()
    {
        EnsureBackupDirectoryExists();
        var backups = new List<BackupInfo>();

        try
        {
            var dirInfo = new DirectoryInfo(_config.BackupDirectoryPath);
            var files = dirInfo.GetFiles("palworld_backup_*.zip")
                               .OrderByDescending(f => f.CreationTimeUtc);

            foreach (var f in files)
            {
                backups.Add(new BackupInfo
                {
                    Id = Path.GetFileNameWithoutExtension(f.Name),
                    FileName = f.Name,
                    SizeBytes = f.Length,
                    SizeFormatted = FormatFileSize(f.Length),
                    CreatedAt = f.CreationTimeUtc,
                    FilePath = f.FullName
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading backups");
        }

        return Task.FromResult(backups);
    }

    public async Task<BackupInfo?> CreateBackupAsync(string? customName = null)
    {
        EnsureBackupDirectoryExists();

        // 1. Trigger RCON Save to flush in-memory chunks
        try
        {
            await _rconService.SaveWorldAsync();
            await Task.Delay(1000); // give server 1 sec to write to disk
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Could not trigger RCON save before backup: {Message}", ex.Message);
        }

        try
        {
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var namePart = string.IsNullOrWhiteSpace(customName) ? "auto" : SanitizeFileName(customName);
            var fileName = $"palworld_backup_{timestamp}_{namePart}.zip";
            var destPath = Path.Combine(_config.BackupDirectoryPath, fileName);

            if (Directory.Exists(_config.SaveDirectoryPath))
            {
                await Task.Run(() => ZipFile.CreateFromDirectory(_config.SaveDirectoryPath, destPath, CompressionLevel.Optimal, false));
            }
            else
            {
                // If directory doesn't exist yet (e.g. fresh install or dev mode), create dummy backup with readme
                using var archive = ZipFile.Open(destPath, ZipArchiveMode.Create);
                var entry = archive.CreateEntry("backup_info.txt");
                using var writer = new StreamWriter(entry.Open());
                await writer.WriteLineAsync($"Palworld Server Backup created at {DateTime.UtcNow:O}");
                await writer.WriteLineAsync($"Source directory: {_config.SaveDirectoryPath}");
            }

            var fileInfo = new FileInfo(destPath);
            _logger.LogInformation("Backup created successfully: {Path} ({Size} bytes)", destPath, fileInfo.Length);

            return new BackupInfo
            {
                Id = Path.GetFileNameWithoutExtension(fileName),
                FileName = fileName,
                SizeBytes = fileInfo.Length,
                SizeFormatted = FormatFileSize(fileInfo.Length),
                CreatedAt = fileInfo.CreationTimeUtc,
                FilePath = destPath
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create backup");
            return null;
        }
    }

    public Task<bool> DeleteBackupAsync(string backupId)
    {
        try
        {
            var path = GetBackupFilePath(backupId);
            if (path != null && File.Exists(path))
            {
                File.Delete(path);
                return Task.FromResult(true);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete backup {Id}", backupId);
        }
        return Task.FromResult(false);
    }

    public async Task<bool> RestoreBackupAsync(string backupId)
    {
        try
        {
            var path = GetBackupFilePath(backupId);
            if (path == null || !File.Exists(path)) return false;

            if (!Directory.Exists(_config.SaveDirectoryPath))
            {
                Directory.CreateDirectory(_config.SaveDirectoryPath);
            }

            await Task.Run(() =>
            {
                // Extract into save directory (overwriting files)
                ZipFile.ExtractToDirectory(path, _config.SaveDirectoryPath, overwriteFiles: true);
            });

            _logger.LogInformation("Restored backup {Id} to {Path}", backupId, _config.SaveDirectoryPath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore backup {Id}", backupId);
            return false;
        }
    }

    public string? GetBackupFilePath(string backupId)
    {
        EnsureBackupDirectoryExists();
        var files = Directory.GetFiles(_config.BackupDirectoryPath, $"{backupId}.zip");
        return files.FirstOrDefault();
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(name.Where(c => !invalid.Contains(c))).Replace(" ", "_");
    }

    private static string FormatFileSize(long bytes)
    {
        if (bytes >= 1024 * 1024 * 1024)
            return $"{(bytes / (1024.0 * 1024.0 * 1024.0)):F2} GB";
        if (bytes >= 1024 * 1024)
            return $"{(bytes / (1024.0 * 1024.0)):F2} MB";
        if (bytes >= 1024)
            return $"{(bytes / 1024.0):F1} KB";
        return $"{bytes} B";
    }
}
