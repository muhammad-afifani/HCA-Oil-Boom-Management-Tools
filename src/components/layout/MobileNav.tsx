import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, MapPinned, ClipboardList, ListOrdered, Boxes, FileText, DatabaseBackup, MoreHorizontal } from 'lucide-react'
import type { PageKey } from '../../App'

const primaryItems: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'map', label: 'Peta', icon: MapPinned },
  { key: 'priority', label: 'Prioritas', icon: ListOrdered },
  { key: 'loans', label: 'Pinjam', icon: ClipboardList },
]

const moreItems: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'master', label: 'Master Data', icon: Boxes },
  { key: 'recap', label: 'Rekap & Laporan', icon: FileText },
  { key: 'io', label: 'Import / Export', icon: DatabaseBackup },
]

export function MobileNav({ page, onNavigate }: { page: PageKey; onNavigate: (p: PageKey) => void }) {
  const [showMore, setShowMore] = useState(false)
  const inMore = moreItems.some((i) => i.key === page)

  return (
    <>
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed inset-x-3 bottom-16 z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl md:hidden"
            >
              {moreItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { onNavigate(key); setShowMore(false) }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    page === key ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white md:hidden">
        {primaryItems.map(({ key, label, icon: Icon }) => {
          const active = page === key
          return (
            <button
              key={key}
              onClick={() => { onNavigate(key); setShowMore(false) }}
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
        <button
          onClick={() => setShowMore((v) => !v)}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
            inMore || showMore ? 'text-teal-600' : 'text-slate-500'
          }`}
        >
          {inMore && !showMore && (
            <motion.span
              layoutId="mobilenav-active-dot"
              className="absolute top-0.5 h-1 w-1 rounded-full bg-teal-600"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <MoreHorizontal size={17} />
          Lainnya
        </button>
      </nav>
    </>
  )
}
