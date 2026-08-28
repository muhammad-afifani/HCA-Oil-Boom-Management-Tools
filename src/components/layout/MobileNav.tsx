import { motion } from 'framer-motion'
import { LayoutDashboard, MapPinned, ClipboardList, ListOrdered, Boxes, DatabaseBackup } from 'lucide-react'
import type { PageKey } from '../../App'

const items: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'map', label: 'Peta', icon: MapPinned },
  { key: 'priority', label: 'Prioritas', icon: ListOrdered },
  { key: 'loans', label: 'Pinjam', icon: ClipboardList },
  { key: 'master', label: 'Data', icon: Boxes },
  { key: 'io', label: 'I/O', icon: DatabaseBackup },
]

export function MobileNav({ page, onNavigate }: { page: PageKey; onNavigate: (p: PageKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white md:hidden">
      {items.map(({ key, label, icon: Icon }) => {
        const active = page === key
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              active ? 'text-teal-600' : 'text-slate-500'
            }`}
          >
            {active && (
              <motion.span
                layoutId="mobilenav-active-dot"
                className="absolute top-0.5 h-1 w-1 rounded-full bg-teal-600"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <Icon size={17} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
