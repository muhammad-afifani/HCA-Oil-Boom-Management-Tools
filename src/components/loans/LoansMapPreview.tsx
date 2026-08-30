import { useMemo } from 'react'
import { MapContainer, Marker, Tooltip } from 'react-leaflet'
import { useStore } from '../../store/useStore'
import { BaseTileLayers } from '../map/BaseTileLayers'
import { posIcon, siteActiveIcon, siteIdleIcon, siteOverdueIcon, sitePendingIcon, warehouseIcon } from '../map/icons'
import { effectiveLoanStatus, isLoanOpen } from '../../lib/inventory'
import type { MapLocation } from '../../types'

/** Compact read-only map, shown beside the loans table so it's easy to see where every point is. */
export function LoansMapPreview() {
  const db = useStore((s) => s.db)

  const openLoansBySite = useMemo(() => {
    const map = new Map<string, typeof db.loans>()
    for (const loan of db.loans.filter(isLoanOpen)) {
      const arr = map.get(loan.siteLocationId) ?? []
      arr.push(loan)
      map.set(loan.siteLocationId, arr)
    }
    return map
  }, [db.loans])

  const iconForSite = (site: MapLocation) => {
    const loans = openLoansBySite.get(site.id) ?? []
    if (loans.length === 0) return siteIdleIcon
    if (loans.some((l) => effectiveLoanStatus(l) === 'Terlambat')) return siteOverdueIcon
    if (loans.some((l) => l.status === 'Aktif')) return siteActiveIcon
    return sitePendingIcon
  }

  const center: [number, number] = [db.settings.centerLat, db.settings.centerLng]

  return (
    <div className="flex h-full flex-col">
      <MapContainer center={center} zoom={10} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <BaseTileLayers />
        {db.locations.map((loc) =>
          loc.type === 'pos' ? (
            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={loc.isWarehouse ? warehouseIcon : posIcon}>
              <Tooltip direction="top" offset={[0, -4]}>{loc.name}</Tooltip>
            </Marker>
          ) : (
            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={iconForSite(loc)}>
              <Tooltip direction="top" offset={[0, -4]}>{loc.name}</Tooltip>
            </Marker>
          ),
        )}
      </MapContainer>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-600" /> Floating Storage</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-600" /> Gudang Pusat</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" /> Sedang dipakai</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Menunggu</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" /> Terlambat</span>
      </div>
    </div>
  )
}
