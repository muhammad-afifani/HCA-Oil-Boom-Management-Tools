import type { LucideIcon } from 'lucide-react'

export type ActionTone = 'teal' | 'blue' | 'emerald' | 'slate' | 'red'

const actionToneClasses: Record<ActionTone, string> = {
  teal: 'bg-teal-50 text-teal-700 hover:bg-teal-100 ring-teal-200',
  blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 ring-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200',
  slate: 'bg-slate-100 text-slate-600 hover:bg-slate-200 ring-slate-200',
  red: 'bg-red-50 text-red-600 hover:bg-red-100 ring-red-200',
}

/**
 * A table-row action button. Labeled by default; pass `iconOnly` for a fixed
 * 28x28 square button (secondary actions) so a row of several actions never
 * wraps or crowds out the primary one.
 */
export function ActionButton({
  icon: Icon,
  label,
  tone,
  title,
  iconOnly,
  onClick,
}: {
  icon: LucideIcon
  label: string
  tone: ActionTone
  title?: string
  iconOnly?: boolean
  onClick: () => void
}) {
  if (iconOnly) {
    return (
      <button
        title={title ?? label}
        aria-label={label}
        onClick={onClick}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-colors ${actionToneClasses[tone]}`}
      >
        <Icon size={14} />
      </button>
    )
  }
  return (
    <button
      title={title ?? label}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${actionToneClasses[tone]}`}
    >
      <Icon size={14} /> {label}
    </button>
  )
}
