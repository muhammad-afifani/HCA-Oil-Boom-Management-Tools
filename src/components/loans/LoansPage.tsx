import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, Pencil, Trash2, CheckCircle2, PackageCheck, XCircle, ArrowUpDown, Layers, PackageOpen, PauseCircle, ListChecks } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { ActionButton } from '../ui/ActionButton'
import { StatCard } from '../ui/StatCard'
import { Badge, loanStatusTone, priorityTone } from '../ui/Badge'
import { inputClass } from '../ui/Field'
import { effectiveLoanStatus, loanDaysRemaining, loanStatusLabel, summarizePosStock } from '../../lib/inventory'
import { getAllStandbySupply } from '../../lib/standby'
import { formatDateID, planDurationDays, todayISO } from '../../lib/date'
import { LoanFormModal } from './LoanFormModal'
import { UsageTimeline } from './UsageTimeline'
import { LoansMapPreview } from './LoansMapPreview'
import type { LoanRequest, LoanStatus } from '../../types'

type SortKey = 'endDate' | 'requestDate' | 'startDate'

const statusFilters: (LoanStatus | 'Terlambat' | 'Semua')[] = ['Semua', 'Pending', 'Disetujui', 'Aktif', 'Terlambat', 'Selesai', 'Dibatalkan']

/** Row background tint matching each status's badge color — pulses gently for statuses needing attention. */
function rowToneClass(status: LoanStatus | 'Terlambat'): string {
  switch (status) {
    case 'Aktif':
      return 'bg-blue-50/40 row-pulse-blue'
    case 'Terlambat':
      return 'bg-red-50/50 row-pulse-red'
    case 'Pending':
      return 'bg-amber-50/30'
    case 'Disetujui':
      return 'bg-teal-50/25'
    case 'Selesai':
      return 'bg-emerald-50/20'
    case 'Dibatalkan':
      return 'bg-slate-50/60 opacity-70'
    default:
      return ''
  }
}

export function LoansPage() {
  const db = useStore((s) => s.db)
  const updateLoan = useStore((s) => s.updateLoan)
  const deleteLoan = useStore((s) => s.deleteLoan)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>('Semua')
  const [sortKey, setSortKey] = useState<SortKey>('endDate')
  const [modalState, setModalState] = useState<{ open: boolean; loan?: LoanRequest }>({ open: false })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [returnChoiceFor, setReturnChoiceFor] = useState<LoanRequest | null>(null)

  // Table header sticks right below the toolbar — measure it so the offset stays correct
  // even if the toolbar wraps to two lines on narrow screens.
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [toolbarHeight, setToolbarHeight] = useState(0)
  useEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    // getBoundingClientRect (not ResizeObserver's contentRect, which excludes padding) gives the
    // toolbar's true rendered height so the header sits flush below it with no overlap or gap.
    const ro = new ResizeObserver(() => setToolbarHeight(el.getBoundingClientRect().height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const posList = useMemo(() => db.locations.filter((l) => l.type === 'pos'), [db.locations])
  const summary = useMemo(() => {
    const inUse = db.loans.filter((l) => l.status === 'Aktif').reduce((s, l) => s + l.quantityUnits, 0)
    const posAvailable = posList.reduce((s, p) => s + summarizePosStock(db.stockBatches, db.loans, p.id).availableUnits, 0)
    const standby = getAllStandbySupply(db.loans, db.locations)
    const standbyUnits = standby.reduce((s, x) => s + x.availableUnits, 0)
    const selesaiCount = db.loans.filter((l) => l.status === 'Selesai').length
    const totalStockUnits = posList.reduce((s, p) => s + summarizePosStock(db.stockBatches, db.loans, p.id).usableUnits, 0)
    return { inUse, posAvailable, standbyUnits, standbySites: standby.length, selesaiCount, totalStockUnits }
  }, [db.loans, db.locations, db.stockBatches, posList])

  const filtered = useMemo(() => {
    let list = db.loans.slice()
    if (statusFilter !== 'Semua') {
      list = list.filter((l) => effectiveLoanStatus(l) === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((l) => {
        const site = db.locations.find((s) => s.id === l.siteLocationId)
        return (
          l.requesterName.toLowerCase().includes(q) ||
          l.entity.toLowerCase().includes(q) ||
          l.requestNumber.toLowerCase().includes(q) ||
          l.boomFunction.toLowerCase().includes(q) ||
          site?.name.toLowerCase().includes(q)
        )
      })
    }
    list.sort((a, b) => (a[sortKey] < b[sortKey] ? -1 : 1))
    return list
  }, [db.loans, db.locations, search, statusFilter, sortKey])

  const quickApprove = (loan: LoanRequest) => updateLoan(loan.id, { status: 'Disetujui' })
  const quickActivate = (loan: LoanRequest) => updateLoan(loan.id, { status: 'Aktif' })
  const confirmReturn = (loan: LoanRequest, returnedTo: 'pos' | 'standby') => {
    updateLoan(loan.id, { status: 'Selesai', actualReturnDate: todayISO(), returnedTo })
    setReturnChoiceFor(null)
  }
  const quickCancel = (loan: LoanRequest) => updateLoan(loan.id, { status: 'Dibatalkan' })

  return (
    <div>
      <Header title="Peminjaman Oil Boom" subtitle="Kelola permintaan, status, dan prioritas pengembalian oil boom." />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Sedang Digunakan" value={summary.inUse} suffix=" unit" icon={PackageOpen} tone="blue" />
        <StatCard label="Tersedia (Floating Storage + Standby)" value={summary.posAvailable + summary.standbyUnits} suffix=" unit" icon={Layers} tone="teal" />
        <StatCard label="Standby di Lokasi Kerja" value={summary.standbyUnits} suffix=" unit" sub={`di ${summary.standbySites} lokasi`} icon={PauseCircle} tone="amber" />
        <StatCard label="Selesai Digunakan" value={summary.selesaiCount} suffix=" permintaan" icon={ListChecks} tone="slate" />
      </div>

      <div className="mb-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-x-auto p-4">
          <div className="mb-2 text-xs font-semibold text-slate-600">Kepadatan Pemakaian Boom — {`${summary.totalStockUnits}`} unit dalam 42 hari ke depan</div>
          <UsageTimeline loans={db.loans} totalStockUnits={summary.totalStockUnits} />
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600">Peta Lokasi</div>
          <div style={{ height: 420 }}>
            <LoansMapPreview />
          </div>
        </Card>
      </div>

      <div ref={toolbarRef} className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 py-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari peminta, entity, no. permintaan..."
            className={`${inputClass} w-72 pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={`${inputClass} w-auto`}>
          {statusFilters.map((s) => (
            <option key={s} value={s}>
              {s === 'Semua' ? s : loanStatusLabel(s)}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortKey((k) => (k === 'endDate' ? 'requestDate' : k === 'requestDate' ? 'startDate' : 'endDate'))}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowUpDown size={13} />
          Urut: {sortKey === 'endDate' ? 'Tgl Selesai' : sortKey === 'requestDate' ? 'Tgl Request' : 'Tgl Mulai'}
        </button>
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setModalState({ open: true })}>
          <Plus size={15} /> Permintaan Baru
        </Button>
      </div>

      <Card>
        <table className="w-full min-w-[1220px] table-fixed text-left text-sm">
          <thead className="sticky z-10" style={{ top: toolbarHeight }}>
            <tr className="text-xs uppercase tracking-wide text-slate-400">
              <th className="rounded-tl-2xl w-[180px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium">No / Peminta</th>
              <th className="w-[190px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium">Fungsi &amp; Pekerjaan</th>
              <th className="w-[120px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium">Lokasi Kerja</th>
              <th className="w-[140px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium">Dipindah / Diambil Dari</th>
              <th className="w-[80px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium">Jumlah</th>
              <th className="w-[200px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium">Periode</th>
              <th className="w-[110px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium">Status</th>
              <th className="rounded-tr-2xl w-[180px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
              {filtered.map((loan) => {
                const site = db.locations.find((l) => l.id === loan.siteLocationId)
                const pos = db.locations.find((l) => l.id === loan.sourcePosId)
                const status = effectiveLoanStatus(loan)
                const days = loanDaysRemaining(loan)
                const duration = loan.endDateTBC || !loan.endDate ? null : planDurationDays(loan.startDate, loan.endDate)
                return (
                  <tr key={loan.id} className={`align-top transition-[filter] hover:brightness-[0.97] ${rowToneClass(status)}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{loan.requestNumber}</div>
                      <div className="truncate text-xs text-slate-500">{loan.requesterName}</div>
                      <div className="truncate text-xs text-slate-400">{loan.entity} &middot; Ext {loan.ext || '-'}</div>
                      {loan.email && <div className="truncate text-xs text-slate-400">{loan.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate text-slate-700">{loan.boomFunction}</div>
                      <div className="truncate text-xs text-slate-400" title={loan.workDescription}>{loan.workDescription}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="truncate">{site?.name ?? '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="truncate">{pos?.name ?? '-'}</div>
                      {(loan.additionalSources?.length ?? 0) > 0 && (
                        <div className="text-xs text-teal-600">+{loan.additionalSources!.length} Floating Storage lain</div>
                      )}
                      {loan.status === 'Selesai' && loan.returnedTo === 'standby' && (
                        <div className="mt-1"><Badge tone="amber">Standby di lokasi</Badge></div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {loan.quantityUnits} unit
                      <div className="text-xs text-slate-400">{loan.quantityUnits * loan.unitLengthMeters} m</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-wrap items-baseline gap-x-1 text-sm">
                        <span>{formatDateID(loan.startDate)}</span>
                        <span className="text-slate-300">&rarr;</span>
                        {loan.endDateTBC || !loan.endDate ? (
                          <span className="font-medium text-amber-600">TBC</span>
                        ) : (
                          <span>{formatDateID(loan.endDate)}</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {duration !== null ? `${duration} hari` : 'durasi belum pasti'}
                      </div>
                      {loan.status === 'Aktif' && (
                        <div
                          className={`mt-1 text-xs font-semibold ${
                            days !== null && days < 0 ? 'text-red-600' : days !== null && days <= 2 ? 'text-amber-600' : 'text-slate-500'
                          }`}
                        >
                          {days === null ? 'Sisa: TBC' : days < 0 ? `Lewat ${Math.abs(days)} hari` : `Sisa ${days} hari`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={loanStatusTone(status)}>{loanStatusLabel(status)}</Badge>
                      {loan.priority !== 'Normal' && (
                        <div className="mt-1">
                          <Badge tone={priorityTone(loan.priority)}>{loan.priority}</Badge>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap items-center justify-end gap-1">
                        {loan.status === 'Pending' && (
                          <ActionButton icon={CheckCircle2} label="Setujui" tone="teal" onClick={() => quickApprove(loan)} />
                        )}
                        {loan.status === 'Disetujui' && (
                          <ActionButton
                            icon={PackageCheck}
                            label="Dipakai"
                            title="Tandai sedang dipakai (boom sudah diambil)"
                            tone="blue"
                            onClick={() => quickActivate(loan)}
                          />
                        )}
                        {loan.status === 'Aktif' && (
                          <ActionButton
                            icon={PackageCheck}
                            label="Selesai"
                            title="Tandai selesai / boom dikembalikan"
                            tone="emerald"
                            onClick={() => setReturnChoiceFor(loan)}
                          />
                        )}
                        {(loan.status === 'Pending' || loan.status === 'Disetujui') && (
                          <ActionButton icon={XCircle} label="Batalkan" title="Batalkan" tone="slate" iconOnly onClick={() => quickCancel(loan)} />
                        )}
                        <ActionButton icon={Pencil} label="Edit" title="Edit" tone="slate" iconOnly onClick={() => setModalState({ open: true, loan })} />
                        <ActionButton icon={Trash2} label="Hapus" title="Hapus" tone="red" iconOnly onClick={() => setConfirmDelete(loan.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    Tidak ada data peminjaman yang cocok.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </Card>

      <LoanFormModal open={modalState.open} loan={modalState.loan} onClose={() => setModalState({ open: false })} />

      {returnChoiceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-800">Setelah selesai, boom-nya kemana?</h3>
            <p className="mt-1 text-xs text-slate-500">
              {returnChoiceFor.quantityUnits} unit dari <b>{returnChoiceFor.requestNumber}</b> — pilih salah satu untuk menandai selesai.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => confirmReturn(returnChoiceFor, 'pos')}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50"
              >
                Dikembalikan ke Floating Storage
                <div className="text-xs font-normal text-slate-400">Boom dibawa kembali dan masuk ke stok Floating Storage asal.</div>
              </button>
              <button
                onClick={() => confirmReturn(returnChoiceFor, 'standby')}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
              >
                Standby di Lokasi Kerja
                <div className="text-xs font-normal text-slate-400">Ditinggal di lokasi kerja dan siap diambil langsung untuk permintaan berikutnya.</div>
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={() => setReturnChoiceFor(null)}>Batal</Button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-800">Hapus permintaan ini?</h3>
            <p className="mt-1 text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" onClick={() => setConfirmDelete(null)}>Batal</Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  deleteLoan(confirmDelete)
                  setConfirmDelete(null)
                }}
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
