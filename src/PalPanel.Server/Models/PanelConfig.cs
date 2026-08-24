using System.Text.Json.Serialization;

namespace PalPanel.Server.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ServerExecutionMode
{
    Systemd,
    DirectProcess,
    SSH,
    Docker,
    Simulated
}

public class PalPanelConfig
{
    public string ServerName { get; set; } = "Palworld Dedicated Server";
    public ServerExecutionMode ExecutionMode { get; set; } = ServerExecutionMode.Systemd;

    // Linux & Process Settings
    public string SteamUser { get; set; } = "steam";
    public string SystemdServiceName { get; set; } = "palworld.service";
    public bool UseSudoForSystemctl { get; set; } = true;
    public string ServerExecutablePath { get; set; } = "/home/steam/steamcmd/palworld/PalServer.sh";
    public string ServerWorkingDirectory { get; set; } = "/home/steam/steamcmd/palworld";
    public string SaveDirectoryPath { get; set; } = "/home/steam/steamcmd/palworld/Pal/Saved/SaveGames";
    public string BackupDirectoryPath { get; set; } = "./backups";

    // SSH Remote Settings (if panel runs remotely or in isolated container)
    public string SshHost { get; set; } = "127.0.0.1";
    public int SshPort { get; set; } = 22;
    public string SshUsername { get; set; } = "steam";
    public string SshPassword { get; set; } = "";
    public string SshKeyPath { get; set; } = "";

    // Docker Settings
    public string DockerContainerName { get; set; } = "palworld-server";

    // RCON Protocol Settings
    public bool EnableRcon { get; set; } = true;
    public string RconHost { get; set; } = "127.0.0.1";
    public int RconPort { get; set; } = 25575;
    public string RconPassword { get; set; } = "adminpassword";

    // REST API Settings (Palworld v0.2.0+)
    public bool EnableRestApi { get; set; } = true;
    public string RestApiUrl { get; set; } = "http://127.0.0.1:8212";
    public string RestApiUser { get; set; } = "admin";
    public string RestApiPassword { get; set; } = "adminpassword";

    // Monitoring & Automation
    public int RefreshIntervalSeconds { get; set; } = 4;
    public bool AutoRestartOnCrash { get; set; } = false;
    public int MaxPlayers { get; set; } = 32;
}
