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

    public async Task<ServerActionResult> StartServerAsync()
    {
        _logger.LogInformation("Starting Palworld server in mode: {Mode}", _config.ExecutionMode);

        switch (_config.ExecutionMode)
        {
            case ServerExecutionMode.Systemd:
                return await ExecuteSystemctlCommandAsync("start");

            case ServerExecutionMode.DirectProcess:
                return await StartDirectLinuxProcessAsync();

            case ServerExecutionMode.SSH:
                return await ExecuteSshServerCommandAsync(GetSshStartCommand(), "Start");

            case ServerExecutionMode.Docker:
                return await ExecuteDockerCommandAsync($"start {_config.DockerContainerName}");

            case ServerExecutionMode.Simulated:
            default:
                _simulatedRunning = true;
                _simulatedStartTime = DateTime.UtcNow;
                return new ServerActionResult { Success = true, Message = "Server gestartet (Simulierter Modus)." };
        }
    }

    public async Task<ServerActionResult> StopServerAsync()
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
                return await ExecuteSshServerCommandAsync(GetSshStopCommand(), "Stopp");

            case ServerExecutionMode.Docker:
                return await ExecuteDockerCommandAsync($"stop {_config.DockerContainerName}");

            case ServerExecutionMode.Simulated:
            default:
                _simulatedRunning = false;
                return new ServerActionResult { Success = true, Message = "Server gestoppt (Simulierter Modus)." };
        }
    }

    public async Task<ServerActionResult> RestartServerAsync()
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
                return await ExecuteSshServerCommandAsync(GetSshRestartCommand(), "Neustart");

            case ServerExecutionMode.Docker:
                return await ExecuteDockerCommandAsync($"restart {_config.DockerContainerName}");

            case ServerExecutionMode.Simulated:
            default:
                _simulatedRunning = true;
                _simulatedStartTime = DateTime.UtcNow;
                return new ServerActionResult { Success = true, Message = "Server neu gestartet (Simulierter Modus)." };
        }
    }

    public async Task<ServerStatus> GetStatusAsync()
    {
        var status = new ServerStatus
        {
            ServerName = _config.ServerName,
            MaxPlayers = _config.MaxPlayers,
            LastUpdated = DateTime.UtcNow
        };

        // 1. Check if server is reachable via REST API or RCON first
        List<PlayerInfo>? players = null;
        bool isNetworkReachable = false;

        if (_config.EnableRestApi)
        {
            var restInfo = await _restService.GetServerInfoAsync();
            if (restInfo != null && restInfo.IsOnline)
            {
                isNetworkReachable = true;
                status.ServerVersion = restInfo.ServerVersion;
                if (!string.IsNullOrEmpty(restInfo.ServerName))
                {
                    status.ServerName = restInfo.ServerName;
                }
            }

            players = await _restService.GetPlayersAsync();
            if (players != null)
            {
                isNetworkReachable = true;
            }
        }

        if (!isNetworkReachable && _config.EnableRcon)
        {
            var rconInfo = await _rconService.GetServerInfoAsync();
            if (!string.IsNullOrEmpty(rconInfo))
            {
                isNetworkReachable = true;
                status.ServerVersion = rconInfo;
            }

            if (players == null || players.Count == 0)
            {
                var rconPlayers = await _rconService.GetPlayersAsync();
                if (rconPlayers.Count > 0 || isNetworkReachable)
                {
                    players = rconPlayers;
                }
            }
        }

        // 2. Check local process / systemd if network was not reachable
        bool isProcessAlive = isNetworkReachable || await CheckIsProcessAliveAsync();

        if (isProcessAlive)
        {
            status.IsOnline = true;
            status.State = "Online";
            status.StatusMessage = "Server läuft";
            status.Players = players ?? new List<PlayerInfo>();
            status.PlayerCount = status.Players.Count;

            // Metrics
            var metrics = await GetMetricsAsync();
            status.CpuPercent = metrics.CpuPercent;
            status.MemoryUsedMb = metrics.MemoryUsedMb;
            status.MemoryTotalMb = metrics.MemoryTotalMb;
            status.MemoryPercent = metrics.MemoryPercent;

            var uptime = await GetProcessUptimeAsync();
            status.UptimeSeconds = (long)uptime.TotalSeconds;
            status.UptimeFormatted = FormatUptime(uptime);
        }
        else
        {
            status.IsOnline = false;
            status.State = "Offline";
            status.StatusMessage = "Server ist gestoppt";
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
                    var (stdout, stderr, _) = await RunBashCommandWithDetailsAsync($"journalctl -u {_config.SystemdServiceName} -n {lineCount} --no-pager");
                    if (!string.IsNullOrEmpty(stdout))
                    {
                        logs.AddRange(stdout.Split('\n').Select(x => x.Trim()).Where(x => !string.IsNullOrEmpty(x)));
                        return logs;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Could not read journalctl logs: {Message}", ex.Message);
            }
        }

        logs.Add($"[{DateTime.UtcNow.AddMinutes(-10):HH:mm:ss}] [Server] Palworld Dedicated Server initialisiert");
        logs.Add($"[{DateTime.UtcNow.AddMinutes(-9):HH:mm:ss}] [PalServer] RCON aktiv auf Port {_config.RconPort}");
        logs.Add($"[{DateTime.UtcNow.AddMinutes(-5):HH:mm:ss}] [PalServer] REST API aktiv auf {_config.RestApiUrl}");

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
                    var (stdout, _, _) = await RunBashCommandWithDetailsAsync($"systemctl is-active {_config.SystemdServiceName}");
                    if (stdout.Trim() == "active") return true;

                    // Fallback to process check
                    var pid = await GetPalServerProcessIdAsync();
                    return pid > 0;
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
                var (dOut, _, _) = await RunBashCommandWithDetailsAsync($"docker inspect -f '{{{{.State.Running}}}}' {_config.DockerContainerName}");
                return dOut.Trim().Equals("true", StringComparison.OrdinalIgnoreCase);

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
                var (etime, _, _) = await RunBashCommandWithDetailsAsync($"ps -p {pid} -o etimes=");
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
            var (output, _, _) = await RunBashCommandWithDetailsAsync($"pgrep -u {_config.SteamUser} -f PalServer-Linux-Test || pgrep -f PalServer-Linux-Test");
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
            var (output, _, _) = await RunBashCommandWithDetailsAsync($"ps -p {pid} -o %cpu,rss --no-headers");
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

    private async Task<ServerActionResult> ExecuteSystemctlCommandAsync(string action)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            // Check if systemctl exists
            var (whichOut, whichErr, whichExit) = await RunBashCommandWithDetailsAsync("which systemctl");
            if (string.IsNullOrWhiteSpace(whichOut))
            {
                return new ServerActionResult
                {
                    Success = false,
                    Message = "'systemctl' ist in dieser Umgebung (z.B. Docker-Container) nicht verfügbar.",
                    Details = "Tipp: Wenn PalPanel im Docker-Container läuft, wähle in den Einstellungen 'SSH' (um Systemd auf dem Host zu steuern) oder starte PalPanel als nativen Linux-Dienst ('dotnet PalPanel.Server.dll')."
                };
            }

            string cmd = _config.UseSudoForSystemctl
                ? $"sudo systemctl {action} {_config.SystemdServiceName}"
                : $"systemctl {action} {_config.SystemdServiceName}";

            var (stdout, stderr, exitCode) = await RunBashCommandWithDetailsAsync(cmd);
            _logger.LogInformation("systemctl {Action} executed (ExitCode {Code}): {Output} / {Error}", action, exitCode, stdout, stderr);

            if (exitCode != 0 && !string.IsNullOrEmpty(stderr))
            {
                return new ServerActionResult
                {
                    Success = false,
                    Message = $"Fehler beim Ausführen von 'systemctl {action}': {stderr.Trim()}",
                    Details = $"Befehl: {cmd}"
                };
            }

            return new ServerActionResult
            {
                Success = true,
                Message = $"Systemd-Befehl 'systemctl {action} {_config.SystemdServiceName}' erfolgreich ausgeführt.",
                Details = stdout
            };
        }

        _simulatedRunning = action != "stop";
        return new ServerActionResult { Success = true, Message = $"Simulierter Systemd {action} ausgeführt." };
    }

    private async Task<ServerActionResult> StartDirectLinuxProcessAsync()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            string scriptPath = _config.ServerExecutablePath;
            string workDir = _config.ServerWorkingDirectory;

            if (!File.Exists(scriptPath))
            {
                return new ServerActionResult
                {
                    Success = false,
                    Message = $"PalServer-Skript nicht gefunden unter: {scriptPath}",
                    Details = "Bitte überprüfe den 'PalServer Executable Pfad' in den Einstellungen."
                };
            }

            string cmd = $"su - {_config.SteamUser} -c 'cd \"{workDir}\" && \"{scriptPath}\" -port=8211 -players={_config.MaxPlayers} -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS > /dev/null 2>&1 &'";
            var (stdout, stderr, exitCode) = await RunBashCommandWithDetailsAsync(cmd);

            if (exitCode != 0 && !string.IsNullOrEmpty(stderr))
            {
                return new ServerActionResult
                {
                    Success = false,
                    Message = $"Fehler beim Starten des Direktprozesses: {stderr.Trim()}",
                    Details = $"Befehl: {cmd}"
                };
            }

            return new ServerActionResult
            {
                Success = true,
                Message = $"Palworld-Server als Benutzer '{_config.SteamUser}' gestartet.",
                Details = stdout
            };
        }

        _simulatedRunning = true;
        _simulatedStartTime = DateTime.UtcNow;
        return new ServerActionResult { Success = true, Message = "Direktprozess gestartet (Simuliert)." };
    }

    private async Task<ServerActionResult> StopDirectLinuxProcessAsync()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            var (stdout, stderr, _) = await RunBashCommandWithDetailsAsync($"pkill -u {_config.SteamUser} -f PalServer-Linux-Test || pkill -f PalServer-Linux-Test");
            return new ServerActionResult
            {
                Success = true,
                Message = "Palworld-Prozess gestoppt.",
                Details = stdout
            };
        }

        _simulatedRunning = false;
        return new ServerActionResult { Success = true, Message = "Direktprozess gestoppt (Simuliert)." };
    }

    private async Task<ServerActionResult> ExecuteSshServerCommandAsync(string command, string actionName)
    {
        try
        {
            using var client = new SshClient(_config.SshHost, _config.SshPort, _config.SshUsername, _config.SshPassword);
            await Task.Run(() => client.Connect());
            using var cmd = client.CreateCommand(command);
            var result = await Task.Run(() => cmd.Execute());
            client.Disconnect();

            return new ServerActionResult
            {
                Success = cmd.ExitStatus == 0,
                Message = cmd.ExitStatus == 0 ? $"SSH {actionName}-Befehl erfolgreich." : $"SSH Fehler: {cmd.Error}",
                Details = result
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSH execution failed for command {Cmd}", command);
            return new ServerActionResult
            {
                Success = false,
                Message = $"SSH-Verbindungsfehler zu {_config.SshHost}:{_config.SshPort}: {ex.Message}",
                Details = "Überprüfe Host, Port, Benutzer und Passwort in den Einstellungen."
            };
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

    private async Task<ServerActionResult> ExecuteDockerCommandAsync(string dockerArgs)
    {
        var (stdout, stderr, exitCode) = await RunBashCommandWithDetailsAsync($"docker {dockerArgs}");
        bool success = exitCode == 0;
        return new ServerActionResult
        {
            Success = success,
            Message = success ? $"Docker-Befehl erfolgreich: docker {dockerArgs}" : $"Docker-Fehler: {stderr}",
            Details = stdout
        };
    }

    private async Task<(string Stdout, string Stderr, int ExitCode)> RunBashCommandWithDetailsAsync(string command)
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
            if (proc == null) return (string.Empty, "Konnte bash-Prozess nicht starten", -1);

            var stdout = await proc.StandardOutput.ReadToEndAsync();
            var stderr = await proc.StandardError.ReadToEndAsync();
            await proc.WaitForExitAsync();

            return (stdout, stderr, proc.ExitCode);
        }
        catch (Exception ex)
        {
            return (string.Empty, ex.Message, -1);
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
