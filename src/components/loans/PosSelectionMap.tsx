import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { makeDivIcon } from '../map/icons'
import type { PosOption, StandbyOption } from '../../lib/nearestPos'
import type { MapLocation } from '../../types'

const sitePickIcon = makeDivIcon('slate', 'site', 30)
const posPrimaryIcon = makeDivIcon('violet', 'pos', 34)
const posAdditionalIcon = makeDivIcon('blue', 'pos', 30)
const posDefaultIcon = makeDivIcon('teal', 'pos', 26)
const standbyPrimaryIcon = makeDivIcon('violet', 'site', 34)
const standbyAdditionalIcon = makeDivIcon('blue', 'site', 30)
const standbyDefaultIcon = makeDivIcon('amber', 'site', 26)

function FitToMarkers({ site, posOptions, standbyOptions }: { site: MapLocation; posOptions: PosOption[]; standbyOptions: StandbyOption[] }) {
  const map = useMap()
  useEffect(() => {
    const points: [number, number][] = [
      [site.lat, site.lng],
      ...posOptions.map((o) => [o.pos.lat, o.pos.lng] as [number, number]),
      ...standbyOptions.map((o) => [o.site.lat, o.site.lng] as [number, number]),
    ]
    if (points.length === 0) return
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id, posOptions.length, standbyOptions.length])
  return null
}

export function PosSelectionMap({
  site,
  posOptions,
  standbyOptions = [],
  primaryPosId,
  additionalPosIds,
  onSelectPrimary,
  height = 240,
}: {
  site: MapLocation
  posOptions: PosOption[]
  standbyOptions?: StandbyOption[]
  primaryPosId: string
  additionalPosIds: string[]
  onSelectPrimary: (posId: string) => void
  height?: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
      <MapContainer center={[site.lat, site.lng]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToMarkers site={site} posOptions={posOptions} standbyOptions={standbyOptions} />

        <CircleMarker center={[site.lat, site.lng]} radius={5} pathOptions={{ color: '#64748b', fillColor: '#64748b', fillOpacity: 0.9, weight: 1.5 }}>
          <Tooltip direction="top" offset={[0, -4]} permanent>{site.name}</Tooltip>
        </CircleMarker>
        <Marker position={[site.lat, site.lng]} icon={sitePickIcon} />

        {posOptions.map((opt) => {
          const isPrimary = opt.pos.id === primaryPosId
          const isAdditional = additionalPosIds.includes(opt.pos.id)
          const icon = isPrimary ? posPrimaryIcon : isAdditional ? posAdditionalIcon : posDefaultIcon
          return (
            <Marker
              key={opt.pos.id}
              position={[opt.pos.lat, opt.pos.lng]}
              icon={icon}
              eventHandlers={{ click: () => onSelectPrimary(opt.pos.id) }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {opt.pos.name} &middot; {opt.stock.availableUnits} unit tersedia
              </Tooltip>
            </Marker>
          )
        })}

        {standbyOptions.map((opt) => {
          const isPrimary = opt.site.id === primaryPosId
          const isAdditional = additionalPosIds.includes(opt.site.id)
          const icon = isPrimary ? standbyPrimaryIcon : isAdditional ? standbyAdditionalIcon : standbyDefaultIcon
          return (
            <Marker
              key={opt.site.id}
              position={[opt.site.lat, opt.site.lng]}
              icon={icon}
              eventHandlers={{ click: () => onSelectPrimary(opt.site.id) }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {opt.site.name} (Standby) &middot; {opt.availableUnits} unit siap ambil
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
