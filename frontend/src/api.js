// Schlanke API-Anbindung ans FastAPI-Backend.
async function getJSON(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    let detail = ''
    try { detail = JSON.stringify(await res.json()) } catch { /* egal */ }
    throw new Error(`HTTP ${res.status} bei ${url} ${detail}`)
  }
  return res.json()
}

export const fetchStatus = () => getJSON('/api/status')
export const fetchDevices = () => getJSON('/api/devices')
export const triggerScan = () => getJSON('/api/scan', { method: 'POST' })