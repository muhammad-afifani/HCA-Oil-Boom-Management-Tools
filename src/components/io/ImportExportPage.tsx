import { useRef, useState } from 'react'
import { Download, Upload, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { exportDatabaseAsJSON, parseDatabaseFromJSON, readFileAsText } from '../../lib/jsonIO'
import { downloadExcelTemplate, exportDatabaseToExcel, importDatabaseFromExcel } from '../../lib/excel'

export function ImportExportPage() {
  const db = useStore((s) => s.db)
  const replaceDatabase = useStore((s) => s.replaceDatabase)

  const jsonInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; warnings?: string[] } | null>(null)
  const [busy, setBusy] = useState(false)

  const handleJsonImport = async (file: File) => {
    setBusy(true)
    setMessage(null)
    try {
      const text = await readFileAsText(file)
      const parsedDb = parseDatabaseFromJSON(text)
      replaceDatabase(parsedDb)
      setMessage({ type: 'success', text: `Berhasil import ${parsedDb.locations.length} lokasi, ${parsedDb.stockBatches.length} batch stok, ${parsedDb.loans.length} peminjaman dari JSON.` })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal membaca file JSON' })
    } finally {
      setBusy(false)
    }
  }

  const handleExcelImport = async (file: File) => {
    setBusy(true)
    setMessage(null)
    try {
      const { db: parsedDb, warnings } = await importDatabaseFromExcel(file, db)
      replaceDatabase(parsedDb)
      setMessage({
        type: 'success',
        text: `Berhasil import ${parsedDb.locations.length} lokasi, ${parsedDb.stockBatches.length} batch stok, ${parsedDb.loans.length} peminjaman dari Excel.`,
        warnings,
      })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal membaca file Excel' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Header title="Import / Export Data" subtitle="Backup dan pulihkan seluruh database (lokasi, stok, peminjaman) dalam format JSON atau Excel." />

      {message && (
        <div className={`mb-5 rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <div className="flex items-start gap-2">
            {message.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            <div>
              <div>{message.text}</div>
              {message.warnings && message.warnings.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-amber-700">
                  {message.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Backup JSON" subtitle="Format lengkap, paling aman untuk backup & restore antar perangkat." />
          <div className="space-y-3 p-5">
            <Button variant="primary" onClick={() => exportDatabaseAsJSON(db)}>
              <Download size={15} /> Export Database (.json)
            </Button>
            <div>
              <input ref={jsonInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && handleJsonImport(e.target.files[0])} />
              <Button disabled={busy} onClick={() => jsonInputRef.current?.click()}>
                <Upload size={15} /> Import Database (.json)
              </Button>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-slate-400">
              <FileJson size={14} className="mt-0.5 shrink-0" /> Import JSON akan menimpa seluruh data yang tersimpan saat ini di browser.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Backup Excel (.xlsx)" subtitle="Untuk update data manual secara massal / kolaborasi tim." />
          <div className="space-y-3 p-5">
            <Button variant="primary" onClick={() => exportDatabaseToExcel(db)}>
              <Download size={15} /> Export Data (.xlsx)
            </Button>
            <div>
              <input ref={excelInputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && handleExcelImport(e.target.files[0])} />
              <Button disabled={busy} onClick={() => excelInputRef.current?.click()}>
                <Upload size={15} /> Import Data (.xlsx)
              </Button>
            </div>
            <Button size="sm" onClick={() => downloadExcelTemplate()}>
              <FileSpreadsheet size={14} /> Download Template Kosong
            </Button>
            <p className="text-xs text-slate-400">
              Sheet: <b>Lokasi</b>, <b>Stok Boom</b>, <b>Peminjaman</b>, <b>Pengaturan</b>. Kolom "Kode" pada Lokasi dipakai untuk mencocokkan referensi Pos/Lokasi Kerja di sheet lain saat import.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <div className="mb-2 text-sm font-semibold text-slate-800">Ringkasan Data Saat Ini</div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <SummaryStat label="Lokasi" value={db.locations.length} />
          <SummaryStat label="Batch Stok" value={db.stockBatches.length} />
          <SummaryStat label="Peminjaman" value={db.loans.length} />
          <SummaryStat label="Pos" value={db.locations.filter((l) => l.type === 'pos').length} />
        </div>
      </Card>

      <Card className="mt-5 p-5">
        <div className="mb-1 text-sm font-semibold text-slate-800">Rencana Import Peta (SHP / Koordinat)</div>
        <p className="text-xs leading-relaxed text-slate-500">
          Untuk tahap awal ini, titik lokasi sumur/platform/cluster dan pos diinput manual atau via Excel (kolom Latitude/Longitude).
          Saat file SHP atau daftar koordinat aktual sudah tersedia, konversi ke baris pada sheet <b>Lokasi</b> (Latitude/Longitude dalam derajat desimal, format WGS84) lalu import melalui menu ini.
        </p>
      </Card>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="text-lg font-semibold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}
