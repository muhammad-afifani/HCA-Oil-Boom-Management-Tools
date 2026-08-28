import { useMemo } from 'react'
import { Boxes, PackageCheck, AlertTriangle, MapPin, ClipboardList } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { StatCard } from '../ui/StatCard'
import { Card, CardHeader } from '../ui/Card'
import { Badge, loanStatusTone, priorityTone } from '../ui/Badge'
import { Button } from '../ui/Button'
import { effectiveLoanStatus, isLoanOpen, loanDaysRemaining, summarizeCompany, summarizePosStock } from '../../lib/inventory'
import { formatDateID, todayISO } from '../../lib/date'
import type { PageKey } from '../../App'

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const db = useStore((s) => s.db)

  const posList = useMemo(() => db.locations.filter((l) => l.type === 'pos'), [db.locations])
  const siteList = useMemo(() => db.locations.filter((l) => l.type !== 'pos'), [db.locations])

  const summary = useMemo(
    () => summarizeCompany(db.stockBatches, db.loans, posList.map((p) => p.id), siteList.length),
    [db.stockBatches, db.loans, posList, siteList],
  )

  const openLoans = useMemo(
    () =>
      db.loans
        .filter(isLoanOpen)
        .slice()
        .sort((a, b) => loanDaysRemaining(a) - loanDaysRemaining(b)),
    [db.loans],
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
        <StatCard label="Total Stok Boom" value={`${summary.totalUnits} unit`} sub={`${summary.totalMeters} m total`} icon={Boxes} tone="slate" />
        <StatCard label="Tersedia" value={`${summary.availableUnits} unit`} sub={`${summary.availableMeters} m siap pakai`} icon={PackageCheck} tone="teal" />
        <StatCard label="Sedang Dipinjam" value={`${summary.reservedUnits} unit`} sub={`${summary.activeLoans} pekerjaan aktif`} icon={ClipboardList} tone="blue" />
        <StatCard label="Terlambat Kembali" value={summary.overdueLoans} sub={`${summary.pendingLoans} menunggu approval`} icon={AlertTriangle} tone="red" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Prioritas Pengembalian"
            subtitle="Diurutkan dari yang paling dekat / sudah lewat tanggal rencana selesai"
            action={
              <Button size="sm" onClick={() => onNavigate('loans')}>
                Lihat semua
              </Button>
            }
          />
          <div className="divide-y divide-slate-100">
            {openLoans.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Belum ada peminjaman aktif.</div>
            )}
            {openLoans.slice(0, 7).map((loan) => {
              const site = db.locations.find((l) => l.id === loan.siteLocationId)
              const days = loanDaysRemaining(loan)
              const status = effectiveLoanStatus(loan)
              return (
                <div key={loan.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
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
                </div>
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
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${stock.usableUnits ? (stock.availableUnits / stock.usableUnits) * 100 : 0}%` }}
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
