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
    public async Task<ActionResult<ServerActionResult>> StartServer()
    {
        _logger.LogInformation("API requested server start");
        var result = await _serverService.StartServerAsync();
        return Ok(result);
    }

    [HttpPost("stop")]
    public async Task<ActionResult<ServerActionResult>> StopServer()
    {
        _logger.LogInformation("API requested server stop");
        var result = await _serverService.StopServerAsync();
        return Ok(result);
    }

    [HttpPost("restart")]
    public async Task<ActionResult<ServerActionResult>> RestartServer()
    {
        _logger.LogInformation("API requested server restart");
        var result = await _serverService.RestartServerAsync();
        return Ok(result);
    }

    [HttpGet("logs")]
    public async Task<ActionResult<List<string>>> GetLogs([FromQuery] int lines = 50)
    {
        var logs = await _serverService.GetRecentLogsAsync(lines);
        return Ok(logs);
    }

    [HttpGet("diagnostics")]
    public async Task<ActionResult<ConnectionDiagnostics>> GetDiagnostics()
    {
        var diag = await _serverService.RunDiagnosticsAsync();
        return Ok(diag);
    }
}
