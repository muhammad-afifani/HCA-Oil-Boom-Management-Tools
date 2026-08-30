import { useMemo, useState } from 'react'
import { Camera, FileText, ImageOff, Printer, Search } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { StatCard } from '../ui/StatCard'
import { ActionButton } from '../ui/ActionButton'
import { Badge, loanStatusTone } from '../ui/Badge'
import { inputClass } from '../ui/Field'
import { effectiveLoanStatus, loanStatusLabel } from '../../lib/inventory'
import { formatDateID } from '../../lib/date'
import { InstallUpdateModal } from './InstallUpdateModal'
import { PrintReportModal } from './PrintReportModal'
import type { LoanRequest, LoanStatus } from '../../types'

const statusFilters: (LoanStatus | 'Terlambat' | 'Semua')[] = ['Semua', 'Pending', 'Disetujui', 'Aktif', 'Terlambat', 'Selesai', 'Dibatalkan']

export function RecapPage() {
  const db = useStore((s) => s.db)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>('Semua')
  const [installLoan, setInstallLoan] = useState<LoanRequest | undefined>()
  const [printLoan, setPrintLoan] = useState<LoanRequest | undefined>()

  const filtered = useMemo(() => {
    let list = db.loans.slice().sort((a, b) => (a.requestDate < b.requestDate ? 1 : -1))
    if (statusFilter !== 'Semua') list = list.filter((l) => effectiveLoanStatus(l) === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((l) => {
        const site = db.locations.find((s) => s.id === l.siteLocationId)
        return (
          l.requesterName.toLowerCase().includes(q) ||
          l.entity.toLowerCase().includes(q) ||
          l.requestNumber.toLowerCase().includes(q) ||
          (l.approvedBy ?? '').toLowerCase().includes(q) ||
          site?.name.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [db.loans, db.locations, search, statusFilter])

  const withPhoto = db.loans.filter((l) => l.installedPhotoDataUrl).length
  const approved = db.loans.filter((l) => l.approvedBy).length

  return (
    <div>
      <Header title="Rekap & Laporan" subtitle="Ringkasan seluruh permintaan, dokumentasi pemasangan, dan cetak laporan per permintaan (PDF A4)." />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Permintaan" value={db.loans.length} icon={FileText} tone="slate" />
        <StatCard label="Sudah Disetujui" value={approved} sub="punya nama approver" icon={FileText} tone="teal" />
        <StatCard label="Ada Dokumentasi Foto" value={withPhoto} sub="update pemasangan" icon={Camera} tone="blue" />
        <StatCard label="Belum Ada Foto" value={db.loans.length - withPhoto} icon={ImageOff} tone="amber" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari peminta, entity, no. permintaan, approver..."
            className={`${inputClass} w-80 pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={`${inputClass} w-auto`}>
          {statusFilters.map((s) => (
            <option key={s} value={s}>{s === 'Semua' ? s : loanStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">
                <th className="w-[190px] px-4 py-2.5 font-medium">No / Peminta</th>
                <th className="w-[160px] px-4 py-2.5 font-medium">Lokasi Kerja</th>
                <th className="w-[150px] px-4 py-2.5 font-medium">Floating Storage Asal</th>
                <th className="w-[110px] px-4 py-2.5 font-medium">Status</th>
                <th className="w-[120px] px-4 py-2.5 font-medium">Disetujui Oleh</th>
                <th className="w-[170px] px-4 py-2.5 font-medium">Dokumentasi</th>
                <th className="w-[180px] px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((loan) => {
                const site = db.locations.find((l) => l.id === loan.siteLocationId)
                const pos = db.locations.find((l) => l.id === loan.sourcePosId)
                const status = effectiveLoanStatus(loan)
                return (
                  <tr key={loan.id} className="align-top hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{loan.requestNumber}</div>
                      <div className="truncate text-xs text-slate-500">{loan.requesterName}</div>
                      <div className="truncate text-xs text-slate-400">{loan.entity}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600"><div className="truncate">{site?.name ?? '-'}</div></td>
                    <td className="px-4 py-3 text-slate-600"><div className="truncate">{pos?.name ?? '-'}</div></td>
                    <td className="px-4 py-3"><Badge tone={loanStatusTone(status)}>{loanStatusLabel(status)}</Badge></td>
                    <td className="px-4 py-3 text-slate-600"><div className="truncate">{loan.approvedBy || <span className="text-slate-300">-</span>}</div></td>
                    <td className="px-4 py-3">
                      {loan.installedPhotoDataUrl ? (
                        <button onClick={() => setInstallLoan(loan)} className="block">
                          <img src={loan.installedPhotoDataUrl} alt="Dokumentasi" className="h-12 w-16 rounded-lg border border-slate-200 object-cover transition-opacity hover:opacity-80" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">Belum ada foto</span>
                      )}
                      {loan.installedAt && <div className="mt-1 truncate text-[11px] text-slate-400">Terpasang {formatDateID(loan.installedAt)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1.5">
                        <ActionButton icon={Camera} label="Update Pemasangan" tone="blue" onClick={() => setInstallLoan(loan)} />
                        <ActionButton icon={Printer} label="Cetak Laporan" tone="slate" onClick={() => setPrintLoan(loan)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada data yang cocok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <InstallUpdateModal open={!!installLoan} loan={installLoan} onClose={() => setInstallLoan(undefined)} />
      <PrintReportModal open={!!printLoan} loan={printLoan} onClose={() => setPrintLoan(undefined)} />
    </div>
  )
}
