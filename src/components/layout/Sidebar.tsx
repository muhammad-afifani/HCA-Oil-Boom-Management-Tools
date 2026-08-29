import { motion } from 'framer-motion'
import { LayoutDashboard, MapPinned, ClipboardList, ListOrdered, Boxes, FileText, DatabaseBackup, Waves } from 'lucide-react'
import type { PageKey } from '../../App'

const items: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'map', label: 'Peta Lokasi', icon: MapPinned },
  { key: 'priority', label: 'Prioritas', icon: ListOrdered },
  { key: 'loans', label: 'Peminjaman', icon: ClipboardList },
  { key: 'master', label: 'Master Data', icon: Boxes },
  { key: 'recap', label: 'Rekap & Laporan', icon: FileText },
  { key: 'io', label: 'Import / Export', icon: DatabaseBackup },
]

export function Sidebar({ page, onNavigate }: { page: PageKey; onNavigate: (p: PageKey) => void }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
          <Waves size={18} />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-800 leading-tight">Oil Boom Tools</div>
          <div className="text-[11px] text-slate-400 leading-tight">HCA Site - Env Dept</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ key, label, icon: Icon }) => {
          const active = page === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-xl bg-teal-50"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon size={17} className="relative" />
              <span className="relative">{label}</span>
            </button>
          )
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] leading-relaxed text-slate-400">
        Data tersimpan lokal di browser ini. Gunakan menu Import/Export untuk backup rutin.
      </div>
    </aside>
  )
}
