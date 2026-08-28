import type { AppDatabase } from '../types'

export function exportDatabaseAsJSON(db: AppDatabase): void {
  const payload: AppDatabase = { ...db, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `hca-oil-boom-backup-${dateStamp()}.json`)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseDatabaseFromJSON(text: string): AppDatabase {
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object') throw new Error('File JSON tidak valid')
  if (!Array.isArray(parsed.locations) || !Array.isArray(parsed.loans) || !Array.isArray(parsed.stockBatches)) {
    throw new Error('Struktur database JSON tidak sesuai (locations/stockBatches/loans hilang)')
  }
  return parsed as AppDatabase
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
