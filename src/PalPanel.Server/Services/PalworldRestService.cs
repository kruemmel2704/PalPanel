using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public class PalworldRestService : IPalworldRestService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PalworldRestService> _logger;
    private readonly PalPanelConfig _config;

    public PalworldRestService(HttpClient httpClient, ILogger<PalworldRestService> logger, PalPanelConfig config)
    {
        _httpClient = httpClient;
        _logger = logger;
        _config = config;
    }

    private void SetupAuth()
    {
        if (!string.IsNullOrEmpty(_config.RestApiPassword))
        {
            var authBytes = Encoding.UTF8.GetBytes($"{_config.RestApiUser}:{_config.RestApiPassword}");
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));
        }
    }

    public async Task<List<PlayerInfo>?> GetPlayersAsync()
    {
        if (!_config.EnableRestApi) return null;

        try
        {
            SetupAuth();
            var url = $"{_config.RestApiUrl.TrimEnd('/')}/v1/api/players";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            
            var playersList = new List<PlayerInfo>();
            if (doc.RootElement.TryGetProperty("players", out var playersElement) && playersElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var p in playersElement.EnumerateArray())
                {
                    var name = p.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                    var playerId = p.TryGetProperty("playerId", out var pid) ? pid.GetString() ?? "" : "";
                    var steamId = p.TryGetProperty("userId", out var sid) ? sid.GetString() ?? "" : "";
                    var ip = p.TryGetProperty("ip", out var ipVal) ? ipVal.GetString() ?? "Online" : "Online";
                    var ping = p.TryGetProperty("ping", out var pingVal) ? pingVal.GetInt32() : 0;
                    var level = p.TryGetProperty("level", out var lvl) ? lvl.GetInt32() : 1;
                    var locX = p.TryGetProperty("location_x", out var lx) ? lx.GetDouble() : 0;
                    var locY = p.TryGetProperty("location_y", out var ly) ? ly.GetDouble() : 0;

                    playersList.Add(new PlayerInfo
                    {
                        Name = name,
                        PlayerId = playerId,
                        SteamId = steamId,
                        Ip = ip,
                        Ping = ping,
                        Level = level,
                        Location = $"X: {locX:F0}, Y: {locY:F0}"
                    });
                }
            }

            return playersList;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("REST API GetPlayers failed: {Message}", ex.Message);
            return null;
        }
    }

    public async Task<ServerStatus?> GetServerInfoAsync()
    {
        if (!_config.EnableRestApi) return null;

        try
        {
            SetupAuth();
            var url = $"{_config.RestApiUrl.TrimEnd('/')}/v1/api/info";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            
            var serverName = doc.RootElement.TryGetProperty("servername", out var sn) ? sn.GetString() ?? "" : "";
            var version = doc.RootElement.TryGetProperty("version", out var v) ? v.GetString() ?? "" : "";

            return new ServerStatus
            {
                IsOnline = true,
                State = "Online",
                ServerName = serverName,
                ServerVersion = version
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug("REST API GetServerInfo failed: {Message}", ex.Message);
            return null;
        }
    }

    public async Task<bool> SaveWorldAsync()
    {
        if (!_config.EnableRestApi) return false;

        try
        {
            SetupAuth();
            var url = $"{_config.RestApiUrl.TrimEnd('/')}/v1/api/save";
            var response = await _httpClient.PostAsync(url, new StringContent("{}", Encoding.UTF8, "application/json"));
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("REST API SaveWorld failed: {Message}", ex.Message);
            return false;
        }
    }

    public async Task<bool> AnnounceAsync(string message)
    {
        if (!_config.EnableRestApi) return false;

        try
        {
            SetupAuth();
            var url = $"{_config.RestApiUrl.TrimEnd('/')}/v1/api/announce";
            var content = new StringContent(JsonSerializer.Serialize(new { message }), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("REST API Announce failed: {Message}", ex.Message);
            return false;
        }
    }

    public async Task<bool> KickPlayerAsync(string userId, string? message = null)
    {
        if (!_config.EnableRestApi) return false;

        try
        {
            SetupAuth();
            var url = $"{_config.RestApiUrl.TrimEnd('/')}/v1/api/kick";
            var content = new StringContent(JsonSerializer.Serialize(new { userid = userId, message = message ?? "Kicked by admin" }), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("REST API Kick failed: {Message}", ex.Message);
            return false;
        }
    }

    public async Task<bool> BanPlayerAsync(string userId, string? message = null)
    {
        if (!_config.EnableRestApi) return false;

        try
        {
            SetupAuth();
            var url = $"{_config.RestApiUrl.TrimEnd('/')}/v1/api/ban";
            var content = new StringContent(JsonSerializer.Serialize(new { userid = userId, message = message ?? "Banned by admin" }), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("REST API Ban failed: {Message}", ex.Message);
            return false;
        }
    }

    public async Task<bool> StopServerAsync(int waitTimeSeconds = 10, string message = "Stopping server")
    {
        if (!_config.EnableRestApi) return false;

        try
        {
            SetupAuth();
            var url = $"{_config.RestApiUrl.TrimEnd('/')}/v1/api/stop";
            var content = new StringContent(JsonSerializer.Serialize(new { waittime = waitTimeSeconds, message }), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("REST API Stop failed: {Message}", ex.Message);
            return false;
        }
    }
}
