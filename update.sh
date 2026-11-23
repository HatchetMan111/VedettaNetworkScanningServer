#!/usr/bin/env bash
# Update: holt den neusten Stand ins LXC und startet den Service neu.
# Verwendung auf dem Proxmox-Host:  bash update.sh [CTID]
set -euo pipefail

CTID="${1:-}"
if [ -z "$CTID" ]; then
  CTID="$(pct list 2>/dev/null | awk '/netzwerk-scanner/{print $1; exit}')"
fi
[ -n "$CTID" ] || { echo "Kein Container mit Hostname 'netzwerk-scanner' gefunden. CTID angeben."; exit 1; }

echo "▶ Update in Container $CTID ..."
pct exec "$CTID" -- bash -c '
  set -e
  cd /opt/netzwerk-scanner
  echo ▶ git fetch
  git fetch --depth 1 origin main
  git reset --hard FETCH_HEAD
  echo ▶ pip install
  venv/bin/pip install -q -r requirements.txt
  echo ▶ restart
  systemctl restart netzwerk-scanner
  sleep 3
  systemctl is-active netzwerk-scanner
'
echo "▶ Fertig. Prüfen: http://<container-ip>:8080/"