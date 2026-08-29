import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { MousePointerClick } from 'lucide-react'
import { pickerIcon } from '../map/icons'
import type { MapLocation } from '../../types'

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    map.setView([lat, lng], map.getZoom(), { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])
  return null
}

export function LocationMapPicker({
  lat,
  lng,
  onChange,
  contextLocations,
  height = 260,
}: {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  contextLocations: MapLocation[]
  height?: number
}) {
  const safeLat = Number.isFinite(lat) ? lat : 0
  const safeLng = Number.isFinite(lng) ? lng : 0

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
        <MousePointerClick size={13} /> Klik di peta atau geser pin ungu untuk memilih titik koordinat
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
        <MapContainer center={[safeLat, safeLng]} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onPick={onChange} />
          <Recenter lat={safeLat} lng={safeLng} />

          {contextLocations.map((loc) => (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={5}
              pathOptions={{
                color: loc.type === 'pos' ? '#0d9488' : '#64748b',
                fillColor: loc.type === 'pos' ? '#0d9488' : '#64748b',
                fillOpacity: 0.75,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {loc.name} {loc.type === 'pos' ? '(Pos)' : ''}
              </Tooltip>
            </CircleMarker>
          ))}

          <Marker
            position={[safeLat, safeLng]}
            draggable
            icon={pickerIcon}
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng()
                onChange(pos.lat, pos.lng)
              },
            }}
          />
        </MapContainer>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-600" /> Pos</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" /> Lokasi kerja lain</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-600" /> Titik terpilih</span>
      </div>
    </div>
  )
}
