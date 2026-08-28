import L from 'leaflet'

export type MarkerTone = 'teal' | 'slate' | 'blue' | 'red' | 'amber'

const toneHex: Record<MarkerTone, string> = {
  teal: '#0d9488',
  slate: '#64748b',
  blue: '#2563eb',
  red: '#dc2626',
  amber: '#d97706',
}

export function makeDivIcon(tone: MarkerTone, glyph: 'pos' | 'site', size = 30): L.DivIcon {
  const color = toneHex[tone]
  const inner =
    glyph === 'pos'
      ? '<rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>'
      : '<circle cx="12" cy="12" r="4.5" fill="white"/>'
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 24 30" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 18 12 18s12-9.6 12-18C24 5.4 18.6 0 12 0z" fill="${color}"/>
        ${inner}
      </svg>
    </div>`
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size * 1.25],
    iconAnchor: [size / 2, size * 1.2],
    popupAnchor: [0, -size],
  })
}

export const posIcon = makeDivIcon('teal', 'pos')
export const siteIdleIcon = makeDivIcon('slate', 'site')
export const siteActiveIcon = makeDivIcon('blue', 'site')
export const siteOverdueIcon = makeDivIcon('red', 'site')
export const sitePendingIcon = makeDivIcon('amber', 'site')
