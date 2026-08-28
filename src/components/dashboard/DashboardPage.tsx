import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Boxes, PackageCheck, AlertTriangle, MapPin, ClipboardList } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { StatCard } from '../ui/StatCard'
import { Card, CardHeader } from '../ui/Card'
import { Badge, loanStatusTone, priorityTone } from '../ui/Badge'
import { Button } from '../ui/Button'
import { effectiveLoanStatus, loanDaysRemaining, summarizeCompany, summarizePosStock } from '../../lib/inventory'
import { resolveOrderedLoans } from '../../lib/priority'
import { formatDateID, todayISO } from '../../lib/date'
import type { PageKey } from '../../App'

const RANK_COLOR: Record<string, string> = {
  Terlambat: 'bg-red-600',
  Aktif: 'bg-blue-600',
  Disetujui: 'bg-teal-600',
  Pending: 'bg-amber-500',
}

const EMPTY_ORDER: string[] = []

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const db = useStore((s) => s.db)

  const posList = useMemo(() => db.locations.filter((l) => l.type === 'pos'), [db.locations])
  const siteList = useMemo(() => db.locations.filter((l) => l.type !== 'pos'), [db.locations])

  const summary = useMemo(
    () => summarizeCompany(db.stockBatches, db.loans, posList.map((p) => p.id), siteList.length),
    [db.stockBatches, db.loans, posList, siteList],
  )

  const rankedLoans = useMemo(
    () => resolveOrderedLoans(db.loans, db.priorityMode ?? 'auto', db.priorityOrder ?? EMPTY_ORDER),
    [db.loans, db.priorityMode, db.priorityOrder],
  )

  const posSummaries = useMemo(
    () => posList.map((p) => ({ pos: p, stock: summarizePosStock(db.stockBatches, db.loans, p.id) })),
    [posList, db.stockBatches, db.loans],
  )

  return (
    <div>
      <Header
        title={`Dashboard - ${db.settings.siteName}`}
        subtitle="Ringkasan stok oil boom, pos penyimpanan, dan status peminjaman saat ini."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Stok Boom" value={summary.totalUnits} suffix=" unit" sub={`${summary.totalMeters} m total`} icon={Boxes} tone="slate" />
        <StatCard label="Tersedia" value={summary.availableUnits} suffix=" unit" sub={`${summary.availableMeters} m siap pakai`} icon={PackageCheck} tone="teal" />
        <StatCard label="Sedang Dipinjam" value={summary.reservedUnits} suffix=" unit" sub={`${summary.activeLoans} pekerjaan aktif`} icon={ClipboardList} tone="blue" />
        <StatCard label="Terlambat Kembali" value={summary.overdueLoans} sub={`${summary.pendingLoans} menunggu approval`} icon={AlertTriangle} tone="red" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Prioritas Peminjaman"
            subtitle="Rangking #1 = paling perlu ditindaklanjuti/dikembalikan dulu"
            action={
              <Button size="sm" onClick={() => onNavigate('priority')}>
                Lihat semua &amp; atur manual
              </Button>
            }
          />
          <div className="divide-y divide-slate-100">
            {rankedLoans.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Belum ada peminjaman aktif.</div>
            )}
            {rankedLoans.slice(0, 7).map((loan, idx) => {
              const site = db.locations.find((l) => l.id === loan.siteLocationId)
              const days = loanDaysRemaining(loan)
              const status = effectiveLoanStatus(loan)
              return (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03, ease: 'easeOut' }}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${RANK_COLOR[status] ?? 'bg-slate-400'}`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{loan.requesterName}</span>
                      <Badge tone={priorityTone(loan.priority)}>{loan.priority}</Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      <MapPin size={12} /> {site?.name ?? '-'} &middot; {loan.entity}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={loanStatusTone(status)}>{status}</Badge>
                    <span className={`text-xs ${days < 0 ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
                      {days < 0 ? `Lewat ${Math.abs(days)} hari` : days === 0 ? 'Selesai hari ini' : `${days} hari lagi`}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Stok per Pos"
            subtitle="Ketersediaan boom di tiap titik penyimpanan"
            action={
              <Button size="sm" onClick={() => onNavigate('map')}>
                Lihat peta
              </Button>
            }
          />
          <div className="divide-y divide-slate-100">
            {posSummaries.map(({ pos, stock }) => (
              <div key={pos.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{pos.name}</span>
                  <span className="text-sm font-semibold text-teal-600">{stock.availableUnits}/{stock.usableUnits}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className="h-full rounded-full bg-teal-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${stock.usableUnits ? (stock.availableUnits / stock.usableUnits) * 100 : 0}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {stock.availableMeters} m tersedia &middot; {stock.rusakBeratUnits > 0 ? `${stock.rusakBeratUnits} unit rusak berat` : 'kondisi terpantau'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Riwayat Permintaan Terbaru" subtitle={`Hari ini: ${formatDateID(todayISO())}`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">No Permintaan</th>
                <th className="px-5 py-2.5 font-medium">Peminta / Entity</th>
                <th className="px-5 py-2.5 font-medium">Lokasi Kerja</th>
                <th className="px-5 py-2.5 font-medium">Periode</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.loans
                .slice()
                .sort((a, b) => (a.requestDate < b.requestDate ? 1 : -1))
                .slice(0, 6)
                .map((loan) => {
                  const site = db.locations.find((l) => l.id === loan.siteLocationId)
                  const status = effectiveLoanStatus(loan)
                  return (
                    <tr key={loan.id}>
                      <td className="px-5 py-2.5 font-medium text-slate-700">{loan.requestNumber}</td>
                      <td className="px-5 py-2.5 text-slate-600">
                        {loan.requesterName}
                        <div className="text-xs text-slate-400">{loan.entity}</div>
                      </td>
                      <td className="px-5 py-2.5 text-slate-600">{site?.name ?? '-'}</td>
                      <td className="px-5 py-2.5 text-slate-500">{formatDateID(loan.startDate)} - {formatDateID(loan.endDate)}</td>
                      <td className="px-5 py-2.5">
                        <Badge tone={loanStatusTone(status)}>{status}</Badge>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
