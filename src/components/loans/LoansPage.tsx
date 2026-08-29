import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Plus, Search, Pencil, Trash2, CheckCircle2, PackageCheck, XCircle, ArrowUpDown } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, loanStatusTone, priorityTone } from '../ui/Badge'
import { inputClass } from '../ui/Field'
import { effectiveLoanStatus, loanDaysRemaining, loanStatusLabel } from '../../lib/inventory'
import { formatDateID, planDurationDays, todayISO } from '../../lib/date'
import { LoanFormModal } from './LoanFormModal'
import type { LoanRequest, LoanStatus } from '../../types'

type SortKey = 'endDate' | 'requestDate' | 'startDate'

const statusFilters: (LoanStatus | 'Terlambat' | 'Semua')[] = ['Semua', 'Pending', 'Disetujui', 'Aktif', 'Terlambat', 'Selesai', 'Dibatalkan']

type ActionTone = 'teal' | 'blue' | 'emerald' | 'slate' | 'red'

const actionToneClasses: Record<ActionTone, string> = {
  teal: 'bg-teal-50 text-teal-700 hover:bg-teal-100 ring-teal-200',
  blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 ring-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200',
  slate: 'bg-slate-100 text-slate-600 hover:bg-slate-200 ring-slate-200',
  red: 'bg-red-50 text-red-600 hover:bg-red-100 ring-red-200',
}

function ActionButton({
  icon: Icon,
  label,
  tone,
  title,
  onClick,
}: {
  icon: LucideIcon
  label: string
  tone: ActionTone
  title?: string
  onClick: () => void
}) {
  return (
    <button
      title={title ?? label}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${actionToneClasses[tone]}`}
    >
      <Icon size={14} /> {label}
    </button>
  )
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
  const quickReturn = (loan: LoanRequest) =>
    updateLoan(loan.id, { status: 'Selesai', actualReturnDate: todayISO() })
  const quickCancel = (loan: LoanRequest) => updateLoan(loan.id, { status: 'Dibatalkan' })

  return (
    <div>
      <Header title="Peminjaman Oil Boom" subtitle="Kelola permintaan, status, dan prioritas pengembalian oil boom." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
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

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">No / Peminta</th>
                <th className="px-4 py-2.5 font-medium">Fungsi &amp; Pekerjaan</th>
                <th className="px-4 py-2.5 font-medium">Lokasi Kerja</th>
                <th className="px-4 py-2.5 font-medium">Pos Asal</th>
                <th className="px-4 py-2.5 font-medium">Jumlah</th>
                <th className="px-4 py-2.5 font-medium">Periode (hari)</th>
                <th className="px-4 py-2.5 font-medium">Sisa Waktu</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
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
                  <tr key={loan.id} className="align-top hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{loan.requestNumber}</div>
                      <div className="text-xs text-slate-500">{loan.requesterName}</div>
                      <div className="text-xs text-slate-400">{loan.entity} &middot; Ext {loan.ext || '-'}</div>
                      {loan.email && <div className="text-xs text-slate-400">{loan.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{loan.boomFunction}</div>
                      <div className="max-w-[220px] truncate text-xs text-slate-400" title={loan.workDescription}>{loan.workDescription}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{site?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {pos?.name ?? '-'}
                      {(loan.additionalSources?.length ?? 0) > 0 && (
                        <div className="text-xs text-teal-600">+{loan.additionalSources!.length} pos lain</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {loan.quantityUnits} unit
                      <div className="text-xs text-slate-400">{loan.quantityUnits * loan.unitLengthMeters} m</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateID(loan.startDate)} - {loan.endDateTBC || !loan.endDate ? <span className="font-medium text-amber-600">TBC</span> : formatDateID(loan.endDate)}
                      <div className="text-xs text-slate-400">{duration !== null ? `${duration} hari` : 'durasi belum pasti'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {loan.status === 'Aktif' ? (
                        <span className={days !== null && days < 0 ? 'font-semibold text-red-600' : days !== null && days <= 2 ? 'font-semibold text-amber-600' : 'text-slate-500'}>
                          {days === null ? 'TBC' : days < 0 ? `Lewat ${Math.abs(days)}h` : `${days} hari lagi`}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={loanStatusTone(status)}>{loanStatusLabel(status)}</Badge>
                      <div className="mt-1"><Badge tone={priorityTone(loan.priority)}>{loan.priority}</Badge></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[210px] flex-wrap items-center justify-end gap-1.5">
                        {loan.status === 'Pending' && (
                          <ActionButton icon={CheckCircle2} label="Setujui" tone="teal" onClick={() => quickApprove(loan)} />
                        )}
                        {loan.status === 'Disetujui' && (
                          <ActionButton
                            icon={PackageCheck}
                            label="Sedang Dipakai"
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
                            onClick={() => quickReturn(loan)}
                          />
                        )}
                        {(loan.status === 'Pending' || loan.status === 'Disetujui') && (
                          <ActionButton icon={XCircle} label="Batalkan" tone="slate" onClick={() => quickCancel(loan)} />
                        )}
                        <ActionButton icon={Pencil} label="Edit" tone="slate" onClick={() => setModalState({ open: true, loan })} />
                        <ActionButton icon={Trash2} label="Hapus" tone="red" onClick={() => setConfirmDelete(loan.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    Tidak ada data peminjaman yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <LoanFormModal open={modalState.open} loan={modalState.loan} onClose={() => setModalState({ open: false })} />

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
