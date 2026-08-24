using Microsoft.AspNetCore.Mvc;
using PalPanel.Server.Models;
using PalPanel.Server.Services;

namespace PalPanel.Server.Controllers;

public class CreateBackupRequest
{
    public string? CustomName { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class BackupsController : ControllerBase
{
    private readonly IBackupManagerService _backupService;
    private readonly ILogger<BackupsController> _logger;

    public BackupsController(IBackupManagerService backupService, ILogger<BackupsController> logger)
    {
        _backupService = backupService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<BackupInfo>>> GetBackups()
    {
        var backups = await _backupService.GetBackupsAsync();
        return Ok(backups);
    }

    [HttpPost("create")]
    public async Task<ActionResult<BackupInfo>> CreateBackup([FromBody] CreateBackupRequest? request)
    {
        _logger.LogInformation("Creating world backup...");
        var backup = await _backupService.CreateBackupAsync(request?.CustomName);
        if (backup == null)
        {
            return StatusCode(500, new { message = "Failed to create backup." });
        }
        return Ok(backup);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteBackup(string id)
    {
        var deleted = await _backupService.DeleteBackupAsync(id);
        if (!deleted)
        {
            return NotFound(new { message = "Backup not found or could not be deleted." });
        }
        return Ok(new { success = true, message = "Backup deleted." });
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult> RestoreBackup(string id)
    {
        _logger.LogInformation("Restoring backup {Id}...", id);
        var restored = await _backupService.RestoreBackupAsync(id);
        if (!restored)
        {
            return BadRequest(new { message = "Failed to restore backup." });
        }
        return Ok(new { success = true, message = "Backup restored successfully." });
    }

    [HttpGet("{id}/download")]
    public ActionResult DownloadBackup(string id)
    {
        var path = _backupService.GetBackupFilePath(id);
        if (path == null || !System.IO.File.Exists(path))
        {
            return NotFound(new { message = "Backup file not found." });
        }

        var fileName = Path.GetFileName(path);
        var fileBytes = System.IO.File.ReadAllBytes(path);
        return File(fileBytes, "application/zip", fileName);
    }
}
