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

    private HttpRequestMessage CreateRequest(HttpMethod method, string path, string? jsonBody = null)
    {
        var url = $"{_config.RestApiUrl.TrimEnd('/')}/{path.TrimStart('/')}";
        var request = new HttpRequestMessage(method, url);

        // Basic Auth: admin:<AdminPassword>
        var username = string.IsNullOrEmpty(_config.RestApiUser) ? "admin" : _config.RestApiUser;
        var password = _config.RestApiPassword ?? "";
        var authString = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{username}:{password}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authString);

        if (!string.IsNullOrEmpty(jsonBody))
        {
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
        }

        return request;
    }

    public async Task<List<PlayerInfo>?> GetPlayersAsync()
    {
        if (!_config.EnableRestApi) return null;

        try
        {
            using var request = CreateRequest(HttpMethod.Get, "/v1/api/players");
            using var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Palworld REST API /v1/api/players returned status: {Status}", response.StatusCode);
                return null;
            }

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
            using var request = CreateRequest(HttpMethod.Get, "/v1/api/info");
            using var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Palworld REST API /v1/api/info returned status: {Status}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            
            var serverName = doc.RootElement.TryGetProperty("servername", out var sn) ? sn.GetString() ?? "" : "";
            var version = doc.RootElement.TryGetProperty("version", out var v) ? v.GetString() ?? "" : "";

            // Also try to query metrics for FPS & uptime
            long uptimeSeconds = 0;
            try
            {
                using var metricsReq = CreateRequest(HttpMethod.Get, "/v1/api/metrics");
                using var metricsResp = await _httpClient.SendAsync(metricsReq);
                if (metricsResp.IsSuccessStatusCode)
                {
                    var mJson = await metricsResp.Content.ReadAsStringAsync();
                    using var mDoc = JsonDocument.Parse(mJson);
                    if (mDoc.RootElement.TryGetProperty("uptime", out var upVal))
                    {
                        uptimeSeconds = upVal.GetInt64();
                    }
                }
            }
            catch { }

            return new ServerStatus
            {
                IsOnline = true,
                State = "Online",
                ServerName = serverName,
                ServerVersion = version,
                UptimeSeconds = uptimeSeconds
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
            using var request = CreateRequest(HttpMethod.Post, "/v1/api/save", "{}");
            using var response = await _httpClient.SendAsync(request);
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
            var body = JsonSerializer.Serialize(new { message });
            using var request = CreateRequest(HttpMethod.Post, "/v1/api/announce", body);
            using var response = await _httpClient.SendAsync(request);
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
            var body = JsonSerializer.Serialize(new { userid = userId, message = message ?? "Kicked by admin" });
            using var request = CreateRequest(HttpMethod.Post, "/v1/api/kick", body);
            using var response = await _httpClient.SendAsync(request);
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
            var body = JsonSerializer.Serialize(new { userid = userId, message = message ?? "Banned by admin" });
            using var request = CreateRequest(HttpMethod.Post, "/v1/api/ban", body);
            using var response = await _httpClient.SendAsync(request);
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
            // Try /v1/api/shutdown first, then fallback to /v1/api/stop
            var body = JsonSerializer.Serialize(new { waittime = waitTimeSeconds, message });
            using var request = CreateRequest(HttpMethod.Post, "/v1/api/shutdown", body);
            using var response = await _httpClient.SendAsync(request);
            
            if (response.IsSuccessStatusCode) return true;

            // Fallback to /v1/api/stop
            using var stopReq = CreateRequest(HttpMethod.Post, "/v1/api/stop", body);
            using var stopResp = await _httpClient.SendAsync(stopReq);
            return stopResp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("REST API Stop failed: {Message}", ex.Message);
            return false;
        }
    }
}
