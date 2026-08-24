# 🎮 PalPanel - Palworld Dedicated Server Management Panel

Ein modernes, elegantes und performantes Server-Management-Webinterface für **Palworld Dedicated Server**, entwickelt in **C# (ASP.NET Core .NET 8)** und **ReactJS**.

Optimiert für **Linux**-Server (Betrieb unter dem Benutzer `steam`) und vollständig **Docker-fähig**.

---

## ✨ Features

- **⚡ Server-Steuerung**: Palworld Server direkt starten, stoppen, neustarten oder Welt speichern (Systemd, Direktprozess oder Docker).
- **👥 Live-Spielerübersicht**:
  - Anzeige aller verbundenen Spieler in Echtzeit.
  - Name, Steam-ID, Player-UID, Ping, Level und In-Game-Koordinaten.
  - Aktionen pro Spieler: Kicken, Bannen, Direktnachricht senden, IDs mit einem Klick kopieren.
- **📡 Live-Broadcasts**: In-Game-Nachrichten direkt an alle Spieler auf dem Server senden.
- **💻 Interaktive RCON-Konsole**:
  - Live-Terminal mit Source-RCON-Unterstützung.
  - Befehlshistorie (Navigation per Pfeiltasten) und Schnell-Makros (`ShowPlayers`, `Info`, `Save`, `Shutdown`).
- **💾 Welt-Sicherungen (Backups)**:
  - Manuelle und automatische Snapshots des `Pal/Saved/SaveGames`-Ordners als `.zip`.
  - Download von Backups auf den lokalen PC und 1-Klick-Wiederherstellung.
- **📊 Echtzeit-Metriken (SignalR)**:
  - Live-Streaming von CPU-Auslastung, RAM-Verbrauch, Server-Uptime und Spieleranzahl ohne Neuladen der Seite.
  - Benachrichtigungen bei Spielerbeitritten und Serverereignissen.
- **🛡️ Watchdog / Crash-Erkennung**: Automatischer Serverneustart bei unerwartetem Absturz.
- **✨ High-Tech Gaming UI**: Dunkles Cyber/Glassmorphism-Design mit Farbcodierung und Animationen.

---

## 🚀 Installation & Startmöglichkeiten

### Option 1: Docker (Empfohlen)

Mit Docker lässt sich PalPanel auf deinem Linux-Server mit einem einzigen Befehl starten:

```bash
# 1. Repository klonen / Projektordner öffnen
cd PalPanel

# 2. Container bauen und im Hintergrund starten
docker compose up -d --build
```

Das Webinterface ist anschließend unter **`http://DEINE-SERVER-IP:5000`** erreichbar.

---

### Option 2: Direkt auf Linux (Nativ mit .NET 8)

1. **Voraussetzungen installieren**:
   ```bash
   sudo apt update
   sudo apt install -y dotnet-sdk-8.0
   ```

2. **Systemd-Dienst für Palworld Server einrichten (Benutzer `steam`)**:
   ```bash
   # Führe das Installationsskript aus:
   chmod +x deploy/setup-steam-service.sh
   ./deploy/setup-steam-service.sh
   ```

3. **PalPanel bauen und starten**:
   ```bash
   # Backend & Frontend kompilieren
   dotnet publish src/PalPanel.Server/PalPanel.Server.csproj -c Release -o /opt/palpanel

   # PalPanel starten
   cd /opt/palpanel
   dotnet PalPanel.Server.dll
   ```

---

## ⚙️ Palworld Konfiguration (`PalWorldSettings.ini`)

Damit PalPanel die Spieler abfragen und Befehle ausführen kann, aktiviere RCON und die REST-API in deiner `PalWorldSettings.ini` (zu finden unter `/home/steam/steamcmd/palworld/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini`):

```ini
RCONEnabled=True,
RCONPort=25575,
AdminPassword="dein_admin_passwort",
RESTAPIEnabled=True,
RESTAPIPort=8212
```

> **Tipp**: Passe das Passwort und den Port anschließend im Menü **Einstellungen** in PalPanel an.

---

## 📂 Projektstruktur

```
PalPanel/
├── src/
│   ├── PalPanel.Server/             # C# .NET 8 Web API & SignalR Hub
│   │   ├── Controllers/             # REST Endpunkte (Server, Players, Rcon, Backups, Config)
│   │   ├── Services/                # Linux-Prozesssteuerung, RCON-Client, REST-Client, Backup-Service
│   │   ├── Hubs/                    # SignalR WebSockets für Live-Updates
│   │   └── Models/                  # Datenmodelle & Konfiguration
│   │
│   └── PalPanel.Client/             # React 18 Frontend
│       ├── src/
│       │   ├── components/          # Reusable UI (Sidebar, Header, MetricCard, StatusBadge, Modal)
│       │   ├── pages/               # Dashboard, Players, Console, Backups, Settings
│       │   └── services/            # API- & SignalR-Anbindung
│
├── deploy/                          # Systemd-Services & Linux Setup-Skripte
├── Dockerfile                       # Multi-stage Dockerfile
├── docker-compose.yml               # Docker Compose Orchestrierung
└── README.md
```
