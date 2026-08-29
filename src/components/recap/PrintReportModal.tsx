import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Printer, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../ui/Button'
import { posIcon, siteIdleIcon } from '../map/icons'
import { effectiveLoanStatus, getLoanAllocations, loanStatusLabel } from '../../lib/inventory'
import { formatDateID } from '../../lib/date'
import type { LoanRequest } from '../../types'

function FitReportBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 12)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 13 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)])
  return null
}

export function PrintReportModal({ open, loan, onClose }: { open: boolean; loan?: LoanRequest; onClose: () => void }) {
  const db = useStore((s) => s.db)
  if (!loan) return null

  const site = db.locations.find((l) => l.id === loan.siteLocationId)
  const allocations = getLoanAllocations(loan)
  const allocatedPos = allocations.map((a) => ({
    pos: db.locations.find((l) => l.id === a.posId),
    quantityUnits: a.quantityUnits,
  }))
  const status = effectiveLoanStatus(loan)

  const mapPoints: [number, number][] = [
    ...(site ? [[site.lat, site.lng] as [number, number]] : []),
    ...allocatedPos.filter((a) => a.pos).map((a) => [a.pos!.lat, a.pos!.lng] as [number, number]),
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 py-8"
        >
          <div className="mx-auto max-w-3xl">
            <div className="no-print mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-white/90">Pratinjau Laporan — gunakan tombol Cetak untuk simpan sebagai PDF</span>
              <div className="flex gap-2">
                <Button onClick={onClose}><X size={15} /> Tutup</Button>
                <Button variant="primary" onClick={() => window.print()}><Printer size={15} /> Cetak / Simpan PDF</Button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="print-report rounded-2xl bg-white p-8 shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">{db.settings.companyName}</div>
                  <h1 className="mt-0.5 text-lg font-bold text-slate-800">Laporan Peminjaman Oil Boom</h1>
                  <div className="text-xs text-slate-500">{db.settings.siteName}</div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div className="text-sm font-semibold text-slate-700">{loan.requestNumber}</div>
                  <div>Dicetak: {formatDateID(new Date().toISOString().slice(0, 10))}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <ReportStat label="Status" value={loanStatusLabel(status)} />
                <ReportStat label="Prioritas" value={loan.priority} />
                <ReportStat label="Jumlah" value={`${loan.quantityUnits} unit (${loan.quantityUnits * loan.unitLengthMeters} m)`} />
                <ReportStat label="Disetujui Oleh" value={loan.approvedBy || '-'} />
              </div>

              <ReportSection title="Informasi Peminta">
                <ReportRow label="Nama" value={loan.requesterName} />
                <ReportRow label="Entity / Perusahaan" value={loan.entity} />
                <ReportRow label="Ext" value={loan.ext || '-'} />
                <ReportRow label="Email" value={loan.email || '-'} />
                <ReportRow label="Fungsi Pekerjaan" value={loan.boomFunction || '-'} />
                <ReportRow label="Deskripsi Pekerjaan" value={loan.workDescription || '-'} full />
              </ReportSection>

              <ReportSection title="Lokasi & Alokasi Boom">
                <ReportRow label="Lokasi Kerja" value={site ? `${site.name} (${site.type})` : '-'} />
                <ReportRow label="Koordinat Lokasi" value={site ? `${site.lat.toFixed(6)}, ${site.lng.toFixed(6)}` : '-'} />
                {allocatedPos.map((a, i) => (
                  <ReportRow key={i} label={i === 0 ? 'Pos Asal' : `Pos Tambahan ${i}`} value={a.pos ? `${a.pos.name} — ${a.quantityUnits} unit` : '-'} />
                ))}
              </ReportSection>

              {mapPoints.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200" style={{ height: 220 }}>
                  <MapContainer
                    center={mapPoints[0]}
                    zoom={12}
                    dragging={false}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                    attributionControl={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <FitReportBounds points={mapPoints} />
                    {site && <Marker position={[site.lat, site.lng]} icon={siteIdleIcon} />}
                    {allocatedPos.filter((a) => a.pos).map((a) => (
                      <Marker key={a.pos!.id} position={[a.pos!.lat, a.pos!.lng]} icon={posIcon} />
                    ))}
                  </MapContainer>
                </div>
              )}

              <ReportSection title="Jadwal">
                <ReportRow label="Tanggal Request" value={formatDateID(loan.requestDate)} />
                <ReportRow label="Tanggal Mulai" value={formatDateID(loan.startDate)} />
                <ReportRow label="Rencana Selesai" value={loan.endDateTBC || !loan.endDate ? 'TBC (belum ada info)' : formatDateID(loan.endDate)} />
                <ReportRow label="Tanggal Kembali Aktual" value={loan.actualReturnDate ? formatDateID(loan.actualReturnDate) : '-'} />
              </ReportSection>

              <ReportSection title="Dokumentasi Pemasangan">
                {loan.installedAt || loan.installedNotes || loan.installedPhotoDataUrl ? (
                  <>
                    <ReportRow label="Tanggal Terpasang" value={loan.installedAt ? formatDateID(loan.installedAt) : '-'} />
                    <ReportRow label="Catatan" value={loan.installedNotes || '-'} full />
                    {loan.installedPhotoDataUrl && (
                      <div className="col-span-2 mt-2">
                        <img
                          src={loan.installedPhotoDataUrl}
                          alt="Dokumentasi pemasangan"
                          className="max-h-72 w-full rounded-xl border border-slate-200 object-cover"
                          style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="col-span-2 text-xs italic text-slate-400">Belum ada update pemasangan.</p>
                )}
              </ReportSection>

              {loan.notes && (
                <ReportSection title="Catatan Tambahan">
                  <p className="col-span-2 text-sm text-slate-600">{loan.notes}</p>
                </ReportSection>
              )}

              <div className="mt-8 flex justify-between text-[10px] text-slate-300">
                <span>Dibuat otomatis oleh HCA Oil Boom Management Tools</span>
                <span>Halaman 1</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-teal-700">{title}</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">{children}</div>
    </div>
  )
}

function ReportRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  )
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-700">{value}</div>
    </div>
  )
}
