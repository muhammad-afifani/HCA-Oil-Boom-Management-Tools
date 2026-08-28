import clsx from 'clsx'
import { LayoutDashboard, MapPinned, ClipboardList, Boxes, DatabaseBackup } from 'lucide-react'
import type { PageKey } from '../../App'

const items: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'map', label: 'Peta', icon: MapPinned },
  { key: 'loans', label: 'Pinjam', icon: ClipboardList },
  { key: 'master', label: 'Data', icon: Boxes },
  { key: 'io', label: 'I/O', icon: DatabaseBackup },
]

export function MobileNav({ page, onNavigate }: { page: PageKey; onNavigate: (p: PageKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white md:hidden">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onNavigate(key)}
          className={clsx(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
            page === key ? 'text-teal-600' : 'text-slate-500',
          )}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </nav>
  )
}
