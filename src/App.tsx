import { lazy, Suspense, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { MobileNav } from './components/layout/MobileNav'

const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const MapPage = lazy(() => import('./components/map/MapPage').then((m) => ({ default: m.MapPage })))
const LoansPage = lazy(() => import('./components/loans/LoansPage').then((m) => ({ default: m.LoansPage })))
const MasterDataPage = lazy(() => import('./components/master/MasterDataPage').then((m) => ({ default: m.MasterDataPage })))
const ImportExportPage = lazy(() => import('./components/io/ImportExportPage').then((m) => ({ default: m.ImportExportPage })))

export type PageKey = 'dashboard' | 'map' | 'loans' | 'master' | 'io'

function PageFallback() {
  return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Memuat halaman...</div>
}

function App() {
  const [page, setPage] = useState<PageKey>('dashboard')

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          <Suspense fallback={<PageFallback />}>
            {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
            {page === 'map' && <MapPage />}
            {page === 'loans' && <LoansPage />}
            {page === 'master' && <MasterDataPage />}
            {page === 'io' && <ImportExportPage />}
          </Suspense>
        </div>
      </main>
      <MobileNav page={page} onNavigate={setPage} />
    </div>
  )
}

export default App
