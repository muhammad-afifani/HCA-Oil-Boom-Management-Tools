import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Settings } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, conditionTone } from '../ui/Badge'
import { Field, inputClass } from '../ui/Field'
import { LocationFormModal } from './LocationFormModal'
import { StockFormModal } from './StockFormModal'
import { summarizePosStock } from '../../lib/inventory'
import type { MapLocation, StockBatch } from '../../types'

type Tab = 'pos' | 'site' | 'stock' | 'settings'

export function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('pos')
  return (
    <div>
      <Header title="Master Data" subtitle="Kelola pos penyimpanan, lokasi kerja, stok boom, dan pengaturan umum." />
      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
        {([
          ['pos', 'Pos Penyimpanan'],
          ['site', 'Lokasi Kerja'],
          ['stock', 'Stok Boom'],
          ['settings', 'Pengaturan'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'pos' && <LocationsPanel kind="pos" />}
      {tab === 'site' && <LocationsPanel kind="site" />}
      {tab === 'stock' && <StockPanel />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  )
}

function LocationsPanel({ kind }: { kind: 'pos' | 'site' }) {
  const db = useStore((s) => s.db)
  const deleteLocation = useStore((s) => s.deleteLocation)
  const [modal, setModal] = useState<{ open: boolean; loc?: MapLocation }>({ open: false })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const list = useMemo(
    () => db.locations.filter((l) => (kind === 'pos' ? l.type === 'pos' : l.type !== 'pos')),
    [db.locations, kind],
  )

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="primary" onClick={() => setModal({ open: true })}>
          <Plus size={15} /> Tambah {kind === 'pos' ? 'Pos' : 'Lokasi Kerja'}
        </Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">Nama</th>
                <th className="px-4 py-2.5 font-medium">Kode</th>
                {kind === 'site' && <th className="px-4 py-2.5 font-medium">Tipe</th>}
                <th className="px-4 py-2.5 font-medium">Area</th>
                <th className="px-4 py-2.5 font-medium">Koordinat</th>
                {kind === 'pos' && <th className="px-4 py-2.5 font-medium">Stok Tersedia</th>}
                <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((loc) => {
                const stock = kind === 'pos' ? summarizePosStock(db.stockBatches, db.loans, loc.id) : null
                return (
                  <tr key={loc.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{loc.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{loc.code ?? '-'}</td>
                    {kind === 'site' && <td className="px-4 py-2.5 capitalize text-slate-600">{loc.type}</td>}
                    <td className="px-4 py-2.5 text-slate-500">{loc.area ?? '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</td>
                    {kind === 'pos' && stock && (
                      <td className="px-4 py-2.5 text-slate-600">
                        {stock.availableUnits}/{stock.usableUnits} unit
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModal({ open: true, loc })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(loc.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                    Belum ada data. Klik "Tambah" untuk menambahkan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <LocationFormModal open={modal.open} kind={kind} location={modal.loc} onClose={() => setModal({ open: false })} />

      {confirmDelete && (
        <ConfirmDeleteDialog
          text="Menghapus lokasi ini juga akan menghapus data stok terkait (jika pos). Lanjutkan?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteLocation(confirmDelete)
            setConfirmDelete(null)
          }}
        />
      )}
    </div>
  )
}

function StockPanel() {
  const db = useStore((s) => s.db)
  const deleteStockBatch = useStore((s) => s.deleteStockBatch)
  const [modal, setModal] = useState<{ open: boolean; batch?: StockBatch }>({ open: false })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="primary" onClick={() => setModal({ open: true })}>
          <Plus size={15} /> Tambah Batch Stok
        </Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">Label Batch</th>
                <th className="px-4 py-2.5 font-medium">Pos</th>
                <th className="px-4 py-2.5 font-medium">Jumlah</th>
                <th className="px-4 py-2.5 font-medium">Panjang/Unit</th>
                <th className="px-4 py-2.5 font-medium">Kondisi</th>
                <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.stockBatches.map((batch) => {
                const pos = db.locations.find((l) => l.id === batch.posId)
                return (
                  <tr key={batch.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{batch.label}</td>
                    <td className="px-4 py-2.5 text-slate-600">{pos?.name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{batch.quantityUnits} unit</td>
                    <td className="px-4 py-2.5 text-slate-600">{batch.unitLengthMeters} m</td>
                    <td className="px-4 py-2.5"><Badge tone={conditionTone(batch.condition)}>{batch.condition}</Badge></td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModal({ open: true, batch })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(batch.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {db.stockBatches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada batch stok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <StockFormModal open={modal.open} batch={modal.batch} onClose={() => setModal({ open: false })} />

      {confirmDelete && (
        <ConfirmDeleteDialog
          text="Hapus batch stok ini?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteStockBatch(confirmDelete)
            setConfirmDelete(null)
          }}
        />
      )}
    </div>
  )
}

function SettingsPanel() {
  const db = useStore((s) => s.db)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetToSeedData = useStore((s) => s.resetToSeedData)
  const clearAllData = useStore((s) => s.clearAllData)
  const [confirmReset, setConfirmReset] = useState<'seed' | 'clear' | null>(null)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Settings size={15} /> Pengaturan Umum
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Nama Perusahaan / Departemen">
            <input className={inputClass} value={db.settings.companyName} onChange={(e) => updateSettings({ companyName: e.target.value })} />
          </Field>
          <Field label="Nama Site">
            <input className={inputClass} value={db.settings.siteName} onChange={(e) => updateSettings({ siteName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Center Latitude (referensi peta)">
              <input type="number" step="any" className={inputClass} value={db.settings.centerLat} onChange={(e) => updateSettings({ centerLat: Number(e.target.value) })} />
            </Field>
            <Field label="Center Longitude (referensi peta)">
              <input type="number" step="any" className={inputClass} value={db.settings.centerLng} onChange={(e) => updateSettings({ centerLng: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Default Panjang per Unit Boom (m)">
            <input type="number" step="0.5" className={inputClass} value={db.settings.defaultUnitLengthMeters} onChange={(e) => updateSettings({ defaultUnitLengthMeters: Number(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold text-slate-800">Reset Data</div>
        <p className="mb-4 text-xs text-slate-500">
          Gunakan dengan hati-hati. Data yang tersimpan hanya ada di browser ini - lakukan export backup terlebih dahulu melalui menu Import/Export.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setConfirmReset('seed')}>Muat Ulang Data Contoh (Dummy)</Button>
          <Button variant="danger" onClick={() => setConfirmReset('clear')}>Kosongkan Semua Data</Button>
        </div>
      </Card>

      {confirmReset && (
        <ConfirmDeleteDialog
          text={confirmReset === 'seed' ? 'Ini akan mengganti seluruh data saat ini dengan data contoh (dummy). Lanjutkan?' : 'Ini akan menghapus SEMUA data (lokasi, stok, peminjaman). Lanjutkan?'}
          onCancel={() => setConfirmReset(null)}
          onConfirm={() => {
            if (confirmReset === 'seed') resetToSeedData()
            else clearAllData()
            setConfirmReset(null)
          }}
        />
      )}
    </div>
  )
}

function ConfirmDeleteDialog({ text, onCancel, onConfirm }: { text: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-800">Konfirmasi</h3>
        <p className="mt-1 text-xs text-slate-500">{text}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" onClick={onCancel}>Batal</Button>
          <Button size="sm" variant="danger" onClick={onConfirm}>Lanjutkan</Button>
        </div>
      </div>
    </div>
  )
}
