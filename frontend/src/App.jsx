import { useEffect, useMemo, useState } from 'react'
import { fetchDevices, fetchStatus, triggerScan } from './api.js'
import { Icon, RadarLogo, TYPES, TYPE_ORDER, classify } from './icons.jsx'

function fmt(ts) {
  if (!ts) return '–'
  try {
    return new Date(ts).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return ts }
}

function portSummary(d) {
  const p = (d.ports || []).map((x) => x.service || x.proto).filter(Boolean)
  return p.slice(0, 4).join(', ')
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('nz-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('nz-theme', theme)
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

function App() {
  const [data, setData] = useState({ meta: {}, devices: [] })
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [theme, toggleTheme] = useTheme()

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
    setScanning(true)
    setError('')
    try {
      await triggerScan()
      await loadAll()
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setScanning(false)
    }
  }

  const devices = data.devices || []
  const meta = data.meta || {}

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? devices.filter((d) =>
          [d.ip, d.hostname, d.vendor, d.mac, d.role].filter(Boolean).join(' ').toLowerCase().includes(q))
      : devices
    return list
  }, [devices, query])

  const groups = useMemo(() => {
    const map = {}
    for (const d of filtered) {
      const { type } = classify(d)
      ;(map[type] = map[type] || []).push(d)
    }
    return TYPE_ORDER.filter((t) => map[t] && map[t].length).map((t) => ({
      type: t,
      items: map[t].sort((a, b) => {
        const pa = a.ip.split('.').map(Number), pb = b.ip.split('.').map(Number)
        for (let i = 0; i < 4; i++) { if (pa[i] !== pb[i]) return pa[i] - pb[i] }
        return 0
      }),
    }))
  }, [filtered])

  const stats = useMemo(() => {
    let proxmox = 0, routers = 0, isNew = 0
    for (const d of devices) {
      if (d.role === 'Proxmox VE Host') proxmox++
      if (d.role === 'Router / Gateway') routers++
      if (d.is_new) isNew++
    }
    return { total: devices.length, proxmox, routers, new: isNew }
  }, [devices])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <RadarLogo size={46} />
          <div>
            <h1>Netzwerk-Scanner</h1>
            <div className="sub">
              <span className="live-dot" /> Live
              <span className="dot-sep">·</span>
              {status?.config?.interface || 'eth0'}
              <span className="dot-sep">·</span>
              {status?.config?.cidr || 'localnet'}
              {meta.timestamp && (<><span className="dot-sep">·</span> {fmt(meta.timestamp)}</>)}
            </div>
          </div>
        </div>
        <div className="actions">
          <div className="search">
            <input
              type="search"
              placeholder="Suchen …"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="icon-btn" onClick={toggleTheme} title="Theme" aria-label="Theme wechseln">
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
          <button className="scan-btn" onClick={doScan} disabled={scanning || status?.is_scanning}>
            {scanning || status?.is_scanning ? 'Scannt …' : 'Jetzt scannen'}
          </button>
        </div>
      </header>

      {error && <div className="banner error">⚠ {error}</div>}
      {(meta.warnings || []).map((w, i) => <div className="banner warn" key={i}>⚠ {w}</div>)}

      <div className="layout">
        <aside className="col-side">
          <div className="card net-card">
            <div className="net-head">
              <RadarLogo size={54} />
              <div>
                <div className="net-count">{stats.total}</div>
                <div className="net-label">Geräte im Netz</div>
              </div>
            </div>
            <div className="net-stats">
              <div className="stat"><span className="n accent">{stats.new}</span><span className="l">neu</span></div>
              <div className="stat"><span className="n prox">{stats.proxmox}</span><span className="l">Proxmox</span></div>
              <div className="stat"><span className="n">{stats.routers}</span><span className="l">Router</span></div>
            </div>
            <div className="net-foot">
              Letzter Scan: {fmt(meta.timestamp)}
              {status?.next_scan_in_seconds ? ` · nächster in ${Math.round(status.next_scan_in_seconds / 60)} Min` : ''}
            </div>
          </div>
        </aside>

        <main className="col-main">
          {groups.map((g) => (
            <section className="group" key={g.type}>
              <div className="heading">
                <span className="hd-ic" style={{ color: TYPES[g.type].color }}><Icon name={TYPES[g.type].icon} size={20} /></span>
                <span className="hd-title">{TYPES[g.type].label}</span>
                <span className="hd-count">{g.items.length}</span>
              </div>
              <div className="tiles">
                {g.items.map((d) => (
                  <Tile key={d.ip} d={d} onClick={() => setSelected(d)} />
                ))}
              </div>
            </section>
          ))}
          {groups.length === 0 && (
            <div className="empty">
              <p>{devices.length === 0 ? 'Noch keine Daten – starte den ersten Scan.' : 'Keine Treffer.'}</p>
            </div>
          )}
        </main>
      </div>

      <footer className="foot">Netzwerk-Scanner · lokal · keine Cloud · {stats.total} Geräte</footer>

      {selected && <Detail d={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function Tile({ d, onClick }) {
  const c = classify(d)
  const name = d.hostname || d.vendor || 'Unbekannt'
  const ps = portSummary(d)
  return (
    <div className="tile" onClick={onClick}>
      <span className="tile-icon" style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 20%, transparent)` }}>
        {c.logo
          ? <span className="brand-logo" style={{ WebkitMaskImage: `url(/logos/${c.logo}.svg)`, maskImage: `url(/logos/${c.logo}.svg)` }} />
          : <Icon name={c.icon} size={22} />}
      </span>
      <div className="tile-body">
        <div className="tile-name">{name}</div>
        <div className="tile-ip">{d.ip}</div>
        <div className="tile-sub">{[d.vendor, ps].filter(Boolean).join(' · ') || '–'}</div>
      </div>
      {d.is_new && <span className="tile-badge">neu</span>}
    </div>
  )
}

function Detail({ d, onClose }) {
  const c = classify(d)
  const rows = [
    ['IP', d.ip], ['Hostname', d.hostname || '–'], ['Hersteller', d.vendor || '–'],
    ['Rolle', d.role || '–'], ['MAC', d.mac || '–'], ['OS', d.os || '–'],
    ['Ports', (d.ports || []).map((p) => `${p.port}/${p.service || p.proto}`).join(', ') || '–'],
    ['Zuerst gesehen', fmt(d.first_seen)], ['Zuletzt gesehen', fmt(d.last_seen)],
  ]
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="tile-icon" style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 20%, transparent)` }}>
            {c.logo
              ? <span className="brand-logo" style={{ WebkitMaskImage: `url(/logos/${c.logo}.svg)`, maskImage: `url(/logos/${c.logo}.svg)` }} />
              : <Icon name={c.icon} size={22} />}
          </span>
          <div>
            <div className="modal-title">{d.hostname || d.vendor || 'Unbekannt'}</div>
            <div className="modal-sub">{d.ip}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-rows">
          {rows.map(([k, v]) => (
            <div className="mrow" key={k}><span className="mk">{k}</span><span className="mv">{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App