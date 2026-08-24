using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using PalPanel.Server.Models;
using Renci.SshNet;

namespace PalPanel.Server.Services;

public class LinuxServerProcessService : IPalworldServerService
{
    private readonly ILogger<LinuxServerProcessService> _logger;
    private readonly PalPanelConfig _config;
    private readonly IPalworldRconService _rconService;
    private readonly IPalworldRestService _restService;

    private static bool _simulatedRunning = false;
    private static DateTime _simulatedStartTime = DateTime.UtcNow;

    public LinuxServerProcessService(
        ILogger<LinuxServerProcessService> logger,
        PalPanelConfig config,
        IPalworldRconService rconService,
        IPalworldRestService restService)
    {
        _logger = logger;
        _config = config;
        _rconService = rconService;
        _restService = restService;
    }

    public async Task<bool> StartServerAsync()
    {
        _logger.LogInformation("Starting Palworld server in mode: {Mode}", _config.ExecutionMode);

        switch (_config.ExecutionMode)
        {
            case ServerExecutionMode.Systemd:
                return await ExecuteSystemctlCommandAsync("start");

            case ServerExecutionMode.DirectProcess:
                return await StartDirectLinuxProcessAsync();

            case ServerExecutionMode.SSH:
                await ExecuteSshCommandAsync(GetSshStartCommand());
                return true;

            case ServerExecutionMode.Docker:
                return await ExecuteDockerCommandAsync($"start {_config.DockerContainerName}");

            case ServerExecutionMode.Simulated:
            default:
                _simulatedRunning = true;
                _simulatedStartTime = DateTime.UtcNow;
                return true;
        }
    }

    public async Task<bool> StopServerAsync()
    {
        _logger.LogInformation("Stopping Palworld server in mode: {Mode}", _config.ExecutionMode);

        // 1. Try to save world first before stopping
        try
        {
            await _rconService.SaveWorldAsync();
        }
        catch { }

        switch (_config.ExecutionMode)
        {
            case ServerExecutionMode.Systemd:
                return await ExecuteSystemctlCommandAsync("stop");

            case ServerExecutionMode.DirectProcess:
                return await StopDirectLinuxProcessAsync();

            case ServerExecutionMode.SSH:
                await ExecuteSshCommandAsync(GetSshStopCommand());
                return true;

            case ServerExecutionMode.Docker:
                return await ExecuteDockerCommandAsync($"stop {_config.DockerContainerName}");

            case ServerExecutionMode.Simulated:
            default:
                _simulatedRunning = false;
                return true;
        }
    }

    public async Task<bool> RestartServerAsync()
    {
        _logger.LogInformation("Restarting Palworld server in mode: {Mode}", _config.ExecutionMode);

        // Try to broadcast and save world
        try
        {
            await _rconService.BroadcastAsync("Server_restarting_in_5_seconds");
            await Task.Delay(2000);
            await _rconService.SaveWorldAsync();
        }
        catch { }

        switch (_config.ExecutionMode)
        {
            case ServerExecutionMode.Systemd:
                return await ExecuteSystemctlCommandAsync("restart");

            case ServerExecutionMode.DirectProcess:
                await StopDirectLinuxProcessAsync();
                await Task.Delay(2000);
                return await StartDirectLinuxProcessAsync();

            case ServerExecutionMode.SSH:
                await ExecuteSshCommandAsync(GetSshRestartCommand());
                return true;

            case ServerExecutionMode.Docker:
                return await ExecuteDockerCommandAsync($"restart {_config.DockerContainerName}");

            case ServerExecutionMode.Simulated:
            default:
                _simulatedRunning = true;
                _simulatedStartTime = DateTime.UtcNow;
                return true;
        }
    }

    public async Task<ServerStatus> GetStatusAsync()
    {
        bool isProcessAlive = await CheckIsProcessAliveAsync();
        var status = new ServerStatus
        {
            ServerName = _config.ServerName,
            MaxPlayers = _config.MaxPlayers,
            LastUpdated = DateTime.UtcNow
        };

        if (isProcessAlive)
        {
            status.IsOnline = true;
            status.State = "Online";
            status.StatusMessage = "Server is running";

            // 1. Fetch Players from REST API or RCON
            List<PlayerInfo>? players = null;
            if (_config.EnableRestApi)
            {
                players = await _restService.GetPlayersAsync();
            }

            if (players == null || players.Count == 0)
            {
                players = await _rconService.GetPlayersAsync();
            }

            status.Players = players ?? new List<PlayerInfo>();
            status.PlayerCount = status.Players.Count;

            // 2. Fetch server version info
            var rconInfo = await _rconService.GetServerInfoAsync();
            if (!string.IsNullOrEmpty(rconInfo))
            {
                status.ServerVersion = rconInfo;
            }

            // 3. Metrics (CPU, RAM, Uptime)
            var metrics = await GetMetricsAsync();
            status.CpuPercent = metrics.CpuPercent;
            status.MemoryUsedMb = metrics.MemoryUsedMb;
            status.MemoryTotalMb = metrics.MemoryTotalMb;
            status.MemoryPercent = metrics.MemoryPercent;

            // 4. Calculate Uptime
            var uptime = await GetProcessUptimeAsync();
            status.UptimeSeconds = (long)uptime.TotalSeconds;
            status.UptimeFormatted = FormatUptime(uptime);
        }
        else
        {
            status.IsOnline = false;
            status.State = "Offline";
            status.StatusMessage = "Server is stopped";
            status.PlayerCount = 0;
            status.Players = new List<PlayerInfo>();
            status.UptimeFormatted = "Offline";
        }

        return status;
    }

    public async Task<ServerMetrics> GetMetricsAsync()
    {
        var metrics = new ServerMetrics
        {
            Timestamp = DateTime.UtcNow
        };

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            try
            {
                // Read System RAM from /proc/meminfo
                if (File.Exists("/proc/meminfo"))
                {
                    var lines = await File.ReadAllLinesAsync("/proc/meminfo");
                    long memTotalKb = 0, memAvailableKb = 0;
                    foreach (var l in lines)
                    {
                        if (l.StartsWith("MemTotal:"))
                        {
                            var match = Regex.Match(l, @"\d+");
                            if (match.Success) memTotalKb = long.Parse(match.Value);
                        }
                        else if (l.StartsWith("MemAvailable:"))
                        {
                            var match = Regex.Match(l, @"\d+");
                            if (match.Success) memAvailableKb = long.Parse(match.Value);
                        }
                    }

                    if (memTotalKb > 0)
                    {
                        long memUsedKb = memTotalKb - memAvailableKb;
                        metrics.MemoryTotalMb = Math.Round(memTotalKb / 1024.0, 1);
                        metrics.MemoryUsedMb = Math.Round(memUsedKb / 1024.0, 1);
                        metrics.MemoryPercent = Math.Round((double)memUsedKb / memTotalKb * 100.0, 1);
                    }
                }

                // Check PalServer process CPU & Memory
                var pid = await GetPalServerProcessIdAsync();
                if (pid > 0)
                {
                    var (cpu, memMb) = await GetProcessCpuAndMemLinuxAsync(pid);
                    metrics.CpuPercent = cpu;
                    if (metrics.MemoryUsedMb == 0) metrics.MemoryUsedMb = memMb;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Error reading Linux metrics: {Message}", ex.Message);
            }
        }
        else
        {
            // Simulated Metrics for Windows / Dev environment
            if (_simulatedRunning)
            {
                metrics.CpuPercent = Math.Round(12.5 + (Math.Sin(DateTime.UtcNow.Second * 0.2) * 6.0), 1);
                metrics.MemoryTotalMb = 16384;
                metrics.MemoryUsedMb = Math.Round(4350.0 + (Math.Sin(DateTime.UtcNow.Second * 0.1) * 200.0), 1);
                metrics.MemoryPercent = Math.Round((metrics.MemoryUsedMb / metrics.MemoryTotalMb) * 100, 1);
            }
        }

        return metrics;
    }

    public async Task<List<string>> GetRecentLogsAsync(int lineCount = 50)
    {
        var logs = new List<string>();

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            try
            {
                if (_config.ExecutionMode == ServerExecutionMode.Systemd)
                {
                    var output = await RunBashCommandAsync($"journalctl -u {_config.SystemdServiceName} -n {lineCount} --no-pager");
                    if (!string.IsNullOrEmpty(output))
                    {
                        logs.AddRange(output.Split('\n').Select(x => x.Trim()).Where(x => !string.IsNullOrEmpty(x)));
                        return logs;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Could not read journalctl logs: {Message}", ex.Message);
            }
        }

        // Fallback / simulated logs
        logs.Add($"[{DateTime.UtcNow.AddMinutes(-10):HH:mm:ss}] [Server] Palworld Dedicated Server initialized");
        logs.Add($"[{DateTime.UtcNow.AddMinutes(-9):HH:mm:ss}] [PalServer] Loading world settings...");
        logs.Add($"[{DateTime.UtcNow.AddMinutes(-8):HH:mm:ss}] [PalServer] RCON listening on port {_config.RconPort}");
        logs.Add($"[{DateTime.UtcNow.AddMinutes(-5):HH:mm:ss}] [PalServer] REST API listening on {_config.RestApiUrl}");
        logs.Add($"[{DateTime.UtcNow.AddMinutes(-2):HH:mm:ss}] [PalServer] Save world checkpoint completed.");

        return logs;
    }

    #region Helper Methods

    private async Task<bool> CheckIsProcessAliveAsync()
    {
        switch (_config.ExecutionMode)
        {
            case ServerExecutionMode.Systemd:
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                {
                    var outStr = await RunBashCommandAsync($"systemctl is-active {_config.SystemdServiceName}");
                    return outStr.Trim() == "active";
                }
                return _simulatedRunning;

            case ServerExecutionMode.DirectProcess:
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                {
                    var pid = await GetPalServerProcessIdAsync();
                    return pid > 0;
                }
                return _simulatedRunning;

            case ServerExecutionMode.SSH:
                var res = await ExecuteSshCommandAsync($"systemctl is-active {_config.SystemdServiceName} 2>/dev/null || pgrep -u {_config.SteamUser} -f PalServer-Linux-Test");
                return res.Trim() == "active" || Regex.IsMatch(res, @"\d+");

            case ServerExecutionMode.Docker:
                var dRes = await RunBashCommandAsync($"docker inspect -f '{{{{.State.Running}}}}' {_config.DockerContainerName}");
                return dRes.Trim().Equals("true", StringComparison.OrdinalIgnoreCase);

            case ServerExecutionMode.Simulated:
            default:
                return _simulatedRunning;
        }
    }

    private async Task<TimeSpan> GetProcessUptimeAsync()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            var pid = await GetPalServerProcessIdAsync();
            if (pid > 0)
            {
                var etime = await RunBashCommandAsync($"ps -p {pid} -o etimes=");
                if (int.TryParse(etime.Trim(), out int seconds))
                {
                    return TimeSpan.FromSeconds(seconds);
                }
            }
        }

        if (_simulatedRunning)
        {
            return DateTime.UtcNow - _simulatedStartTime;
        }

        return TimeSpan.Zero;
    }

    private async Task<int> GetPalServerProcessIdAsync()
    {
        try
        {
            var output = await RunBashCommandAsync($"pgrep -u {_config.SteamUser} -f PalServer-Linux-Test || pgrep -f PalServer-Linux-Test");
            var lines = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length > 0 && int.TryParse(lines[0].Trim(), out int pid))
            {
                return pid;
            }
        }
        catch { }
        return -1;
    }

    private async Task<(double CpuPercent, double MemMb)> GetProcessCpuAndMemLinuxAsync(int pid)
    {
        try
        {
            var output = await RunBashCommandAsync($"ps -p {pid} -o %cpu,rss --no-headers");
            var parts = output.Trim().Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
            {
                double cpu = double.TryParse(parts[0], out var c) ? c : 0;
                double rssKb = double.TryParse(parts[1], out var m) ? m : 0;
                return (cpu, Math.Round(rssKb / 1024.0, 1));
            }
        }
        catch { }
        return (0, 0);
    }

    private async Task<bool> ExecuteSystemctlCommandAsync(string action)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            string cmd = _config.UseSudoForSystemctl
                ? $"sudo systemctl {action} {_config.SystemdServiceName}"
                : $"systemctl {action} {_config.SystemdServiceName}";

            var output = await RunBashCommandAsync(cmd);
            _logger.LogInformation("systemctl {Action} executed: {Output}", action, output);
            return true;
        }
        _simulatedRunning = action != "stop";
        return true;
    }

    private async Task<bool> StartDirectLinuxProcessAsync()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            // Execute as user steam
            string scriptPath = _config.ServerExecutablePath;
            string workDir = _config.ServerWorkingDirectory;
            string cmd = $"su - {_config.SteamUser} -c 'cd \"{workDir}\" && \"{scriptPath}\" -port=8211 -players={_config.MaxPlayers} -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS > /dev/null 2>&1 &'";

            await RunBashCommandAsync(cmd);
            return true;
        }
        _simulatedRunning = true;
        _simulatedStartTime = DateTime.UtcNow;
        return true;
    }

    private async Task<bool> StopDirectLinuxProcessAsync()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            await RunBashCommandAsync($"pkill -u {_config.SteamUser} -f PalServer-Linux-Test || pkill -f PalServer-Linux-Test");
            return true;
        }
        _simulatedRunning = false;
        return true;
    }

    private async Task<string> RunBashCommandAsync(string command)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "/bin/bash",
                Arguments = $"-c \"{command.Replace("\"", "\\\"")}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var proc = Process.Start(psi);
            if (proc == null) return string.Empty;

            var stdout = await proc.StandardOutput.ReadToEndAsync();
            var stderr = await proc.StandardError.ReadToEndAsync();
            await proc.WaitForExitAsync();

            if (!string.IsNullOrEmpty(stderr) && string.IsNullOrEmpty(stdout))
            {
                _logger.LogDebug("Bash command error: {Stderr}", stderr);
            }

            return stdout;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Error executing bash command '{Command}': {Message}", command, ex.Message);
            return string.Empty;
        }
    }

    private async Task<string> ExecuteSshCommandAsync(string command)
    {
        try
        {
            using var client = new SshClient(_config.SshHost, _config.SshPort, _config.SshUsername, _config.SshPassword);
            await Task.Run(() => client.Connect());
            using var cmd = client.CreateCommand(command);
            var result = await Task.Run(() => cmd.Execute());
            client.Disconnect();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError("SSH execution failed: {Message}", ex.Message);
            return string.Empty;
        }
    }

    private string GetSshStartCommand() => _config.UseSudoForSystemctl
        ? $"sudo systemctl start {_config.SystemdServiceName}"
        : $"systemctl start {_config.SystemdServiceName}";

    private string GetSshStopCommand() => _config.UseSudoForSystemctl
        ? $"sudo systemctl stop {_config.SystemdServiceName}"
        : $"systemctl stop {_config.SystemdServiceName}";

    private string GetSshRestartCommand() => _config.UseSudoForSystemctl
        ? $"sudo systemctl restart {_config.SystemdServiceName}"
        : $"systemctl restart {_config.SystemdServiceName}";

    private async Task<bool> ExecuteDockerCommandAsync(string dockerArgs)
    {
        var output = await RunBashCommandAsync($"docker {dockerArgs}");
        return !string.IsNullOrEmpty(output);
    }

    private static string FormatUptime(TimeSpan ts)
    {
        if (ts.TotalDays >= 1)
            return $"{(int)ts.TotalDays}d {ts.Hours}h {ts.Minutes}m";
        if (ts.TotalHours >= 1)
            return $"{ts.Hours}h {ts.Minutes}m";
        return $"{ts.Minutes}m {ts.Seconds}s";
    }

    #endregion
}
