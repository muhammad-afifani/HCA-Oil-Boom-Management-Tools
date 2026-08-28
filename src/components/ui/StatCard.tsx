import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { AnimatedNumber } from './AnimatedNumber'

export function StatCard({
  label,
  value,
  suffix,
  sub,
  icon: Icon,
  tone = 'teal',
}: {
  label: string
  value: number
  suffix?: string
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg', toneClasses[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-800">
        <AnimatedNumber value={value} />
        {suffix}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </motion.div>
  )
}
