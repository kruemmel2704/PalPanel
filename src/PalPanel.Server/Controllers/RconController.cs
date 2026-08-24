using Microsoft.AspNetCore.Mvc;
using PalPanel.Server.Models;
using PalPanel.Server.Services;

namespace PalPanel.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RconController : ControllerBase
{
    private readonly IPalworldRconService _rconService;
    private readonly IPalworldRestService _restService;
    private readonly PalPanelConfig _config;
    private readonly ILogger<RconController> _logger;

    public RconController(
        IPalworldRconService rconService,
        IPalworldRestService restService,
        PalPanelConfig config,
        ILogger<RconController> logger)
    {
        _rconService = rconService;
        _restService = restService;
        _config = config;
        _logger = logger;
    }

    [HttpPost("execute")]
    public async Task<ActionResult<RconResponse>> ExecuteCommand([FromBody] RconCommandRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Command))
        {
            return BadRequest(new RconResponse { Success = false, Message = "Command cannot be empty." });
        }

        _logger.LogInformation("Executing RCON command: {Command}", request.Command);
        var response = await _rconService.ExecuteCommandAsync(request.Command);
        return Ok(response);
    }

    [HttpPost("broadcast")]
    public async Task<ActionResult> Broadcast([FromBody] BroadcastRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { success = false, message = "Message cannot be empty." });
        }

        _logger.LogInformation("Broadcasting message: {Message}", request.Message);
        
        bool success = false;
        if (_config.EnableRestApi)
        {
            success = await _restService.AnnounceAsync(request.Message);
        }

        if (!success)
        {
            var res = await _rconService.BroadcastAsync(request.Message);
            success = res.Success;
        }

        return Ok(new { success, message = success ? "Broadcast message sent to all players." : "Failed to broadcast message." });
    }

    [HttpPost("save")]
    public async Task<ActionResult> SaveWorld()
    {
        _logger.LogInformation("Saving Palworld world");

        bool success = false;
        if (_config.EnableRestApi)
        {
            success = await _restService.SaveWorldAsync();
        }

        if (!success)
        {
            var res = await _rconService.SaveWorldAsync();
            success = res.Success;
        }

        return Ok(new { success, message = success ? "World saved successfully." : "Failed to save world." });
    }

    [HttpPost("shutdown")]
    public async Task<ActionResult> Shutdown([FromBody] ShutdownRequest request)
    {
        _logger.LogInformation("Shutting down server in {Seconds} seconds: {Message}", request.Seconds, request.Message);

        bool success = false;
        if (_config.EnableRestApi)
        {
            success = await _restService.StopServerAsync(request.Seconds, request.Message);
        }

        if (!success)
        {
            var res = await _rconService.ShutdownAsync(request.Seconds, request.Message);
            success = res.Success;
        }

        return Ok(new { success, message = success ? $"Server shutdown scheduled in {request.Seconds}s." : "Failed to schedule shutdown." });
    }
}
