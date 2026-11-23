// MDI-Icons (MIT, aus Vedetta) + Hersteller-Logos (MIT) + Geräte-Klassifikation.
import React from 'react'

// Material Design Icons (viewBox 0 0 24 24), subset
export const PATHS = {
  router: "M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2M12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20M13 13V16H15L12 19L9 16H11V13M5 13H8V15L11 12L8 9V11H5M11 11V8H9L12 5L15 8H13V11M19 11H16V9L13 12L16 15V13H19",
  server: "M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21M5,3V5H7V3H5M5,11V13H7V11H5M5,19V21H7V19H5Z",
  laptop: "M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z",
  cellphone: "M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z",
  printer: "M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z",
  cctv: "M6.03 12.03L8.03 15.5L5.5 18.68L2 12.62L6.03 12.03M17 18V15.29C17.88 14.9 18.5 14.03 18.5 13C18.5 12.43 18.3 11.9 17.97 11.5L19.94 10.35C20.95 9.76 21.3 8.47 20.71 7.46L19.33 5.06C18.74 4.05 17.45 3.7 16.44 4.28L8.31 9C7.36 9.53 7.03 10.75 7.58 11.71L9.08 14.31C9.63 15.26 10.86 15.59 11.81 15.04L13.69 13.96C13.94 14.55 14.41 15.03 15 15.29V18C15 19.1 15.9 20 17 20H22V18H17Z",
  speaker: "M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M12,20A5,5 0 0,1 7,15A5,5 0 0,1 12,10A5,5 0 0,1 17,15A5,5 0 0,1 12,20M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8C10.89,8 10,7.1 10,6C10,4.89 10.89,4 12,4M17,2H7C5.89,2 5,2.89 5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4C19,2.89 18.1,2 17,2Z",
  nas: "M4,5C2.89,5 2,5.89 2,7V17C2,18.11 2.89,19 4,19H20C21.11,19 22,18.11 22,17V7C22,5.89 21.11,5 20,5H4M4.5,7A1,1 0 0,1 5.5,8A1,1 0 0,1 4.5,9A1,1 0 0,1 3.5,8A1,1 0 0,1 4.5,7M7,7H20V17H7V7M8,8V16H11V8H8M12,8V16H15V8H12M16,8V16H19V8H16M9,9H10V10H9V9M13,9H14V10H13V9M17,9H18V10H17V9Z",
  chip: "M6,4H18V5H21V7H18V9H21V11H18V13H21V15H18V17H21V19H18V20H6V19H3V17H6V15H3V13H6V11H3V9H6V7H3V5H6V4M11,15V18H12V15H11M13,15V18H14V15H13M15,15V18H16V15H15Z",
  devices: "M3,6H21V4H3C1.9,4 1,4.9 1,6V18C1,19.1 1.9,20 3,20H7V18H3V6M13,12H9V13.78C8.39,14.33 8,15.11 8,16C8,16.89 8.39,17.67 9,18.22V20H13V18.22C13.61,17.67 14,16.88 14,16C14,15.12 13.61,14.33 13,13.78V12M11,17.5C10.17,17.5 9.5,16.83 9.5,16C9.5,15.17 10.17,14.5 11,14.5A1.5,1.5 0 0,1 12.5,16C12.5,16.83 11.83,17.5 11,17.5M22,8H16C15.5,8 15,8.5 15,9V19C15,19.5 15.5,20 16,20H22C22.5,20 23,19.5 23,19V9C23,8.5 22.5,8 22,8M21,18H17V10H21V18Z",
  home: "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
  lan: "M10,2C8.89,2 8,2.89 8,4V7C8,8.11 8.89,9 10,9H11V11H2V13H6V15H5C3.89,15 3,15.89 3,17V20C3,21.11 3.89,22 5,22H9C10.11,22 11,21.11 11,20V17C11,15.89 10.11,15 9,15H8V13H16V15H15C13.89,15 13,15.89 13,17V20C13,21.11 13.89,22 15,22H19C20.11,22 21,21.11 21,20V17C21,15.89 20.11,15 19,15H18V13H22V11H13V9H14C15.11,9 16,8.11 16,7V4C16,2.89 15.11,2 14,2H10M10,4H14V7H10V4M5,17H9V20H5V17M15,17H19V20H15V17Z",
  wifi: "M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,3C7.95,3 4.21,4.34 1.2,6.6L3,9C5.5,7.12 8.62,6 12,6C15.38,6 18.5,7.12 21,9L22.8,6.6C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.4L6.6,13.8C8.1,12.67 9.97,12 12,12C14.03,12 15.9,12.67 17.4,13.8L19.2,11.4C17.19,9.89 14.7,9 12,9Z",
  monitor: "M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z",
  tablet: "M19,18H5V6H19M21,4H3C1.89,4 1,4.89 1,6V18A2,2 0 0,0 3,20H21A2,2 0 0,0 23,18V6C23,4.89 22.1,4 21,4Z",
  watch: "M6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12M20,12C20,9.45 18.81,7.19 16.95,5.73L16,0H8L7.05,5.73C5.19,7.19 4,9.45 4,12C4,14.54 5.19,16.81 7.05,18.27L8,24H16L16.95,18.27C18.81,16.81 20,14.54 20,12Z",
  alert: "M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z",
}

export function Icon({ name, size = 22 }) {
  return (
    <svg className="mdi" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name] || PATHS.devices} />
    </svg>
  )
}

// Vedetta-Radar (MIT) als Eye-Catcher
export function RadarLogo({ size = 64 }) {
  return (
    <svg className="radar-logo" width={size} height={size} viewBox="0 0 1024 1024" role="img" aria-label="Netzwerk-Scanner">
      <circle cx="512" cy="512" r="480" fill="var(--radar-bg, #12283a)" />
      <g fill="none" stroke="var(--radar-ring, #40d89f)" strokeWidth="14">
        <circle cx="512" cy="512" r="459" />
        <circle cx="512" cy="512" r="295" />
        <circle cx="512" cy="512" r="144" />
      </g>
      <g className="radar-sweep">
        <line x1="516" y1="508" x2="845" y2="176" stroke="var(--radar-line, #7effc5)" strokeWidth="22" strokeLinecap="round" />
      </g>
      <circle cx="681" cy="441" r="37" fill="var(--radar-dot, #ffc850)" />
      <circle cx="317" cy="653" r="37" fill="var(--radar-dot, #ffc850)" />
    </svg>
  )
}

// Hersteller-Logos (MIT, aus Vedetta) – Substring-Match auf Vendor + Hostname
const LOGO_RULES = [
  [/avm|fritz/, 'fritz'], [/synology/, 'synology'], [/raspberry/, 'raspberrypi'],
  [/proxmox/, 'proxmox'], [/esphome/, 'esphome'], [/home assistant|nabu casa/, 'homeassistant'],
  [/apple/, 'apple'], [/samsung/, 'samsung'], [/huawei/, 'huawei'], [/xiaomi/, 'xiaomi'],
  [/tp-?link|tplink/, 'tplink'], [/ubiquiti|unifi/, 'ubiquiti'], [/mikrotik/, 'mikrotik'],
  [/netgear/, 'netgear'], [/asus/, 'asus'], [/dell/, 'dell'], [/lenovo/, 'lenovo'],
  [/sony/, 'sony'], [/\blg\b|lg electronics/, 'lg'], [/google/, 'google'], [/amazon/, 'amazon'],
  [/sonos/, 'sonos'], [/shelly/, 'shelly'], [/philips/, 'philipshue'], [/qnap/, 'qnap'],
  [/truenas|ixsystems/, 'truenas'], [/vmware/, 'vmware'], [/grafana/, 'grafana'],
  [/adguard/, 'adguard'], [/pi-?hole/, 'pihole'], [/zigbee2mqtt/, 'zigbee2mqtt'],
  [/node-?red/, 'nodered'], [/tasmota/, 'tasmota'], [/openwrt/, 'openwrt'],
  [/reolink/, 'reolink'], [/hikvision/, 'hikvision'], [/\baxis\b/, 'axis'],
  [/\bring\b/, 'ring'], [/roku/, 'roku'], [/razer/, 'razer'], [/\bjbl\b/, 'jbl'],
  [/\bbose\b/, 'bose'], [/epson/, 'epson'], [/hewlett|\bhp\b/, 'hp'], [/kyocera/, 'kyocera'],
  [/ricoh/, 'ricoh'], [/d-?link/, 'd-link'], [/netatmo/, 'netatmo'], [/tenda/, 'tenda'],
  [/cisco/, 'cisco'], [/acer/, 'acer'], [/\bmsi\b/, 'msi'], [/honor/, 'honor'],
  [/oneplus/, 'oneplus'], [/oppo/, 'oppo'], [/vivo/, 'vivo'], [/microsoft/, 'microsoft'],
  [/ikea/, 'ikea'],
]

export function logoFor(vendor, hostname) {
  const s = ((vendor || '') + ' ' + (hostname || '')).toLowerCase()
  for (const [re, name] of LOGO_RULES) if (re.test(s)) return name
  return null
}

export const TYPES = {
  router: { label: 'Router / Gateway', icon: 'router', color: '#29b6f6' },
  server: { label: 'Server', icon: 'server', color: '#7e57c2' },
  nas: { label: 'NAS', icon: 'nas', color: '#26a69a' },
  pc: { label: 'PC / Laptop', icon: 'laptop', color: '#5c6bc0' },
  phone: { label: 'Handy / Tablet', icon: 'cellphone', color: '#ff7043' },
  iot: { label: 'Kamera / IoT', icon: 'chip', color: '#66bb6a' },
  printer: { label: 'Drucker', icon: 'printer', color: '#8d6e63' },
  media: { label: 'Audio / TV', icon: 'speaker', color: '#ec407a' },
  generic: { label: 'Sonstige', icon: 'devices', color: '#78909c' },
}

export const TYPE_ORDER = ['router', 'server', 'nas', 'pc', 'phone', 'iot', 'printer', 'media', 'generic']

export function classify(d) {
  const v = (d.vendor || '').toLowerCase()
  const h = (d.hostname || '').toLowerCase()
  const role = (d.role || '').toLowerCase()
  const ports = (d.ports || []).map((p) => String(p.port))
  const has = (arr) => arr.some((p) => ports.includes(p))

  let type = 'generic'
  if (role.includes('proxmox')) type = 'server'
  else if (role.includes('router')) type = 'router'
  else if (role.includes('nas')) type = 'nas'
  else if (role.includes('kamera') || role.includes('iot')) type = 'iot'
  else if (role.includes('server')) type = 'server'
  else if (role.includes('windows')) type = 'pc'

  if (has(['8006']) || /proxmox/.test(v + h)) type = 'server'
  if (has(['9100', '515', '631']) || /printer|brother|epson|ricoh|kyocera|canon|hewlett|\bhp\b/.test(v)) type = 'printer'
  if (has(['554', '8554', '37777', '34567']) || /hikvision|reolink|axis|ring|camera/.test(v + h)) type = 'iot'
  if (/synology|qnap|truenas/.test(v) && has(['5000', '5001', '5005'])) type = 'nas'
  if (/sonos|bose|jbl|harman/.test(v + h)) type = 'media'
  if (/roku|amzn|fire tv|android tv/.test(v + h)) type = 'media'

  const logo = logoFor(d.vendor, d.hostname)
  return { type, label: TYPES[type].label, color: TYPES[type].color, icon: TYPES[type].icon, logo }
}