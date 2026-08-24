using Microsoft.AspNetCore.Mvc;
using PalPanel.Server.Models;

namespace PalPanel.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfigController : ControllerBase
{
    private readonly PalPanelConfig _config;
    private readonly ILogger<ConfigController> _logger;
    private readonly IConfiguration _configuration;

    public ConfigController(PalPanelConfig config, ILogger<ConfigController> logger, IConfiguration configuration)
    {
        _config = config;
        _logger = logger;
        _configuration = configuration;
    }

    [HttpGet]
    public ActionResult<PalPanelConfig> GetConfig()
    {
        // Don't leak passwords completely to frontend or mask if needed
        return Ok(_config);
    }

    [HttpPost]
    public ActionResult<PalPanelConfig> UpdateConfig([FromBody] PalPanelConfig updated)
    {
        if (updated == null) return BadRequest();

        _config.ServerName = updated.ServerName;
        _config.ExecutionMode = updated.ExecutionMode;
        _config.SteamUser = updated.SteamUser;
        _config.SystemdServiceName = updated.SystemdServiceName;
        _config.UseSudoForSystemctl = updated.UseSudoForSystemctl;
        _config.ServerExecutablePath = updated.ServerExecutablePath;
        _config.ServerWorkingDirectory = updated.ServerWorkingDirectory;
        _config.SaveDirectoryPath = updated.SaveDirectoryPath;
        _config.BackupDirectoryPath = updated.BackupDirectoryPath;
        _config.SshHost = updated.SshHost;
        _config.SshPort = updated.SshPort;
        _config.SshUsername = updated.SshUsername;
        if (!string.IsNullOrEmpty(updated.SshPassword)) _config.SshPassword = updated.SshPassword;
        _config.DockerContainerName = updated.DockerContainerName;
        _config.EnableRcon = updated.EnableRcon;
        _config.RconHost = updated.RconHost;
        _config.RconPort = updated.RconPort;
        if (!string.IsNullOrEmpty(updated.RconPassword)) _config.RconPassword = updated.RconPassword;
        _config.EnableRestApi = updated.EnableRestApi;
        _config.RestApiUrl = updated.RestApiUrl;
        _config.RestApiUser = updated.RestApiUser;
        if (!string.IsNullOrEmpty(updated.RestApiPassword)) _config.RestApiPassword = updated.RestApiPassword;
        _config.RefreshIntervalSeconds = updated.RefreshIntervalSeconds;
        _config.AutoRestartOnCrash = updated.AutoRestartOnCrash;
        _config.MaxPlayers = updated.MaxPlayers;

        _logger.LogInformation("PalPanel settings updated");
        return Ok(_config);
    }
}
