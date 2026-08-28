import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, Reorder, motion } from 'framer-motion'
import { GripVertical, Info, MapPin, Pencil, RotateCcw, Wand2 } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, loanStatusTone, priorityTone } from '../ui/Badge'
import { effectiveLoanStatus, loanDaysRemaining } from '../../lib/inventory'
import { resolveOrderedLoans } from '../../lib/priority'
import { formatDateID } from '../../lib/date'
import { LoanFormModal } from '../loans/LoanFormModal'
import type { LoanRequest } from '../../types'

const TIER_RING: Record<string, string> = {
  Terlambat: 'bg-red-600',
  Aktif: 'bg-blue-600',
  Disetujui: 'bg-teal-600',
  Pending: 'bg-amber-500',
}

const EMPTY_ORDER: string[] = []

export function PriorityPage() {
  const db = useStore((s) => s.db)
  const setPriorityMode = useStore((s) => s.setPriorityMode)
  const setPriorityOrder = useStore((s) => s.setPriorityOrder)
  const resetPriorityOrder = useStore((s) => s.resetPriorityOrder)

  const mode = db.priorityMode ?? 'auto'
  const storedOrder = db.priorityOrder ?? EMPTY_ORDER

  const rankedLoans = useMemo(
    () => resolveOrderedLoans(db.loans, mode, storedOrder),
    [db.loans, mode, storedOrder],
  )

  // Local mirror for buttery-smooth drag reordering; synced to the store on every reorder.
  const [localOrder, setLocalOrder] = useState<LoanRequest[]>(rankedLoans)
  useEffect(() => {
    setLocalOrder(rankedLoans)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedLoans.map((l) => l.id).join(','), mode])

  const [editLoan, setEditLoan] = useState<LoanRequest | undefined>()
  const [showLegend, setShowLegend] = useState(false)

  const handleReorder = (newOrder: LoanRequest[]) => {
    setLocalOrder(newOrder)
    setPriorityOrder(newOrder.map((l) => l.id))
  }

  return (
    <div>
      <Header
        title="Prioritas Peminjaman"
        subtitle="Urutan #1 sampai selesai — mana yang paling perlu ditindaklanjuti atau dikembalikan lebih dulu."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setPriorityMode('auto')}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
              mode === 'auto' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <Wand2 size={13} /> Otomatis
          </button>
          <button
            onClick={() => setPriorityMode('manual')}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
              mode === 'manual' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <GripVertical size={13} /> Urutkan Manual
          </button>
        </div>

        {mode === 'manual' && (
          <Button size="sm" onClick={() => resetPriorityOrder()}>
            <RotateCcw size={13} /> Reset ke Otomatis
          </Button>
        )}

        <button
          onClick={() => setShowLegend((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
        >
          <Info size={13} /> Bagaimana urutan otomatis dihitung?
        </button>

        <span className="ml-auto text-xs text-slate-400">{rankedLoans.length} item aktif diprioritaskan</span>
      </div>

      <AnimatePresence initial={false}>
        {showLegend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-xs leading-relaxed text-teal-800">
              Urutan otomatis: <b>1) Terlambat kembali</b> (paling lama lewat tempo duluan) &rarr;{' '}
              <b>2) Sedang dipakai / Aktif</b> (sisa waktu paling sedikit duluan) &rarr; <b>3) Disetujui</b> (paling
              dekat/lewat tanggal mulai duluan) &rarr; <b>4) Menunggu approval</b> (permintaan paling lama menunggu
              duluan). Prioritas <b>Urgent</b>/<b>Tinggi</b> jadi pemisah tambahan di level yang sama. Beralih ke mode{' '}
              <b>Urutkan Manual</b> untuk menggeser urutan sesuai penilaian Anda sendiri — urutan manual akan
              tersimpan dan tidak hilang saat Anda kembali melihat mode Otomatis.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden p-3 sm:p-4">
        {localOrder.length === 0 && (
          <div className="px-4 py-14 text-center text-sm text-slate-400">
            Tidak ada peminjaman yang butuh diprioritaskan saat ini (Pending/Disetujui/Aktif kosong).
          </div>
        )}

        {mode === 'manual' ? (
          <Reorder.Group
            as="ul"
            axis="y"
            values={localOrder}
            onReorder={handleReorder}
            className="m-0 list-none space-y-2.5 p-0"
          >
            {localOrder.map((loan, idx) => (
              <Reorder.Item
                key={loan.id}
                value={loan}
                as="li"
                whileDrag={{ scale: 1.02, boxShadow: '0 12px 28px rgba(15,23,42,0.18)', zIndex: 10, cursor: 'grabbing' }}
                className="relative list-none"
              >
                <PriorityRow loan={loan} rank={idx + 1} draggable onEdit={() => setEditLoan(loan)} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <ul className="m-0 list-none space-y-2.5 p-0">
            <AnimatePresence initial={false}>
              {localOrder.map((loan, idx) => (
                <motion.li
                  key={loan.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="list-none"
                >
                  <PriorityRow loan={loan} rank={idx + 1} draggable={false} onEdit={() => setEditLoan(loan)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>

      <LoanFormModal open={!!editLoan} loan={editLoan} onClose={() => setEditLoan(undefined)} />
    </div>
  )
}

function PriorityRow({
  loan,
  rank,
  draggable,
  onEdit,
}: {
  loan: LoanRequest
  rank: number
  draggable: boolean
  onEdit: () => void
}) {
  const db = useStore((s) => s.db)
  const site = db.locations.find((l) => l.id === loan.siteLocationId)
  const pos = db.locations.find((l) => l.id === loan.sourcePosId)
  const status = effectiveLoanStatus(loan)
  const days = loanDaysRemaining(loan)

  const countdownLabel =
    loan.status === 'Pending'
      ? `Diminta ${formatDateID(loan.requestDate)}`
      : loan.status === 'Disetujui'
        ? `Mulai ${formatDateID(loan.startDate)}`
        : days < 0
          ? `Lewat ${Math.abs(days)} hari`
          : days === 0
            ? 'Selesai hari ini'
            : `${days} hari lagi`

  return (
    <div
      className={clsx(
        'group flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 transition-shadow sm:items-center sm:gap-4 sm:p-3.5',
        draggable ? 'hover:border-teal-300 hover:shadow-md' : 'hover:shadow-sm',
      )}
    >
      <div className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5 sm:pt-0">
        <span
          className={clsx(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm sm:h-10 sm:w-10 sm:text-sm',
            TIER_RING[status] ?? 'bg-slate-400',
          )}
        >
          {rank}
        </span>
        {draggable && (
          <span className="cursor-grab text-slate-300 group-hover:text-slate-400 active:cursor-grabbing">
            <GripVertical size={16} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="truncate text-sm font-semibold text-slate-800">{loan.requesterName}</span>
          <span className="truncate text-xs text-slate-400">{loan.entity}</span>
          {loan.ext && <span className="shrink-0 text-xs text-slate-300">&middot; Ext {loan.ext}</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-slate-500">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{site?.name ?? '-'}</span>
          <span className="shrink-0 text-slate-300">dari</span>
          <span className="truncate">{pos?.name ?? '-'}</span>
          <span className="shrink-0 text-slate-300">&middot;</span>
          <span className="shrink-0">{loan.quantityUnits} unit</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
          <Badge tone={priorityTone(loan.priority)}>{loan.priority}</Badge>
          <Badge tone={loanStatusTone(status)}>{status}</Badge>
          <span className={clsx('text-xs', days < 0 ? 'font-semibold text-red-600' : days <= 2 ? 'font-semibold text-amber-600' : 'text-slate-400')}>
            {countdownLabel}
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <div className="flex items-center gap-1.5">
          <Badge tone={priorityTone(loan.priority)}>{loan.priority}</Badge>
          <Badge tone={loanStatusTone(status)}>{status}</Badge>
        </div>
        <span className={clsx('text-xs', days < 0 ? 'font-semibold text-red-600' : days <= 2 ? 'font-semibold text-amber-600' : 'text-slate-400')}>
          {countdownLabel}
        </span>
      </div>

      <button
        onClick={onEdit}
        className="shrink-0 rounded-lg p-2 text-slate-400 transition-opacity hover:bg-slate-100 hover:text-slate-600 sm:opacity-0 sm:group-hover:opacity-100"
        title="Edit peminjaman"
      >
        <Pencil size={15} />
      </button>
    </div>
  )
}
