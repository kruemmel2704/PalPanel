using Microsoft.AspNetCore.Mvc;
using PalPanel.Server.Models;
using PalPanel.Server.Services;

namespace PalPanel.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServerController : ControllerBase
{
    private readonly IPalworldServerService _serverService;
    private readonly ILogger<ServerController> _logger;

    public ServerController(IPalworldServerService serverService, ILogger<ServerController> logger)
    {
        _serverService = serverService;
        _logger = logger;
    }

    [HttpGet("status")]
    public async Task<ActionResult<ServerStatus>> GetStatus()
    {
        var status = await _serverService.GetStatusAsync();
        return Ok(status);
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<ServerMetrics>> GetMetrics()
    {
        var metrics = await _serverService.GetMetricsAsync();
        return Ok(metrics);
    }

    [HttpPost("start")]
    public async Task<ActionResult> StartServer()
    {
        _logger.LogInformation("API requested server start");
        var success = await _serverService.StartServerAsync();
        return Ok(new { success, message = success ? "Start signal sent to Palworld server." : "Failed to start server." });
    }

    [HttpPost("stop")]
    public async Task<ActionResult> StopServer()
    {
        _logger.LogInformation("API requested server stop");
        var success = await _serverService.StopServerAsync();
        return Ok(new { success, message = success ? "Stop signal sent to Palworld server." : "Failed to stop server." });
    }

    [HttpPost("restart")]
    public async Task<ActionResult> RestartServer()
    {
        _logger.LogInformation("API requested server restart");
        var success = await _serverService.RestartServerAsync();
        return Ok(new { success, message = success ? "Restart signal sent to Palworld server." : "Failed to restart server." });
    }

    [HttpGet("logs")]
    public async Task<ActionResult<List<string>>> GetLogs([FromQuery] int lines = 50)
    {
        var logs = await _serverService.GetRecentLogsAsync(lines);
        return Ok(logs);
    }
}
