import { useRef, useState } from 'react'
import { Download, Upload, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle2, MapPinned, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Header } from '../layout/Header'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field, inputClass } from '../ui/Field'
import { exportDatabaseAsJSON, parseDatabaseFromJSON, readFileAsText } from '../../lib/jsonIO'
import { downloadExcelTemplate, exportDatabaseToExcel, importDatabaseFromExcel } from '../../lib/excel'
import { parseGisFile, type ParsedGisPoint } from '../../lib/gisImport'
import type { LocationType } from '../../types'

export function ImportExportPage() {
  const db = useStore((s) => s.db)
  const replaceDatabase = useStore((s) => s.replaceDatabase)
  const addLocation = useStore((s) => s.addLocation)

  const jsonInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const gisInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; warnings?: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [gisPreview, setGisPreview] = useState<{ points: ParsedGisPoint[]; warnings: string[]; fileName: string } | null>(null)
  const [gisDefaultType, setGisDefaultType] = useState<LocationType>('sumur')

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

  const handleGisFile = async (file: File) => {
    setMessage(null)
    try {
      const text = await readFileAsText(file)
      const result = parseGisFile(file.name, text)
      if (result.points.length === 0) throw new Error('Tidak ada titik koordinat yang berhasil dibaca dari file ini.')
      setGisPreview({ ...result, fileName: file.name })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal membaca file GIS' })
    }
  }

  const confirmGisImport = () => {
    if (!gisPreview) return
    for (const p of gisPreview.points) {
      addLocation({ name: p.name, code: p.code, type: gisDefaultType, lat: p.lat, lng: p.lng })
    }
    setMessage({ type: 'success', text: `Berhasil menambahkan ${gisPreview.points.length} lokasi dari ${gisPreview.fileName} sebagai tipe "${gisDefaultType}".`, warnings: gisPreview.warnings })
    setGisPreview(null)
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
              <FileJson size={14} className="mt-0.5 shrink-0" /> Import JSON akan menimpa seluruh data yang tersimpan saat ini di browser. Ini satu-satunya format yang menyertakan foto dokumentasi pemasangan — gunakan JSON untuk backup lengkap.
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
              Sheet: <b>Lokasi</b>, <b>Stok Boom</b>, <b>Peminjaman</b>, <b>Pengaturan</b>. Kolom "Kode" pada Lokasi dipakai untuk mencocokkan referensi Floating Storage/Lokasi Kerja di sheet lain saat import. Foto dokumentasi pemasangan tidak ikut di Excel (ukurannya terlalu besar untuk sel) — gunakan backup JSON untuk itu.
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
          <SummaryStat label="Floating Storage" value={db.locations.filter((l) => l.type === 'pos').length} />
        </div>
      </Card>

      <Card className="mt-5 p-5">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <MapPinned size={15} /> Import Lokasi dari GIS (GeoJSON / KML / CSV)
        </div>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Aplikasi ini tidak bisa login/scrape langsung ke portal GIS internal perusahaan Anda (butuh akun perusahaan yang tidak dimiliki tools ini).
          Tapi kalau titik sumur/platform sudah bisa di-<b>export</b> dari portal itu (biasanya lewat menu <i>Export Data</i> / <i>Download</i> pada layer di Finder/Tools GIS Anda,
          hasilnya GeoJSON, KML, atau CSV berkolom koordinat), file itu bisa langsung di-import di sini — otomatis mendeteksi kolom nama &amp; koordinat.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={gisInputRef} type="file" accept=".geojson,.json,.kml,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleGisFile(e.target.files[0])} />
          <Button variant="primary" onClick={() => gisInputRef.current?.click()}>
            <Upload size={15} /> Pilih File GIS
          </Button>
          <span className="text-xs text-slate-400">Format didukung: .geojson, .kml, .csv (kolom lat/lon)</span>
        </div>

        {gisPreview && (
          <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">{gisPreview.points.length} titik ditemukan di {gisPreview.fileName}</div>
              <button onClick={() => setGisPreview(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-400">
                  <tr><th className="px-3 py-1.5 font-medium">Nama</th><th className="px-3 py-1.5 font-medium">Koordinat</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gisPreview.points.slice(0, 30).map((p, i) => (
                    <tr key={i}><td className="px-3 py-1.5">{p.name}</td><td className="px-3 py-1.5 text-slate-500">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</td></tr>
                  ))}
                </tbody>
              </table>
              {gisPreview.points.length > 30 && <div className="px-3 py-1.5 text-xs text-slate-400">+{gisPreview.points.length - 30} lainnya</div>}
            </div>
            {gisPreview.warnings.length > 0 && (
              <ul className="mb-3 list-disc space-y-0.5 pl-4 text-xs text-amber-700">
                {gisPreview.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Tipe lokasi untuk semua titik ini">
                <select className={inputClass} value={gisDefaultType} onChange={(e) => setGisDefaultType(e.target.value as LocationType)}>
                  <option value="sumur">Sumur</option>
                  <option value="platform">Platform</option>
                  <option value="cluster">Cluster</option>
                  <option value="pos">Floating Storage</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </Field>
              <Button variant="primary" onClick={confirmGisImport}>Tambahkan {gisPreview.points.length} Lokasi</Button>
            </div>
          </div>
        )}
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
