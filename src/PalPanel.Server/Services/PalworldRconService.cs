using System.Net.Sockets;
using System.Text;
using PalPanel.Server.Models;

namespace PalPanel.Server.Services;

public class PalworldRconService : IPalworldRconService
{
    private readonly ILogger<PalworldRconService> _logger;
    private readonly PalPanelConfig _config;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    // Source RCON Packet Types
    private const int SERVERDATA_AUTH = 3;
    private const int SERVERDATA_EXECCOMMAND = 2;
    private const int SERVERDATA_RESPONSE_VALUE = 0;
    private const int SERVERDATA_AUTH_RESPONSE = 2;

    public PalworldRconService(ILogger<PalworldRconService> logger, PalPanelConfig config)
    {
        _logger = logger;
        _config = config;
    }

    public async Task<RconResponse> ExecuteCommandAsync(string command)
    {
        if (string.IsNullOrWhiteSpace(command))
        {
            return new RconResponse { Success = false, Message = "Command is empty." };
        }

        if (!_config.EnableRcon)
        {
            return new RconResponse { Success = false, Message = "RCON is disabled in configuration." };
        }

        await _semaphore.WaitAsync();
        try
        {
            using var client = new TcpClient();
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

            try
            {
                await client.ConnectAsync(_config.RconHost, _config.RconPort, cts.Token);
            }
            catch (Exception ex)
            {
                return new RconResponse
                {
                    Success = false,
                    Message = $"Could not connect to Palworld RCON at {_config.RconHost}:{_config.RconPort}. ({ex.Message})"
                };
            }

            using var stream = client.GetStream();
            stream.ReadTimeout = 5000;
            stream.WriteTimeout = 5000;

            // 1. Authenticate
            int authRequestId = 1;
            await SendPacketAsync(stream, authRequestId, SERVERDATA_AUTH, _config.RconPassword);
            var (authRespId, authRespType, _) = await ReadPacketAsync(stream);

            // In Source RCON, server sends an empty RESPONSE_VALUE or directly AUTH_RESPONSE
            if (authRespType == SERVERDATA_RESPONSE_VALUE)
            {
                (authRespId, authRespType, _) = await ReadPacketAsync(stream);
            }

            if (authRespId == -1)
            {
                return new RconResponse { Success = false, Message = "RCON authentication failed (invalid password)." };
            }

            // 2. Execute command
            int cmdRequestId = 2;
            await SendPacketAsync(stream, cmdRequestId, SERVERDATA_EXECCOMMAND, command);
            var (respId, respType, responseBody) = await ReadPacketAsync(stream);

            return new RconResponse
            {
                Success = true,
                Message = "Command executed successfully.",
                Output = responseBody.Trim()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning("RCON execution failed for command '{Command}': {Message}", command, ex.Message);
            return new RconResponse
            {
                Success = false,
                Message = $"RCON error: {ex.Message}"
            };
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<List<PlayerInfo>> GetPlayersAsync()
    {
        var response = await ExecuteCommandAsync("ShowPlayers");
        var players = new List<PlayerInfo>();

        if (!response.Success || string.IsNullOrWhiteSpace(response.Output))
        {
            return players;
        }

        // Palworld ShowPlayers output format:
        // name,playeruid,steamid
        // Player1,00000000,steam_76561198000000000
        var lines = response.Output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        
        bool isHeader = true;
        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (string.IsNullOrEmpty(trimmed)) continue;

            var parts = trimmed.Split(',');
            if (isHeader)
            {
                // check if first line is CSV header (name,playeruid,steamid)
                if (parts.Length >= 1 && parts[0].Trim().Equals("name", StringComparison.OrdinalIgnoreCase))
                {
                    isHeader = false;
                    continue;
                }
                isHeader = false;
            }

            if (parts.Length >= 3)
            {
                var name = parts[0].Trim();
                var playerId = parts[1].Trim();
                var steamId = parts[2].Trim();

                if (!string.IsNullOrEmpty(name))
                {
                    players.Add(new PlayerInfo
                    {
                        Name = name,
                        PlayerId = playerId,
                        SteamId = steamId,
                        Ip = "Online",
                        Ping = 0,
                        Location = "Palpagos Islands"
                    });
                }
            }
            else if (parts.Length == 1 && !string.IsNullOrWhiteSpace(parts[0]))
            {
                // Fallback for single column
                players.Add(new PlayerInfo
                {
                    Name = parts[0].Trim(),
                    PlayerId = "N/A",
                    SteamId = "N/A",
                    Location = "Palpagos Islands"
                });
            }
        }

        return players;
    }

    public async Task<string> GetServerInfoAsync()
    {
        var response = await ExecuteCommandAsync("Info");
        return response.Success ? response.Output : string.Empty;
    }

    public async Task<RconResponse> SaveWorldAsync()
    {
        return await ExecuteCommandAsync("Save");
    }

    public async Task<RconResponse> BroadcastAsync(string message)
    {
        // Palworld broadcast doesn't like spaces in older versions unless enclosed or replaced with underscores in some builds, but newer supports quoted strings:
        // Format: Broadcast <Message_With_Spaces>
        var formatted = message.Replace(" ", "_");
        return await ExecuteCommandAsync($"Broadcast {formatted}");
    }

    public async Task<RconResponse> KickPlayerAsync(string steamIdOrPlayerId, string? message = null)
    {
        return await ExecuteCommandAsync($"KickPlayer {steamIdOrPlayerId}");
    }

    public async Task<RconResponse> BanPlayerAsync(string steamIdOrPlayerId, string? message = null)
    {
        return await ExecuteCommandAsync($"BanPlayer {steamIdOrPlayerId}");
    }

    public async Task<RconResponse> ShutdownAsync(int seconds, string message)
    {
        var formatted = string.IsNullOrWhiteSpace(message) ? "Server_is_shutting_down" : message.Replace(" ", "_");
        return await ExecuteCommandAsync($"Shutdown {seconds} {formatted}");
    }

    public async Task<RconResponse> DoExitAsync()
    {
        return await ExecuteCommandAsync("DoExit");
    }

    private static async Task SendPacketAsync(NetworkStream stream, int requestId, int packetType, string body)
    {
        var bodyBytes = Encoding.UTF8.GetBytes(body);
        int packetSize = bodyBytes.Length + 10; // 4 (id) + 4 (type) + body + 2 (null bytes)

        using var ms = new MemoryStream();
        using var writer = new BinaryWriter(ms);

        writer.Write(packetSize);
        writer.Write(requestId);
        writer.Write(packetType);
        writer.Write(bodyBytes);
        writer.Write((byte)0); // string null terminator
        writer.Write((byte)0); // packet null terminator

        var buffer = ms.ToArray();
        await stream.WriteAsync(buffer, 0, buffer.Length);
        await stream.FlushAsync();
    }

    private static async Task<(int RequestId, int PacketType, string Body)> ReadPacketAsync(NetworkStream stream)
    {
        byte[] sizeBuffer = new byte[4];
        int read = await ReadExactAsync(stream, sizeBuffer, 4);
        if (read < 4) throw new IOException("Incomplete packet header from RCON server.");

        int size = BitConverter.ToInt32(sizeBuffer, 0);
        if (size < 10 || size > 65536)
        {
            throw new IOException($"Invalid RCON packet size: {size}");
        }

        byte[] payloadBuffer = new byte[size];
        read = await ReadExactAsync(stream, payloadBuffer, size);
        if (read < size) throw new IOException("Incomplete packet payload from RCON server.");

        int requestId = BitConverter.ToInt32(payloadBuffer, 0);
        int packetType = BitConverter.ToInt32(payloadBuffer, 4);

        // Body is ASCII/UTF-8 up to null terminator
        int bodyLength = size - 10; // minus id (4), type (4), and 2 null terminators
        string body = "";
        if (bodyLength > 0)
        {
            body = Encoding.UTF8.GetString(payloadBuffer, 8, bodyLength);
        }

        return (requestId, packetType, body);
    }

    private static async Task<int> ReadExactAsync(NetworkStream stream, byte[] buffer, int count)
    {
        int totalRead = 0;
        while (totalRead < count)
        {
            int bytesRead = await stream.ReadAsync(buffer, totalRead, count - totalRead);
            if (bytesRead == 0) break;
            totalRead += bytesRead;
        }
        return totalRead;
    }
}
