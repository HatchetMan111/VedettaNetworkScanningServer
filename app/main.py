"""FastAPI-Backend für den Netzwerk-Scanner.

Endpoints:
  GET  /healthz        – Health-Check
  GET  /api/status     – letzter Scan, is_scanning, n{\"a}chster Lauf, Konfiguration
  GET  /api/devices    – aktuelle Geräte + Metadaten (aus devices.json)
  POST /api/scan       – Scan jetzt anstoßen

Der Scan selbst läuft in app/scanner.py (arp-scan + nmap). Ein interner
Scheduler (asyncio) führt ihn periodisch aus – dadurch genügt EIN systemd-Service
(kein separater Timer) und der Container ist reboot-sicher.
"""
import asyncio
import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app import scanner

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.environ.get("NETZWERK_SCANNER_DATA", "/var/lib/netzwerk-scanner")
IFACE = os.environ.get("NETZWERK_SCANNER_IFACE", "eth0")
CIDR = os.environ.get("NETZWERK_SCANNER_CIDR", "")
PORT = int(os.environ.get("NETZWERK_SCANNER_PORT", "8080"))
OSDETECT = os.environ.get("NETZWERK_SCANNER_OSDETECT", "0") == "1"
TOP_PORTS = int(os.environ.get("NETZWERK_SCANNER_TOP_PORTS", "100"))
INTERVAL = int(os.environ.get("NETZWERK_SCANNER_INTERVAL", "900"))
INITIAL_DELAY = int(os.environ.get("NETZWERK_SCANNER_INITIAL_DELAY", "20"))

scan_lock = asyncio.Lock()
is_scanning = False
last_meta = {}


def _load_last():
    global last_meta
    try:
        with open(os.path.join(DATA_DIR, "devices.json")) as f:
            data = json.load(f)
        last_meta = data.get("meta", {})
    except Exception:
        last_meta = {}


async def _do_scan():
    global is_scanning, last_meta
    async with scan_lock:
        is_scanning = True
        try:
            devices, meta = await asyncio.to_thread(
                scanner.run_scan, IFACE, CIDR, DATA_DIR, OSDETECT, TOP_PORTS)
            last_meta = meta
            return devices, meta
        finally:
            is_scanning = False


async def _scheduler():
    await asyncio.sleep(INITIAL_DELAY)
    while True:
        if not scan_lock.locked():
            try:
                await _do_scan()
            except Exception as e:  # Scheduler darf nie sterben
                print("[scheduler] Scan fehlgeschlagen:", e)
        await asyncio.sleep(INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(DATA_DIR, exist_ok=True)
    _load_last()
    task = asyncio.create_task(_scheduler())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Netzwerk-Scanner", version="1.0.0", lifespan=lifespan)


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "netzwerk-scanner"}


@app.get("/api/status")
async def status():
    next_in = max(0, INTERVAL - (asyncio.get_event_loop().time() % INTERVAL)) if not is_scanning else 0
    return {
        "is_scanning": is_scanning,
        "last_scan": last_meta,
        "next_scan_in_seconds": int(next_in) if not is_scanning else 0,
        "config": {
            "interface": IFACE,
            "cidr": CIDR or "localnet",
            "interval_seconds": INTERVAL,
            "osdetect": OSDETECT,
            "top_ports": TOP_PORTS,
            "data_dir": DATA_DIR,
        },
    }


@app.get("/api/devices")
async def devices():
    path = os.path.join(DATA_DIR, "devices.json")
    try:
        with open(path) as f:
            return JSONResponse(json.load(f))
    except FileNotFoundError:
        return {"meta": {}, "devices": []}


@app.post("/api/scan")
async def trigger_scan():
    if is_scanning or scan_lock.locked():
        return {"status": "already_running"}
    devices, meta = await _do_scan()
    return {"status": "done", "count": len(devices), "new": meta.get("new", 0),
            "meta": meta}


# ---- Statisches Frontend (gebauter React/Vite-Build) --------------------
if os.path.isdir(os.path.join(STATIC_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
if os.path.isdir(os.path.join(STATIC_DIR, "logos")):
    app.mount("/logos", StaticFiles(directory=os.path.join(STATIC_DIR, "logos")), name="logos")


@app.get("/")
async def index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return JSONResponse(
        {"error": "Frontend nicht gebaut. Bitte build_frontend.sh ausführen.",
         "hint": "Die API läuft: /api/status, /api/devices, /healthz"},
        status_code=503)