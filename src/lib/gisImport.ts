// Parses common GIS export formats (GeoJSON, CSV, KML) into simple name+coordinate points,
// so wells/platforms/clusters exported from an external GIS portal (ArcGIS, QGIS, etc.) can be
// brought into this app without needing direct API access to that system.

export interface ParsedGisPoint {
  name: string
  lat: number
  lng: number
  code?: string
}

export interface GisParseResult {
  points: ParsedGisPoint[]
  warnings: string[]
}

const NAME_KEYS = ['name', 'nama', 'well_name', 'wellname', 'site_name', 'sitename', 'label', 'title', 'well', 'nama_sumur', 'facility', 'facility_name']
const CODE_KEYS = ['code', 'kode', 'id', 'well_id', 'uwi', 'api']

function pickProp(props: Record<string, unknown>, keys: string[]): string | undefined {
  const entries = Object.entries(props)
  for (const key of keys) {
    const hit = entries.find(([k]) => k.toLowerCase().replace(/[\s_-]/g, '') === key.replace(/[\s_-]/g, ''))
    if (hit && hit[1] != null && String(hit[1]).trim()) return String(hit[1]).trim()
  }
  return undefined
}

export function parseGeoJSON(text: string): GisParseResult {
  const warnings: string[] = []
  const points: ParsedGisPoint[] = []
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('File GeoJSON tidak valid (gagal di-parse sebagai JSON)')
  }
  const features = json.type === 'FeatureCollection' ? json.features : json.type === 'Feature' ? [json] : []
  if (!Array.isArray(features) || features.length === 0) {
    throw new Error('Tidak ditemukan "features" pada file GeoJSON. Pastikan formatnya FeatureCollection.')
  }
  features.forEach((f: any, i: number) => {
    const geom = f.geometry
    if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) {
      warnings.push(`Fitur #${i + 1}: dilewati (bukan geometry Point, cth. Polygon/LineString tidak didukung untuk titik lokasi)`)
      return
    }
    const [lng, lat] = geom.coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      warnings.push(`Fitur #${i + 1}: koordinat tidak valid, dilewati`)
      return
    }
    const props = f.properties ?? {}
    const name = pickProp(props, NAME_KEYS) ?? `Titik ${i + 1}`
    const code = pickProp(props, CODE_KEYS)
    points.push({ name, lat, lng, code })
  })
  return { points, warnings }
}

function splitCsvLine(line: string): string[] {
  // Minimal CSV split with quoted-field support (handles simple exports; not a full RFC4180 parser).
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      cells.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

export function parseCSV(text: string): GisParseResult {
  const warnings: string[] = []
  const points: ParsedGisPoint[] = []
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('File CSV kosong atau tidak punya baris data.')

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const findCol = (keys: string[]) => header.findIndex((h) => keys.includes(h.replace(/[\s_-]/g, '')))

  const latIdx = findCol(['lat', 'latitude', 'y'])
  const lngIdx = findCol(['lon', 'lng', 'long', 'longitude', 'x'])
  const nameIdx = findCol(NAME_KEYS.map((k) => k.replace(/[\s_-]/g, '')))
  const codeIdx = findCol(CODE_KEYS.map((k) => k.replace(/[\s_-]/g, '')))

  if (latIdx === -1 || lngIdx === -1) {
    throw new Error('Kolom Latitude/Longitude tidak ditemukan di header CSV. Pastikan ada kolom "lat"/"latitude" dan "lon"/"longitude".')
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const lat = Number(cells[latIdx])
    const lng = Number(cells[lngIdx])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      warnings.push(`Baris ${i + 1}: koordinat tidak valid, dilewati`)
      continue
    }
    const name = nameIdx !== -1 ? cells[nameIdx]?.trim() : ''
    points.push({ name: name || `Titik ${i}`, lat, lng, code: codeIdx !== -1 ? cells[codeIdx]?.trim() : undefined })
  }
  return { points, warnings }
}

export function parseKML(text: string): GisParseResult {
  const warnings: string[] = []
  const points: ParsedGisPoint[] = []
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('File KML tidak valid (gagal di-parse sebagai XML).')

  const placemarks = Array.from(doc.getElementsByTagName('Placemark'))
  if (placemarks.length === 0) throw new Error('Tidak ditemukan elemen <Placemark> pada file KML.')

  placemarks.forEach((pm, i) => {
    const coordsEl = pm.getElementsByTagName('coordinates')[0]
    if (!coordsEl?.textContent) {
      warnings.push(`Placemark #${i + 1}: tidak punya <coordinates>, dilewati`)
      return
    }
    const [lngStr, latStr] = coordsEl.textContent.trim().split(',')
    const lat = Number(latStr)
    const lng = Number(lngStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      warnings.push(`Placemark #${i + 1}: koordinat tidak valid, dilewati`)
      return
    }
    const name = pm.getElementsByTagName('name')[0]?.textContent?.trim() || `Titik ${i + 1}`
    points.push({ name, lat, lng })
  })
  return { points, warnings }
}

export function parseGisFile(filename: string, text: string): GisParseResult {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.kml')) return parseKML(text)
  if (lower.endsWith('.csv')) return parseCSV(text)
  if (lower.endsWith('.geojson') || lower.endsWith('.json')) return parseGeoJSON(text)
  throw new Error('Format file tidak dikenali. Gunakan .geojson, .kml, atau .csv.')
}
