import { useMemo, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Settings, Image as ImageIcon, Upload, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { ActionButton } from '../ui/ActionButton'
import { Badge, conditionTone } from '../ui/Badge'
import { Field, inputClass } from '../ui/Field'
import { LocationFormModal } from './LocationFormModal'
import { StockFormModal } from './StockFormModal'
import { summarizePosStock } from '../../lib/inventory'
import { resizeLogoToDataUrl } from '../../lib/image'
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
          <table className="w-full min-w-[760px] table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">
                <th className="w-[200px] px-4 py-2.5 font-medium">Nama</th>
                <th className="w-[110px] px-4 py-2.5 font-medium">Kode</th>
                {kind === 'site' && <th className="w-[100px] px-4 py-2.5 font-medium">Tipe</th>}
                <th className="w-[140px] px-4 py-2.5 font-medium">Area</th>
                <th className="w-[160px] px-4 py-2.5 font-medium">Koordinat</th>
                {kind === 'pos' && <th className="w-[130px] px-4 py-2.5 font-medium">Stok Tersedia</th>}
                <th className="w-[90px] px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((loc) => {
                const stock = kind === 'pos' ? summarizePosStock(db.stockBatches, db.loans, loc.id) : null
                return (
                  <tr key={loc.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      <div className="truncate">{loc.name}</div>
                      {loc.isWarehouse && <Badge tone="violet">Gudang Pusat</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500"><div className="truncate">{loc.code ?? '-'}</div></td>
                    {kind === 'site' && <td className="px-4 py-2.5 capitalize text-slate-600">{loc.type}</td>}
                    <td className="px-4 py-2.5 text-slate-500"><div className="truncate">{loc.area ?? '-'}</div></td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</td>
                    {kind === 'pos' && stock && (
                      <td className="px-4 py-2.5 text-slate-600">
                        {stock.availableUnits}/{stock.usableUnits} unit
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <div className="flex flex-nowrap justify-end gap-1">
                        <ActionButton icon={Pencil} label="Edit" tone="slate" iconOnly onClick={() => setModal({ open: true, loc })} />
                        <ActionButton icon={Trash2} label="Hapus" tone="red" iconOnly onClick={() => setConfirmDelete(loc.id)} />
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
          <table className="w-full min-w-[820px] table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">
                <th className="w-[240px] px-4 py-2.5 font-medium">Label Batch</th>
                <th className="w-[170px] px-4 py-2.5 font-medium">Pos</th>
                <th className="w-[100px] px-4 py-2.5 font-medium">Jumlah</th>
                <th className="w-[120px] px-4 py-2.5 font-medium">Panjang/Unit</th>
                <th className="w-[140px] px-4 py-2.5 font-medium">Kondisi</th>
                <th className="w-[90px] px-4 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.stockBatches.map((batch) => {
                const pos = db.locations.find((l) => l.id === batch.posId)
                return (
                  <tr key={batch.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-700"><div className="truncate">{batch.label}</div></td>
                    <td className="px-4 py-2.5 text-slate-600"><div className="truncate">{pos?.name ?? '-'}</div></td>
                    <td className="px-4 py-2.5 text-slate-600">{batch.quantityUnits} unit</td>
                    <td className="px-4 py-2.5 text-slate-600">{batch.unitLengthMeters} m</td>
                    <td className="px-4 py-2.5"><Badge tone={conditionTone(batch.condition)}>{batch.condition}</Badge></td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-nowrap justify-end gap-1">
                        <ActionButton icon={Pencil} label="Edit" tone="slate" iconOnly onClick={() => setModal({ open: true, batch })} />
                        <ActionButton icon={Trash2} label="Hapus" tone="red" iconOnly onClick={() => setConfirmDelete(batch.id)} />
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
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoError, setLogoError] = useState<string | null>(null)

  const handleLogoFile = async (file: File) => {
    setLogoError(null)
    try {
      const dataUrl = await resizeLogoToDataUrl(file)
      updateSettings({ logoDataUrl: dataUrl })
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Gagal memproses logo')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Settings size={15} /> Pengaturan Umum
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Logo Perusahaan">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {db.settings.logoDataUrl ? (
                  <img src={db.settings.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon size={20} className="text-slate-300" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoFile(e.target.files[0])} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => logoInputRef.current?.click()}>
                    <Upload size={13} /> Upload Logo (PNG)
                  </Button>
                  {db.settings.logoDataUrl && (
                    <Button size="sm" variant="danger" onClick={() => updateSettings({ logoDataUrl: undefined })}>
                      <X size={13} /> Hapus
                    </Button>
                  )}
                </div>
                <span className="text-xs text-slate-400">Muncul di menu bar kiri &amp; tab browser. PNG transparan disarankan.</span>
                {logoError && <span className="text-xs text-red-600">{logoError}</span>}
              </div>
            </div>
          </Field>
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
