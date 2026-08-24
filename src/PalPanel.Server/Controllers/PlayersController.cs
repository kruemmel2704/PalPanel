using Microsoft.AspNetCore.Mvc;
using PalPanel.Server.Models;
using PalPanel.Server.Services;

namespace PalPanel.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlayersController : ControllerBase
{
    private readonly IPalworldRconService _rconService;
    private readonly IPalworldRestService _restService;
    private readonly PalPanelConfig _config;
    private readonly ILogger<PlayersController> _logger;

    public PlayersController(
        IPalworldRconService rconService,
        IPalworldRestService restService,
        PalPanelConfig config,
        ILogger<PlayersController> logger)
    {
        _rconService = rconService;
        _restService = restService;
        _config = config;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<PlayerInfo>>> GetPlayers()
    {
        List<PlayerInfo>? players = null;
        if (_config.EnableRestApi)
        {
            players = await _restService.GetPlayersAsync();
        }

        if (players == null || players.Count == 0)
        {
            players = await _rconService.GetPlayersAsync();
        }

        return Ok(players ?? new List<PlayerInfo>());
    }

    [HttpPost("kick")]
    public async Task<ActionResult> KickPlayer([FromBody] KickBanRequest request)
    {
        var targetId = !string.IsNullOrEmpty(request.SteamId) ? request.SteamId : request.PlayerId;
        if (string.IsNullOrEmpty(targetId))
        {
            return BadRequest(new { success = false, message = "Target SteamId or PlayerId is required." });
        }

        _logger.LogInformation("Kicking player: {TargetId}", targetId);
        
        bool success = false;
        if (_config.EnableRestApi)
        {
            success = await _restService.KickPlayerAsync(targetId, request.Message);
        }

        if (!success)
        {
            var rconRes = await _rconService.KickPlayerAsync(targetId, request.Message);
            success = rconRes.Success;
        }

        return Ok(new { success, message = success ? $"Player {targetId} kicked successfully." : "Failed to kick player." });
    }

    [HttpPost("ban")]
    public async Task<ActionResult> BanPlayer([FromBody] KickBanRequest request)
    {
        var targetId = !string.IsNullOrEmpty(request.SteamId) ? request.SteamId : request.PlayerId;
        if (string.IsNullOrEmpty(targetId))
        {
            return BadRequest(new { success = false, message = "Target SteamId or PlayerId is required." });
        }

        _logger.LogInformation("Banning player: {TargetId}", targetId);

        bool success = false;
        if (_config.EnableRestApi)
        {
            success = await _restService.BanPlayerAsync(targetId, request.Message);
        }

        if (!success)
        {
            var rconRes = await _rconService.BanPlayerAsync(targetId, request.Message);
            success = rconRes.Success;
        }

        return Ok(new { success, message = success ? $"Player {targetId} banned successfully." : "Failed to ban player." });
    }
}
