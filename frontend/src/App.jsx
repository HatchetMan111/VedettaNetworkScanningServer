import { useEffect, useMemo, useState } from 'react'
import { fetchDevices, fetchStatus, triggerScan } from './api.js'

function fmt(ts) {
  if (!ts) return '–'
  try {
    return new Date(ts).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return ts }
}

function roleClass(role) {
  if (role === 'Proxmox VE Host') return 'role proxmox'
  if (role === 'Router / Gateway') return 'role router'
  if (role.includes('NAS') || role.includes('Windows')) return 'role nas'
  if (role.includes('Kamera') || role.includes('IoT')) return 'role iot'
  return 'role'
}

function App() {
  const [data, setData] = useState({ meta: {}, devices: [] })
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [loadingScan, setLoadingScan] = useState(false)
  const [query, setQuery] = useState('')

  const loadAll = async () => {
    try {
      const [d, s] = await Promise.all([fetchDevices(), fetchStatus()])
      setData(d)
      setStatus(s)
      setError('')
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  useEffect(() => {
    loadAll()
    const t = setInterval(loadAll, 10000)
    return () => clearInterval(t)
  }, [])

  const doScan = async () => {
    setLoadingScan(true)
    setError('')
    try {
      await triggerScan()
      await loadAll()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoadingScan(false)
    }
  }

  const devices = data.devices || []
  const meta = data.meta || {}

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return devices
    return devices.filter((d) =>
      [d.ip, d.hostname, d.vendor, d.mac, d.role]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [devices, query])

  const counts = useMemo(() => {
    const proxmox = devices.filter((d) => d.role === 'Proxmox VE Host').length
    const isNew = devices.filter((d) => d.is_new).length
    const routers = devices.filter((d) => d.role === 'Router / Gateway').length
    return { total: devices.length, proxmox, isNew, routers }
  }, [devices])

  return (
    <div className="app">
      <header>
        <div className="title">
          <span className="logo">📡</span>
          <div>
            <h1>Netzwerk-Scanner</h1>
            <p className="sub">
              {status?.config?.interface || 'eth0'} ·{' '}
              {status?.config?.cidr || 'localnet'} · Scan alle{' '}
              {Math.round((status?.config?.interval_seconds || 900) / 60)} Min
              {meta.timestamp && <> · zuletzt {fmt(meta.timestamp)}</>}
            </p>
          </div>
        </div>
        <button className="scan-btn" onClick={doScan} disabled={loadingScan || status?.is_scanning}>
          {loadingScan || status?.is_scanning ? 'Scannt …' : 'Jetzt scannen'}
        </button>
      </header>

      {error && <div className="error">⚠ {error}</div>}
      {(meta.warnings || []).map((w, i) => (
        <div className="warn" key={i}>⚠ {w}</div>
      ))}

      <section className="tiles">
        <div className="tile"><span className="tile-num">{counts.total}</span><span className="tile-lbl">Geräte</span></div>
        <div className="tile"><span className="tile-num accent">{counts.isNew}</span><span className="tile-lbl">neu</span></div>
        <div className="tile"><span className="tile-num prox">{counts.proxmox}</span><span className="tile-lbl">Proxmox-Hosts</span></div>
        <div className="tile"><span className="tile-num">{counts.routers}</span><span className="tile-lbl">Router/Gateway</span></div>
      </section>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Filtern nach IP, Name, Hersteller …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="count">{filtered.length} Treffer</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>IP</th><th>Hostname</th><th>Hersteller</th><th>Rolle</th>
              <th>Ports</th><th>MAC</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.ip}>
                <td className="mono">{d.ip}</td>
                <td>{d.hostname || '–'}</td>
                <td>{d.vendor || '–'}</td>
                <td><span className={roleClass(d.role)}>{d.role}</span></td>
                <td className="mono ports">{d.ports?.map((p) => p.port + '/' + (p.service || p.proto)).join(', ') || '–'}</td>
                <td className="mono mac">{d.mac || '–'}</td>
                <td>{d.is_new ? <span className="badge-new">neu</span> : <span className="muted">✓</span>}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="empty">
                {devices.length === 0 ? 'Noch keine Daten – starte den ersten Scan.' : 'Keine Treffer.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <footer>
        Netzwerk-Scanner · lokal · keine Cloud · {meta.count ?? 0} Geräte im letzten Scan
      </footer>
    </div>
  )
}

export default App