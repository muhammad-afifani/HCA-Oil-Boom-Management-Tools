import type { ReactNode } from 'react'
import clsx from 'clsx'

type Tone = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'teal'

const toneClasses: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
}

export function Badge({ children, tone = 'slate', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function loanStatusTone(status: string): Tone {
  switch (status) {
    case 'Aktif':
      return 'blue'
    case 'Terlambat':
      return 'red'
    case 'Disetujui':
      return 'teal'
    case 'Pending':
      return 'amber'
    case 'Selesai':
      return 'green'
    case 'Dibatalkan':
      return 'slate'
    default:
      return 'slate'
  }
}

export function conditionTone(condition: string): Tone {
  switch (condition) {
    case 'Baik':
      return 'green'
    case 'Rusak Ringan':
      return 'amber'
    case 'Rusak Berat':
      return 'red'
    default:
      return 'slate'
  }
}

export function priorityTone(priority: string): Tone {
  switch (priority) {
    case 'Urgent':
      return 'red'
    case 'Tinggi':
      return 'amber'
    default:
      return 'slate'
  }
}
