import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'teal',
}: {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  tone?: 'teal' | 'blue' | 'amber' | 'red' | 'slate'
}) {
  const toneClasses: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg', toneClasses[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-800">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}
