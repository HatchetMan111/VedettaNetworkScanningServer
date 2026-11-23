#!/usr/bin/env bash
# =============================================================================
#  Netzwerk-Scanner – Proxmox-Installer (Community-Scripts-Stil)
#
#  Einzeiler:
#    bash -c "$(wget -qLO - https://raw.githubusercontent.com/HatchetMan111/VedettaNetworkScanningServer/main/install/netzwerk-scanner.sh)"
#
#  Optionen (als Env davor, z.B. "CTID=120 VLAN=20 bash ..."):
#    BRIDGE vmbr0 | VLAN | STORAGE local-lvm | CTID | PORT 8080 | CORES 2
#    MEMORY 1024 | DISK 6 | IP_MODE dhcp | GW | TEMPLATE | FORCE 0
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

### ---- Variablen (hier anpassbar) ------------------------------------------
APP_NAME="netzwerk-scanner"
REPO_OWNER="HatchetMan111"
REPO_NAME="VedettaNetworkScanningServer"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
BRANCH="${BRANCH:-main}"

APP_DIR="/opt/${APP_NAME}"
PORT="${PORT:-8080}"
BRIDGE="${BRIDGE:-vmbr0}"
VLAN="${VLAN:-}"
STORAGE="${STORAGE:-local-lvm}"                # Rootfs-Storage (CT-Disk, rootdir)
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"  # Template-Storage (vztmpl) – NICHT local-lvm!
TEMPLATE="${TEMPLATE:-}"
CTID="${CTID:-}"
CORES="${CORES:-2}"
MEMORY="${MEMORY:-1024}"
DISK="${DISK:-6}"
IP_MODE="${IP_MODE:-dhcp}"
GW="${GW:-}"
PASSWORD="${PASSWORD:-netzwerk-scanner}"
FORCE="${FORCE:-0}"
### ---- /Variablen ----------------------------------------------------------

LOG="/var/log/${APP_NAME}-install.log"
: > "$LOG"
exec > >(tee -a "$LOG") 2>&1

on_error() {
  local rc=$?
  local line=$1
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "❌  INSTALLATIONSFEHLER"
  echo "    Zeile    : ${line}"
  echo "    Exit-Code: ${rc}"
  echo "    Befehl   : ${BASH_COMMAND}"
  echo "    Logdatei : ${LOG}"
  echo "------------------------------------------------------------"
  echo "Letzte 60 Zeilen des kompletten Logs:"
  tail -n 60 "$LOG" 2>/dev/null || true
  echo "════════════════════════════════════════════════════════════"
  echo "Tipp: Skript lokal speichern und mit 'bash -x netzwerk-scanner.sh' erneut starten"
  echo "      (vollständiges Trace-Log) – oder 'cat ${LOG}' ansehen."
  exit "$rc"
}
trap 'on_error $LINENO' ERR

step() { echo; echo "### $* ###"; }

# ---- 0) Vorbedingungen -----------------------------------------------------
[ "$(id -u)" -eq 0 ] || { echo "Bitte als root ausführen (sudo -i)."; exit 1; }
command -v pct  >/dev/null || { echo "pct fehlt – läuft das auf einem Proxmox-Host?"; exit 1; }
command -v pvesh >/dev/null || { echo "pvesh fehlt – Proxmox-Host?"; exit 1; }
command -v pveam >/dev/null || { echo "pveam fehlt – Proxmox-Host?"; exit 1; }

# ---- 1) Container-ID -------------------------------------------------------
if [ -z "$CTID" ]; then
  CTID="$(pvesh get /cluster/nextid | tr -d '[:space:]')"
fi
echo "▶ Verwende Container-ID: ${CTID}"

if pct status "$CTID" >/dev/null 2>&1; then
  if [ "$FORCE" != "1" ]; then
    echo "❌ Container ${CTID} existiert bereits. Mit FORCE=1 überschreiben."
    exit 1
  fi
  step "Überschreibe Container ${CTID} (FORCE=1)"
  pct stop "$CTID" >/dev/null 2>&1 || true
  pct destroy "$CTID" >/dev/null 2>&1 || true
fi

# ---- 2) Template-Storage (vztmpl) + Rootfs-Storage (rootdir) + Template ------
# WICHTIG: Templates (vztmpl) liegen NICHT auf local-lvm (das kann nur rootdir/images).
# Darum getrennte Storages: TEMPLATE_STORAGE (z. B. local) und STORAGE (rootfs).
if ! pvesm status --content vztmpl 2>/dev/null | awk 'NR>1{print $1}' | grep -qx "$TEMPLATE_STORAGE"; then
  _d="$(pvesm status --content vztmpl 2>/dev/null | awk 'NR>1{print $1; exit}')"
  [ -n "$_d" ] && TEMPLATE_STORAGE="$_d"
fi
if ! pvesm status --content rootdir 2>/dev/null | awk 'NR>1{print $1}' | grep -qx "$STORAGE"; then
  _d="$(pvesm status --content rootdir 2>/dev/null | awk 'NR>1{print $1; exit}')"
  [ -n "$_d" ] && STORAGE="$_d"
fi
echo "▶ Template-Storage: ${TEMPLATE_STORAGE}  |  Rootfs-Storage: ${STORAGE}"

if [ -z "$TEMPLATE" ]; then
  TEMPLATE="$(pveam available --section system | awk '/debian-12-standard.*amd64/{print $2; exit}')"
  [ -n "$TEMPLATE" ] || { echo "Kein debian-12-standard gefunden – TEMPLATE=... setzen."; exit 1; }
fi
if ! pveam list "$TEMPLATE_STORAGE" 2>/dev/null | grep -q "$TEMPLATE"; then
  step "Lade Template ${TEMPLATE} nach ${TEMPLATE_STORAGE}"
  pveam download "$TEMPLATE_STORAGE" "$TEMPLATE"
fi

# ---- 3) Container erstellen ------------------------------------------------
NET0="name=eth0,bridge=${BRIDGE},ip=${IP_MODE},firewall=0"
[ -n "$VLAN" ] && NET0="${NET0},tag=${VLAN}"
if [ "$IP_MODE" != "dhcp" ] && [ -n "$GW" ]; then
  NET0="${NET0},gw=${GW}"
fi

step "Erstelle LXC ${CTID} (unprivilegiert, Bridge ${BRIDGE}${VLAN:+.${VLAN}}, IP ${IP_MODE})"
pct create "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}" \
  --hostname "$APP_NAME" \
  --cores "$CORES" \
  --memory "$MEMORY" \
  --rootfs "${STORAGE}:${DISK}" \
  --net0 "$NET0" \
  --onboot 1 \
  --startup order=1 \
  --unprivileged 1 \
  --cmode shell \
  --description "Netzwerk-Scanner (arp-scan + nmap) Web-UI" \
  --password "$PASSWORD"
pct start "$CTID"

step "Warte auf Netzwerk im Container ..."
for _ in $(seq 1 30); do
  if pct exec "$CTID" -- ip -4 -brief addr show eth0 2>/dev/null | grep -q "UP"; then
    break
  fi
  sleep 2
done

# ---- 4) Pakete installieren ------------------------------------------------
step "Installiere Pakete im Container ..."
pct exec "$CTID" -- bash -c "export DEBIAN_FRONTEND=noninteractive; \
  apt-get update -qq && apt-get install -y -qq \
  git python3 python3-venv python3-pip arp-scan nmap ieee-data \
  curl ca-certificates iproute2 dnsutils >/dev/null"

# ---- 5) App klonen ---------------------------------------------------------
step "Klonen von ${REPO_URL} (${BRANCH}) nach ${APP_DIR}"
pct exec "$CTID" -- bash -c "rm -rf '${APP_DIR}' && git clone --depth 1 --branch '${BRANCH}' '${REPO_URL}' '${APP_DIR}'"

# ---- 6) Python-venv + Abhängigkeiten --------------------------------------
step "Richte Python-venv ein und installiere Abhängigkeiten ..."
pct exec "$CTID" -- bash -c "cd '${APP_DIR}' && \
  python3 -m venv venv && \
  venv/bin/pip install --quiet --upgrade pip && \
  venv/bin/pip install --quiet -r requirements.txt"

# ---- 7) systemd-Service ----------------------------------------------------
step "Richte systemd-Service ein (Port ${PORT}) ..."
pct exec "$CTID" -- bash -c "\
  mkdir -p /var/lib/${APP_NAME} && \
  sed -i 's/NETZWERK_SCANNER_PORT=8080/NETZWERK_SCANNER_PORT=${PORT}/' '${APP_DIR}/netzwerk-scanner.service' && \
  cp '${APP_DIR}/netzwerk-scanner.service' /etc/systemd/system/netzwerk-scanner.service && \
  systemctl daemon-reload && \
  systemctl enable --now netzwerk-scanner"

# ---- 8) Verifikation -------------------------------------------------------
step "Verifiziere Installation ..."
ACTIVE="$(pct exec "$CTID" -- systemctl is-active netzwerk-scanner || true)"
echo "  systemctl is-active : ${ACTIVE}"

OK=0
for _ in $(seq 1 20); do
  if pct exec "$CTID" -- curl -fsS -m 5 "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1; then
    OK=1; break
  fi
  sleep 2
done
if [ "$OK" = "1" ]; then
  echo "  HTTP /healthz       : OK"
else
  echo "  HTTP /healthz       : ✗ keine Antwort (siehe journalctl -u netzwerk-scanner)"
fi

# arp-scan-Rechte (CAP_NET_RAW) im unprivilegierten Container prüfen
if ! pct exec "$CTID" -- arp-scan --interface eth0 --localnet >/dev/null 2>&1; then
  echo "  arp-scan            : ⚠ keine Ausgabe. Falls 'Operation not permitted':"
  echo "                        pct set ${CTID} --unprivileged 0   (privilegiert)"
fi

IP="$(pct exec "$CTID" -- ip -4 -brief addr show eth0 2>/dev/null | awk '{print $3}')"
cat <<EOF

════════════════════════════════════════════════════════════
✅  Fertig – Netzwerk-Scanner installiert.

    Container-ID : ${CTID}  (hostname: ${APP_NAME})
    Container-IP : ${IP:-unbekannt}
    Web-UI       : http://${IP%%/*}:${PORT}/
    Health       : http://${IP%%/*}:${PORT}/healthz

    Logs ansehen : pct exec ${CTID} -- journalctl -u netzwerk-scanner -n 50
    Manuell scannen: pct exec ${CTID} -- curl -X POST http://127.0.0.1:${PORT}/api/scan
    Update       : bash update.sh ${CTID}
    Deinstall    : pct stop ${CTID} && pct destroy ${CTID}

    Der erste Scan startet automatisch (~20 s nach dem Boot).
    Der Report/die UI aktualisiert sich alle 15 Minuten.
════════════════════════════════════════════════════════════
EOF