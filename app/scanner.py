"""Netzwerk-Scanner: arp-scan + nmap, Geräte-Erkennung, Verlauf.

HA-unabhängig. Wird von app/main.py (FastAPI) und optional als CLI genutzt.
"""
import concurrent.futures
import json
import os
import re
import socket
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime


def run(cmd, timeout=900):
    """Führt einen Befehl aus und liefert (rc, stdout, stderr) – auch bei Files-not-found."""
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except FileNotFoundError as e:
        return 127, "", str(e)
    except subprocess.TimeoutExpired as e:
        return 124, (e.stdout or ""), (e.stderr or "") + "\n[timeout nach %ss]" % timeout


def find_oui():
    for p in ("/usr/share/arp-scan/ieee-oui.txt", "/usr/share/ieee-data/oui.txt"):
        if os.path.exists(p):
            return p
    return None


def arp_scan(iface, cidr=""):
    """Layer-2-Scan: IP, MAC, Hersteller. Liefert (dict ip->info, stdout, stderr)."""
    cmd = ["arp-scan", "--interface", iface, "--numeric", "--quiet"]
    oui = find_oui()
    if oui:
        cmd += ["--ouifile", oui]
    cmd.append(cidr if cidr else "--localnet")
    rc, out, err = run(cmd)
    devs = {}
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        ip, mac = parts[0].strip(), parts[1].strip()
        if not re.match(r"^\d{1,3}(\.\d{1,3}){3}$", ip):
            continue
        if not re.match(r"^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$", mac):
            continue
        vendor = parts[2].strip() if len(parts) >= 3 else ""
        devs[ip] = {"ip": ip, "mac": mac, "vendor": vendor}
    return devs, out, err


def nmap_scan(ips, osdetect=False, top_ports=100):
    """Port-/OS-Scan der gefundenen Hosts. Liefert dict ip->{hostname, ports, os, mac}."""
    live = {}
    if not ips:
        return live
    listfile = "/tmp/netzwerk_scanner_ips.txt"
    with open(listfile, "w") as f:
        f.write("\n".join(ips))
    cmd = ["nmap", "-sS", "-Pn", "-n", "--open", "-T4",
           "--top-ports", str(top_ports), "-oX", "-", "-iL", listfile]
    if osdetect:
        cmd.insert(2, "-O")
    rc, out, err = run(cmd, timeout=1800)
    try:
        root = ET.fromstring(out)
    except ET.ParseError:
        return live
    for host in root.findall("host"):
        status = host.find("status")
        if status is None or status.get("state") != "up":
            continue
        ip = mac = hostname = ""
        for a in host.findall("address"):
            if a.get("addrtype") == "ipv4":
                ip = a.get("addr")
            elif a.get("addrtype") == "mac":
                mac = a.get("addr")
        if not ip:
            continue
        hn = host.find("hostnames/hostname")
        if hn is not None:
            hostname = hn.get("name") or ""
        ports, osname = [], ""
        for port in host.findall("ports/port"):
            st = port.find("state")
            if st is None or st.get("state") != "open":
                continue
            svc = port.find("service")
            ports.append({"port": port.get("portid"), "proto": port.get("protocol"),
                          "service": (svc.get("name") if svc is not None else ""),
                          "product": (svc.get("product") if svc is not None else ""),
                          "version": (svc.get("version") if svc is not None else "")})
        om = host.find("os/osmatch")
        if om is not None:
            osname = om.get("name") or ""
        live[ip] = {"ip": ip, "mac": mac, "hostname": hostname, "ports": ports, "os": osname}
    return live


def reverse_dns(ips):
    res = {}

    def look(ip):
        try:
            return ip, socket.gethostbyaddr(ip)[0]
        except Exception:
            return ip, ""

    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex:
        for ip, name in ex.map(look, ips):
            if name:
                res[ip] = name
    return res


def guess_role(dev):
    ports = {int(p["port"]) for p in dev.get("ports", []) if p["port"]}
    if 8006 in ports:
        return "Proxmox VE Host"
    if ports & {445, 139}:
        return "Windows / NAS"
    if ports & {5000, 5001}:
        return "NAS (Synology)"
    if ports & {554, 8554, 23}:
        return "Kamera / IoT"
    if ports & {53, 80, 443}:
        return "Router / Gateway"
    if 22 in ports and len(ports) <= 3:
        return "Server (SSH)"
    return "Host"


def merge(arp, nmap, rdns):
    devs = {}
    for ip, d in arp.items():
        devs[ip] = {"ip": ip, "mac": d["mac"], "vendor": d["vendor"],
                    "hostname": "", "ports": [], "os": ""}
    for ip, n in nmap.items():
        d = devs.setdefault(ip, {"ip": ip, "mac": n.get("mac") or "",
                                 "vendor": "", "hostname": "", "ports": [], "os": ""})
        if n.get("mac") and not d["mac"]:
            d["mac"] = n["mac"]
        if n.get("ports"):
            d["ports"] = n["ports"]
        if n.get("os"):
            d["os"] = d["os"] or n["os"]
    for ip, name in rdns.items():
        if ip in devs and not devs[ip]["hostname"]:
            devs[ip]["hostname"] = name
    return devs


def ip_key(ip):
    try:
        return tuple(int(x) for x in ip.split("."))
    except Exception:
        return (999, 999, 999, 999)


def port_str(dev):
    return ", ".join(p["port"] + "/" + (p["service"] or p["proto"] or "?") for p in dev["ports"])


def _load_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return {}


def apply_history(devs, path):
    """Versieht die Geräte mit first_seen/last_seen/is_new (persistiert in seen.json)."""
    hist = _load_json(path)
    now = datetime.now().isoformat(timespec="seconds")
    out = {}
    for ip, d in devs.items():
        key = d["mac"] or ip
        prev = hist.get(key)
        d["first_seen"] = prev["first_seen"] if prev else now
        d["last_seen"] = now
        d["is_new"] = prev is None
        out[key] = {"first_seen": d["first_seen"], "last_seen": now,
                    "ip": ip, "hostname": d["hostname"], "vendor": d["vendor"]}
    with open(path + ".tmp", "w") as f:
        json.dump(out, f, indent=2)
    os.replace(path + ".tmp", path)
    return devs


def run_scan(iface="eth0", cidr="", outdir="/var/lib/netzwerk-scanner",
             osdetect=False, top_ports=100):
    """Führt einen kompletten Scan aus und schreibt devices.json + seen.json.

    Liefert (devices, meta). devices: Liste (sortiert), meta: dict.
    """
    socket.setdefaulttimeout(2)
    os.makedirs(outdir, exist_ok=True)
    ts = datetime.now().isoformat(timespec="seconds")
    arp, raw, err = arp_scan(iface, cidr)
    warnings = []
    if not arp:
        warnings.append("arp-scan hat keine Geräte gefunden. Läuft der Container im "
                        "gleichen L2-Netz (Bridge)? Hat er CAP_NET_RAW?")
        if err.strip():
            warnings.append(err.strip()[:400])
    rdns = reverse_dns(list(arp.keys()))
    nmap = nmap_scan(list(arp.keys()), osdetect, top_ports)
    devs = merge(arp, nmap, rdns)
    devs = apply_history(devs, os.path.join(outdir, "seen.json"))
    devices = sorted(devs.values(), key=lambda x: ip_key(x["ip"]))
    for d in devices:
        d["role"] = guess_role(d)
    meta = {"timestamp": ts, "interface": iface, "cidr": cidr or "localnet",
            "count": len(devices), "new": sum(1 for d in devices if d["is_new"]),
            "warnings": warnings}
    tmp = os.path.join(outdir, "devices.json.tmp")
    with open(tmp, "w") as f:
        json.dump({"meta": meta, "devices": devices}, f, indent=2)
    os.replace(tmp, os.path.join(outdir, "devices.json"))
    return devices, meta