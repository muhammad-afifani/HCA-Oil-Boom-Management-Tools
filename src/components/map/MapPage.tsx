import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl } from 'react-leaflet'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Badge, loanStatusTone } from '../ui/Badge'
import { posIcon, siteActiveIcon, siteIdleIcon, siteOverdueIcon, sitePendingIcon } from './icons'
import { effectiveLoanStatus, isLoanOpen, loanDaysRemaining, summarizePosStock } from '../../lib/inventory'
import { formatDateID } from '../../lib/date'
import type { MapLocation } from '../../types'
import { Boxes, MapPinned, PackageCheck } from 'lucide-react'

export function MapPage() {
  const db = useStore((s) => s.db)
  const [showPos, setShowPos] = useState(true)
  const [showSites, setShowSites] = useState(true)

  const posList = useMemo(() => db.locations.filter((l) => l.type === 'pos'), [db.locations])
  const siteList = useMemo(() => db.locations.filter((l) => l.type !== 'pos'), [db.locations])

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
      <Header title="Peta Lokasi Oil Boom" subtitle="Titik pos penyimpanan dan lokasi kerja (sumur/platform/cluster) di area HCA Site." />

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showPos} onChange={(e) => setShowPos(e.target.checked)} className="accent-teal-600" />
          <span className="flex h-3 w-3 rounded-full bg-teal-600" /> Pos Penyimpanan ({posList.length})
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showSites} onChange={(e) => setShowSites(e.target.checked)} className="accent-teal-600" />
          <span className="flex h-3 w-3 rounded-full bg-slate-500" /> Lokasi Kerja ({siteList.length})
        </label>
        <span className="flex items-center gap-1 text-xs text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Sedang dipakai</span>
        <span className="flex items-center gap-1 text-xs text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Menunggu approval</span>
        <span className="flex items-center gap-1 text-xs text-slate-400"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Terlambat kembali</span>
      </div>

      <Card className="h-[520px] overflow-hidden md:h-[640px]">
        <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Peta Jalan (OSM)">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Citra Satelit (Esri)">
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <Circle
            center={center}
            radius={12000}
            pathOptions={{ color: '#0d9488', dashArray: '6 6', fillOpacity: 0.03, weight: 1.5 }}
          />

          {showPos &&
            posList.map((pos) => {
              const stock = summarizePosStock(db.stockBatches, db.loans, pos.id)
              return (
                <Marker key={pos.id} position={[pos.lat, pos.lng]} icon={posIcon}>
                  <Popup>
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <Boxes size={15} className="text-teal-600" /> {pos.name}
                      </div>
                      <div className="text-xs text-slate-400">{pos.code} &middot; {pos.area}</div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-teal-50 px-2 py-1.5">
                          <div className="font-semibold text-teal-700">{stock.availableUnits} unit</div>
                          <div className="text-teal-600/70">Tersedia ({stock.availableMeters} m)</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                          <div className="font-semibold text-slate-700">{stock.totalUnits} unit</div>
                          <div className="text-slate-500">Total stok</div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                        <Badge tone="green">{stock.baikUnits} Baik</Badge>
                        {stock.rusakRinganUnits > 0 && <Badge tone="amber">{stock.rusakRinganUnits} Rusak Ringan</Badge>}
                        {stock.rusakBeratUnits > 0 && <Badge tone="red">{stock.rusakBeratUnits} Rusak Berat</Badge>}
                        {stock.reservedUnits > 0 && <Badge tone="blue">{stock.reservedUnits} sedang dipinjam</Badge>}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

          {showSites &&
            siteList.map((site) => {
              const loans = (openLoansBySite.get(site.id) ?? []).slice().sort((a, b) => loanDaysRemaining(a) - loanDaysRemaining(b))
              return (
                <Marker key={site.id} position={[site.lat, site.lng]} icon={iconForSite(site)}>
                  <Popup>
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <MapPinned size={15} className="text-slate-500" /> {site.name}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">{site.type} &middot; {site.code} &middot; {site.area}</div>
                      {loans.length === 0 && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-500">
                          <PackageCheck size={13} /> Tidak ada boom yang sedang dipinjam di lokasi ini.
                        </div>
                      )}
                      <div className="mt-2 space-y-2">
                        {loans.map((loan) => {
                          const status = effectiveLoanStatus(loan)
                          const days = loanDaysRemaining(loan)
                          const pos = db.locations.find((l) => l.id === loan.sourcePosId)
                          return (
                            <div key={loan.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700">{loan.requesterName}</span>
                                <Badge tone={loanStatusTone(status)}>{status}</Badge>
                              </div>
                              <div className="text-slate-500">{loan.entity} &middot; Ext {loan.ext}</div>
                              <div className="text-slate-500">Fungsi: {loan.boomFunction}</div>
                              <div className="text-slate-500">{loan.quantityUnits} unit dari {pos?.name}</div>
                              <div className="mt-1 flex items-center justify-between text-slate-400">
                                <span>{formatDateID(loan.startDate)} - {formatDateID(loan.endDate)}</span>
                                <span className={days < 0 ? 'font-semibold text-red-600' : ''}>
                                  {days < 0 ? `Lewat ${Math.abs(days)}h` : `${days}h lagi`}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
        </MapContainer>
      </Card>
    </div>
  )
}
