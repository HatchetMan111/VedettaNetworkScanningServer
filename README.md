# Netzwerk-Scanner (Proxmox / LXC)

Lokaler **Netzwerk-Scanner mit Web-UI** für Proxmox – als schlanker LXC.
Findet und benennt die Geräte im LAN per `arp-scan` (Layer 2) + `nmap`
(Ports, OS, Hostname), speichert den Verlauf und zeigt alles in einem
**React/Vite-Dashboard** (FastAPI-Backend). Vollständig lokal, keine Cloud.

> Konzept-Referenz: [Vedetta](https://github.com/Sived80/vedetta) – das ist ein
> Home-Assistant-Add-on. Dieses Projekt ist der **HA-unabhängige** Nachbau mit
> Fokus auf „einfach auf Proxmox per Einzeiler installieren".

## Einzeiler-Installation

Auf dem Proxmox-Host als root:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/HatchetMan111/VedettaNetworkScanningServer/main/install/netzwerk-scanner.sh)"
```

Optionen per Env davor:

```bash
CTID=120 BRIDGE=vmbr0 VLAN= STORAGE=local-lvm PORT=8080 \
  bash -c "$(wget -qLO - https://raw.githubusercontent.com/HatchetMan111/VedettaNetworkScanningServer/main/install/netzwerk-scanner.sh)"
```

| Variable  | Standard       | Bedeutung                                        |
|-----------|----------------|--------------------------------------------------|
| `BRIDGE`  | `vmbr0`        | LAN-Bridge (dort wird gescannt)                  |
| `VLAN`    | *(leer)*       | VLAN-Tag, z. B. `20`                             |
| `STORAGE` | `local-lvm`    | Storage für Rootfs + Template                    |
| `CTID`    | *nächste freie*| Container-ID                                    |
| `PORT`    | `8080`         | Web-UI-Port                                      |
| `CORES`   | `2`            | CPU-Kerne                                        |
| `MEMORY`  | `1024`         | RAM in MB                                        |
| `DISK`    | `6`            | Rootfs in GB                                     |
| `IP_MODE` | `dhcp`         | `dhcp` oder statisch, z. B. `192.168.178.50/24`  |
| `GW`      | *(leer)*       | Gateway (nur bei statischer IP)                  |
| `FORCE`   | `0`            | `1` = vorhandenen Container überschreiben        |

Das Skript erstellt selbstständig einen **unprivilegierten** LXC, klont das Repo,
richtet Python-venv + systemd ein, **verifiziert** (Service aktiv + HTTP-Check)
und gibt die finale URL aus.

## Web-UI

Nach der Installation: `http://<container-ip>:8080/`

- Summary-Tiles (Geräte gesamt / neu / Proxmox-Hosts / Router)
- Gerätetabelle mit IP, Hostname, Hersteller, Rolle, offenen Ports, MAC, „neu"-Badge
- Filterfeld, Auto-Refresh (10 s), Button **„Jetzt scannen"**
- Dunkles Theme, bindet auf `0.0.0.0`

## API

| Methode | Pfad           | Zweck                                  |
|---------|----------------|----------------------------------------|
| `GET`   | `/healthz`     | Health-Check                           |
| `GET`   | `/api/status`  | letzter Scan, is_scanning, Konfiguration |
| `GET`   | `/api/devices` | Geräte + Metadaten                     |
| `POST`  | `/api/scan`    | Scan jetzt anstoßen                    |

## Bedienung

```bash
# Logs
pct exec <CTID> -- journalctl -u netzwerk-scanner -n 80
# Manuell scannen
pct exec <CTID> -- curl -X POST http://127.0.0.1:8080/api/scan
# Konfiguration (CIDR, Intervall …) – Environment im Service
pct exec <CTID> -- nano /etc/systemd/system/netzwerk-scanner.service
pct exec <CTID> -- systemctl daemon-reload && systemctl restart netzwerk-scanner
```

## Update

```bash
bash update.sh          # erkennt den Container automatisch
# oder: bash update.sh <CTID>
```

## Deinstallieren

```bash
pct stop <CTID> && pct destroy <CTID>
```

## Entwicklung / Frontend neu bauen

Das gebaute `static/` ist committet – der LXC braucht **kein Node**. Zum Ändern
des Frontends:

```bash
bash build_frontend.sh   # baut frontend/ → static/
git add static && git commit && git push
```

## Proxmox-Netzwerk-Realität

- **ARP wirkt nur in der Layer-2-Broadcast-Domain der Bridge.** Der LXC an `vmbr0`
  sieht den Proxmox-Host, alle VMs/CTs auf derselben Bridge und die physischen LAN-Geräte.
- **VLANs:** abgetrennte VLANs nur mit `VLAN=`-Tag (bzw. `net1`/`net2` am Container).
- **Rechte:** `arp-scan` braucht `CAP_NET_RAW` (unprivilegiert i. d. R. vorhanden).
  Falls „Operation not permitted": `pct set <CTID> --unprivileged 0`.

## Technik

- Backend: Python 3 + FastAPI + uvicorn (Scanner in `app/scanner.py`).
- Frontend: React 18 + Vite, Build in `static/` (committet).
- Service: `netzwerk-scanner.service` (Restart=always, After=network-online).
- Lizenz: MIT.

## Repo-Name anpassen

Der Einzeiler und `install/netzwerk-scanner.sh` verweisen auf
`HatchetMan111/VedettaNetworkScanningServer`. Wenn das Repo anders heißt: in
`install/netzwerk-scanner.sh` oben `REPO_OWNER`/`REPO_NAME` ändern **und** die
`raw.githubusercontent.com/...`-URL im Einzeiler anpassen.