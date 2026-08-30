import { useMemo, useState } from 'react'
import { Flame } from 'lucide-react'
import { isLoanOpen } from '../../lib/inventory'
import { parseDate, todayISO } from '../../lib/date'
import type { LoanRequest } from '../../types'

const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MONTH_LABELS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function cellStyle(ratio: number): { bg: string; text: string } {
  if (ratio <= 0) return { bg: 'bg-slate-50', text: 'text-slate-400' }
  if (ratio <= 0.15) return { bg: 'bg-teal-100', text: 'text-teal-800' }
  if (ratio <= 0.35) return { bg: 'bg-teal-300', text: 'text-teal-900' }
  if (ratio <= 0.55) return { bg: 'bg-amber-300', text: 'text-amber-950' }
  if (ratio <= 0.75) return { bg: 'bg-amber-500', text: 'text-white' }
  if (ratio <= 1) return { bg: 'bg-red-500', text: 'text-white' }
  return { bg: 'bg-red-700', text: 'text-white' }
}

function addDays(iso: string, n: number): string {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Monday-first weekday index (0 = Senin ... 6 = Minggu). */
function mondayIndex(iso: string): number {
  return (parseDate(iso).getDay() + 6) % 7
}

export function UsageTimeline({ loans, totalStockUnits, daysAhead = 42 }: { loans: LoanRequest[]; totalStockUnits: number; daysAhead?: number }) {
  const [hover, setHover] = useState<{ date: string; units: number; ratio: number } | null>(null)
  const today = todayISO()

  const dayData = useMemo(() => {
    const relevant = loans.filter(isLoanOpen)
    const map = new Map<string, { units: number; ratio: number }>()
    for (let i = 0; i < daysAhead; i++) {
      const date = addDays(today, i)
      const units = relevant.reduce((sum, l) => {
        const start = l.startDate
        // TBC end date: treat as open-ended through the visible horizon.
        const end = l.endDateTBC || !l.endDate ? addDays(today, daysAhead) : l.endDate
        return date >= start && date <= end ? sum + l.quantityUnits : sum
      }, 0)
      const ratio = totalStockUnits > 0 ? units / totalStockUnits : 0
      map.set(date, { units, ratio })
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, totalStockUnits, daysAhead, today])

  const busiest = useMemo(() => {
    let best: { date: string; units: number; ratio: number } | null = null
    for (const [date, v] of dayData) {
      if (v.units > 0 && (!best || v.ratio > best.ratio)) best = { date, ...v }
    }
    return best
  }, [dayData])

  const weeks = useMemo(() => {
    const leading = mondayIndex(today)
    const gridStart = addDays(today, -leading)
    const contentEnd = addDays(today, daysAhead - 1)
    const trailing = (7 - ((leading + daysAhead) % 7)) % 7
    const totalCells = leading + daysAhead + trailing
    const cells = Array.from({ length: totalCells }, (_, i) => {
      const date = addDays(gridStart, i)
      const inRange = date >= today && date <= contentEnd
      const data = inRange ? dayData.get(date) : undefined
      return { date, inRange, isToday: date === today, units: data?.units ?? 0, ratio: data?.ratio ?? 0 }
    })
    const rows: (typeof cells)[] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [today, daysAhead, dayData])

  const display = hover ?? busiest

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-h-[34px] rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
          {display ? (
            <span className="flex items-center gap-1.5">
              {!hover && <Flame size={13} className="text-red-500" />}
              <b className="font-semibold text-slate-800">
                {parseDate(display.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </b>
              <span>&middot; {display.units} unit dipakai ({Math.round(display.ratio * 100)}% dari total stok)</span>
              {!hover && <span className="text-slate-400">— periode terpadat</span>}
            </span>
          ) : (
            <span className="text-slate-400">Tidak ada boom terpakai dalam periode ini.</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Longgar</span>
          <span className="h-3 w-3 rounded-sm bg-slate-100" />
          <span className="h-3 w-3 rounded-sm bg-teal-200" />
          <span className="h-3 w-3 rounded-sm bg-amber-300" />
          <span className="h-3 w-3 rounded-sm bg-amber-500" />
          <span className="h-3 w-3 rounded-sm bg-red-500" />
          <span className="h-3 w-3 rounded-sm bg-red-700" />
          <span>Padat</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {WEEKDAY_LABELS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="mt-1 space-y-1">
        {weeks.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-1">
            {row.map((cell) => {
              const d = parseDate(cell.date)
              const isFirstOfMonth = d.getDate() === 1
              const style = cellStyle(cell.ratio)
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={!cell.inRange}
                  onMouseEnter={() => cell.inRange && setHover({ date: cell.date, units: cell.units, ratio: cell.ratio })}
                  onMouseLeave={() => setHover((h) => (h?.date === cell.date ? null : h))}
                  className={`flex h-12 flex-col items-center justify-center rounded-lg text-xs transition-transform ${
                    cell.inRange ? `${style.bg} ${style.text} hover:scale-[1.04] cursor-pointer` : 'bg-transparent text-slate-200'
                  } ${cell.isToday ? 'ring-2 ring-slate-700 ring-offset-1' : ''}`}
                >
                  <span className="font-semibold leading-none">
                    {isFirstOfMonth ? `${d.getDate()} ${MONTH_LABELS_ID[d.getMonth()]}` : d.getDate()}
                  </span>
                  {cell.inRange && cell.units > 0 && <span className="mt-0.5 text-[10px] leading-none opacity-90">{cell.units}u</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
