#!/bin/bash
# ==============================================================================
# PalPanel - Setup Script für Linux Dedicated Server (Benutzer: steam)
# ==============================================================================
set -e

echo "=== [1/4] Erstelle Linux-Benutzer 'steam' falls nicht vorhanden ==="
if ! id -u steam >/dev/null 2>&1; then
    sudo useradd -m -s /bin/bash steam
    echo "Benutzer 'steam' wurde angelegt."
else
    echo "Benutzer 'steam' existiert bereits."
fi

echo "=== [2/4] Kopiere Systemd-Dienste ==="
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -f "$SCRIPT_DIR/palworld.service" ]; then
    sudo cp "$SCRIPT_DIR/palworld.service" /etc/systemd/system/palworld.service
    echo "palworld.service nach /etc/systemd/system/ kopiert."
fi

if [ -f "$SCRIPT_DIR/palpanel.service" ]; then
    sudo cp "$SCRIPT_DIR/palpanel.service" /etc/systemd/system/palpanel.service
    echo "palpanel.service nach /etc/systemd/system/ kopiert."
fi

echo "=== [3/4] Lade Systemd-Konfiguration neu ==="
sudo systemctl daemon-reload
sudo systemctl enable palworld.service

echo "=== [4/4] Fertig! ==="
echo "Du kannst den Palworld Server nun mit folgendem Befehl starten:"
echo "  sudo systemctl start palworld.service"
echo ""
echo "Um PalPanel als Docker-Container zu starten:"
echo "  docker compose up -d"
