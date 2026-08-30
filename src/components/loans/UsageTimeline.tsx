import { useMemo, useState } from 'react'
import { isLoanOpen } from '../../lib/inventory'
import { parseDate, todayISO } from '../../lib/date'
import type { LoanRequest } from '../../types'

function ratioColor(ratio: number): string {
  if (ratio <= 0) return 'bg-slate-100'
  if (ratio <= 0.15) return 'bg-teal-100'
  if (ratio <= 0.35) return 'bg-teal-300'
  if (ratio <= 0.55) return 'bg-amber-300'
  if (ratio <= 0.75) return 'bg-amber-500'
  if (ratio <= 1) return 'bg-red-500'
  return 'bg-red-700'
}

function addDays(iso: string, n: number): string {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function UsageTimeline({ loans, totalStockUnits, daysAhead = 42 }: { loans: LoanRequest[]; totalStockUnits: number; daysAhead?: number }) {
  const [hover, setHover] = useState<{ date: string; units: number; ratio: number } | null>(null)
  const today = todayISO()

  const days = useMemo(() => {
    const relevant = loans.filter(isLoanOpen)
    return Array.from({ length: daysAhead }, (_, i) => {
      const date = addDays(today, i)
      const units = relevant.reduce((sum, l) => {
        const start = l.startDate
        // TBC end date: treat as open-ended through the visible horizon.
        const end = l.endDateTBC || !l.endDate ? addDays(today, daysAhead) : l.endDate
        return date >= start && date <= end ? sum + l.quantityUnits : sum
      }, 0)
      const ratio = totalStockUnits > 0 ? units / totalStockUnits : 0
      return { date, units, ratio }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, totalStockUnits, daysAhead, today])

  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = []
    let lastMonth = ''
    days.forEach((d, i) => {
      const month = parseDate(d.date).toLocaleDateString('id-ID', { month: 'short' })
      if (month !== lastMonth) {
        labels.push({ index: i, label: month })
        lastMonth = month
      }
    })
    return labels
  }, [days])

  return (
    <div>
      <div className="relative mb-1 h-4 text-[10px] text-slate-400" style={{ minWidth: daysAhead * 14 }}>
        {monthLabels.map((m) => (
          <span key={m.index} className="absolute" style={{ left: m.index * 14 }}>{m.label}</span>
        ))}
      </div>
      <div className="flex gap-0.5" style={{ minWidth: daysAhead * 14 }}>
        {days.map((d) => (
          <div
            key={d.date}
            onMouseEnter={() => setHover(d)}
            onMouseLeave={() => setHover((h) => (h?.date === d.date ? null : h))}
            className={`h-6 w-3 shrink-0 rounded-sm ${ratioColor(d.ratio)} ${d.date === today ? 'ring-2 ring-slate-700 ring-offset-1' : ''}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span>Longgar</span>
          <span className="h-3 w-3 rounded-sm bg-slate-100" />
          <span className="h-3 w-3 rounded-sm bg-teal-200" />
          <span className="h-3 w-3 rounded-sm bg-amber-300" />
          <span className="h-3 w-3 rounded-sm bg-amber-500" />
          <span className="h-3 w-3 rounded-sm bg-red-500" />
          <span className="h-3 w-3 rounded-sm bg-red-700" />
          <span>Padat</span>
        </div>
        <div className="min-h-[16px] font-medium text-slate-600">
          {hover
            ? `${parseDate(hover.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} — ${hover.units} unit dipakai (${Math.round(hover.ratio * 100)}% dari total stok)`
            : 'Arahkan kursor ke kotak untuk lihat detail tanggal'}
        </div>
      </div>
    </div>
  )
}
