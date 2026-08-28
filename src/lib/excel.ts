import ExcelJS from 'exceljs'
import type { AppDatabase, BoomCondition, LoanPriority, LoanRequest, LoanStatus, LocationType, MapLocation, StockBatch } from '../types'
import { makeId } from './id'
import { downloadBlob, dateStamp } from './jsonIO'

const LOCATION_TYPES: LocationType[] = ['pos', 'sumur', 'platform', 'cluster', 'lainnya']
const CONDITIONS: BoomCondition[] = ['Baik', 'Rusak Ringan', 'Rusak Berat']
const STATUSES: LoanStatus[] = ['Pending', 'Disetujui', 'Aktif', 'Selesai', 'Dibatalkan']
const PRIORITIES: LoanPriority[] = ['Normal', 'Tinggi', 'Urgent']

function headerRow(sheet: ExcelJS.Worksheet, headers: string[]) {
  const row = sheet.addRow(headers)
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

export async function exportDatabaseToExcel(db: AppDatabase): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'HCA Oil Boom Management Tools'
  wb.created = new Date()

  // --- Pengaturan ---
  const wsSettings = wb.addWorksheet('Pengaturan')
  headerRow(wsSettings, ['Nama Perusahaan', 'Nama Site', 'Center Lat', 'Center Lng', 'Default Panjang Unit (m)'])
  wsSettings.addRow([
    db.settings.companyName,
    db.settings.siteName,
    db.settings.centerLat,
    db.settings.centerLng,
    db.settings.defaultUnitLengthMeters,
  ])
  wsSettings.columns.forEach((c) => (c.width = 22))

  // --- Lokasi (Pos & Site) ---
  const wsLoc = wb.addWorksheet('Lokasi')
  headerRow(wsLoc, ['ID', 'Nama', 'Kode', 'Tipe (pos/sumur/platform/cluster/lainnya)', 'Area', 'Latitude', 'Longitude', 'Deskripsi'])
  for (const l of db.locations) {
    wsLoc.addRow([l.id, l.name, l.code ?? '', l.type, l.area ?? '', l.lat, l.lng, l.description ?? ''])
  }
  wsLoc.columns.forEach((c) => (c.width = 18))

  // --- Stok Boom ---
  const wsStock = wb.addWorksheet('Stok Boom')
  headerRow(wsStock, ['ID', 'Pos Kode', 'Pos Nama', 'Label Batch', 'Jumlah Unit', 'Panjang per Unit (m)', 'Kondisi (Baik/Rusak Ringan/Rusak Berat)', 'Catatan'])
  for (const b of db.stockBatches) {
    const pos = db.locations.find((l) => l.id === b.posId)
    wsStock.addRow([b.id, pos?.code ?? '', pos?.name ?? '', b.label, b.quantityUnits, b.unitLengthMeters, b.condition, b.notes ?? ''])
  }
  wsStock.columns.forEach((c) => (c.width = 20))

  // --- Peminjaman ---
  const wsLoan = wb.addWorksheet('Peminjaman')
  headerRow(wsLoan, [
    'ID', 'No Permintaan', 'Nama Peminta', 'Entity/Perusahaan', 'Ext', 'Fungsi Pekerjaan',
    'Deskripsi Pekerjaan', 'Lokasi Kerja Kode', 'Lokasi Kerja Nama', 'Pos Asal Kode', 'Pos Asal Nama',
    'Jumlah Unit', 'Panjang per Unit (m)', 'Tgl Request', 'Tgl Mulai', 'Tgl Selesai Rencana',
    'Tgl Kembali Aktual', 'Status', 'Prioritas', 'Catatan',
  ])
  for (const l of db.loans) {
    const site = db.locations.find((x) => x.id === l.siteLocationId)
    const pos = db.locations.find((x) => x.id === l.sourcePosId)
    wsLoan.addRow([
      l.id, l.requestNumber, l.requesterName, l.entity, l.ext, l.boomFunction,
      l.workDescription, site?.code ?? '', site?.name ?? '', pos?.code ?? '', pos?.name ?? '',
      l.quantityUnits, l.unitLengthMeters, l.requestDate, l.startDate, l.endDate,
      l.actualReturnDate ?? '', l.status, l.priority, l.notes ?? '',
    ])
  }
  wsLoan.columns.forEach((c) => (c.width = 18))

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, `hca-oil-boom-data-${dateStamp()}.xlsx`)
}

function cellStr(row: ExcelJS.Row, idx: number): string {
  const v = row.getCell(idx).value
  if (v === null || v === undefined) return ''
  if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text)
  if (typeof v === 'object' && 'result' in (v as any)) return String((v as any).result)
  return String(v).trim()
}

function cellNum(row: ExcelJS.Row, idx: number): number {
  const s = cellStr(row, idx)
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export interface ExcelImportResult {
  db: AppDatabase
  warnings: string[]
}

export async function importDatabaseFromExcel(file: File, current: AppDatabase): Promise<ExcelImportResult> {
  const warnings: string[] = []
  const wb = new ExcelJS.Workbook()
  const buf = await file.arrayBuffer()
  await wb.xlsx.load(buf)

  const settings = { ...current.settings }
  const wsSettings = wb.getWorksheet('Pengaturan')
  if (wsSettings) {
    const row = wsSettings.getRow(2)
    if (cellStr(row, 1)) settings.companyName = cellStr(row, 1)
    if (cellStr(row, 2)) settings.siteName = cellStr(row, 2)
    if (cellStr(row, 3)) settings.centerLat = cellNum(row, 3)
    if (cellStr(row, 4)) settings.centerLng = cellNum(row, 4)
    if (cellStr(row, 5)) settings.defaultUnitLengthMeters = cellNum(row, 5)
  }

  const locations: MapLocation[] = []
  const wsLoc = wb.getWorksheet('Lokasi')
  if (!wsLoc) throw new Error('Sheet "Lokasi" tidak ditemukan di file Excel')
  wsLoc.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const name = cellStr(row, 2)
    if (!name) return
    const typeRaw = cellStr(row, 4).toLowerCase() as LocationType
    const type = LOCATION_TYPES.includes(typeRaw) ? typeRaw : 'lainnya'
    if (!LOCATION_TYPES.includes(typeRaw)) warnings.push(`Baris Lokasi ${rowNumber}: tipe "${cellStr(row, 4)}" tidak dikenal, diset "lainnya"`)
    const now = new Date().toISOString()
    locations.push({
      id: cellStr(row, 1) || makeId('loc'),
      name,
      code: cellStr(row, 3) || undefined,
      type,
      area: cellStr(row, 5) || undefined,
      lat: cellNum(row, 6),
      lng: cellNum(row, 7),
      description: cellStr(row, 8) || undefined,
      createdAt: now,
      updatedAt: now,
    })
  })

  const findLocId = (code: string, name: string, rowNumber: number, sheetLabel: string): string | undefined => {
    const byCode = code ? locations.find((l) => l.code && l.code.toLowerCase() === code.toLowerCase()) : undefined
    if (byCode) return byCode.id
    const byName = name ? locations.find((l) => l.name.toLowerCase() === name.toLowerCase()) : undefined
    if (byName) return byName.id
    warnings.push(`Baris ${sheetLabel} ${rowNumber}: lokasi "${code || name}" tidak ditemukan di sheet Lokasi`)
    return undefined
  }

  const stockBatches: StockBatch[] = []
  const wsStock = wb.getWorksheet('Stok Boom')
  if (wsStock) {
    wsStock.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const label = cellStr(row, 4)
      if (!label && !cellStr(row, 2) && !cellStr(row, 3)) return
      const posId = findLocId(cellStr(row, 2), cellStr(row, 3), rowNumber, 'Stok Boom')
      if (!posId) return
      const conditionRaw = cellStr(row, 7) as BoomCondition
      const condition = CONDITIONS.includes(conditionRaw) ? conditionRaw : 'Baik'
      const now = new Date().toISOString()
      stockBatches.push({
        id: cellStr(row, 1) || makeId('stk'),
        posId,
        label: label || 'Batch',
        quantityUnits: cellNum(row, 5),
        unitLengthMeters: cellNum(row, 6) || settings.defaultUnitLengthMeters,
        condition,
        notes: cellStr(row, 8) || undefined,
        createdAt: now,
        updatedAt: now,
      })
    })
  }

  const loans: LoanRequest[] = []
  const wsLoan = wb.getWorksheet('Peminjaman')
  if (wsLoan) {
    wsLoan.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const requestNumber = cellStr(row, 2)
      if (!requestNumber) return
      const siteId = findLocId(cellStr(row, 8), cellStr(row, 9), rowNumber, 'Peminjaman (lokasi kerja)')
      const posId = findLocId(cellStr(row, 10), cellStr(row, 11), rowNumber, 'Peminjaman (pos asal)')
      if (!siteId || !posId) return
      const statusRaw = cellStr(row, 18) as LoanStatus
      const status = STATUSES.includes(statusRaw) ? statusRaw : 'Pending'
      const priorityRaw = cellStr(row, 19) as LoanPriority
      const priority = PRIORITIES.includes(priorityRaw) ? priorityRaw : 'Normal'
      const now = new Date().toISOString()
      loans.push({
        id: cellStr(row, 1) || makeId('loan'),
        requestNumber,
        requesterName: cellStr(row, 3),
        entity: cellStr(row, 4),
        ext: cellStr(row, 5),
        boomFunction: cellStr(row, 6),
        workDescription: cellStr(row, 7),
        siteLocationId: siteId,
        sourcePosId: posId,
        quantityUnits: cellNum(row, 12),
        unitLengthMeters: cellNum(row, 13) || settings.defaultUnitLengthMeters,
        requestDate: cellStr(row, 14),
        startDate: cellStr(row, 15),
        endDate: cellStr(row, 16),
        actualReturnDate: cellStr(row, 17) || undefined,
        status,
        priority,
        notes: cellStr(row, 20) || undefined,
        createdAt: now,
        updatedAt: now,
      })
    })
  }

  const db: AppDatabase = { version: 1, settings, locations, stockBatches, loans }
  return { db, warnings }
}

export async function downloadExcelTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook()
  const wsLoc = wb.addWorksheet('Lokasi')
  headerRow(wsLoc, ['ID', 'Nama', 'Kode', 'Tipe (pos/sumur/platform/cluster/lainnya)', 'Area', 'Latitude', 'Longitude', 'Deskripsi'])
  wsLoc.addRow(['', 'Pos Contoh', 'POS-99', 'pos', 'Area X', -0.8414, 117.2783, 'Contoh baris, silakan hapus'])
  wsLoc.columns.forEach((c) => (c.width = 20))

  const wsStock = wb.addWorksheet('Stok Boom')
  headerRow(wsStock, ['ID', 'Pos Kode', 'Pos Nama', 'Label Batch', 'Jumlah Unit', 'Panjang per Unit (m)', 'Kondisi (Baik/Rusak Ringan/Rusak Berat)', 'Catatan'])
  wsStock.addRow(['', 'POS-99', 'Pos Contoh', 'Boom Kuning 15m', 10, 15, 'Baik', ''])
  wsStock.columns.forEach((c) => (c.width = 20))

  const wsLoan = wb.addWorksheet('Peminjaman')
  headerRow(wsLoan, [
    'ID', 'No Permintaan', 'Nama Peminta', 'Entity/Perusahaan', 'Ext', 'Fungsi Pekerjaan',
    'Deskripsi Pekerjaan', 'Lokasi Kerja Kode', 'Lokasi Kerja Nama', 'Pos Asal Kode', 'Pos Asal Nama',
    'Jumlah Unit', 'Panjang per Unit (m)', 'Tgl Request', 'Tgl Mulai', 'Tgl Selesai Rencana',
    'Tgl Kembali Aktual', 'Status', 'Prioritas', 'Catatan',
  ])
  wsLoan.columns.forEach((c) => (c.width = 18))

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, 'template-hca-oil-boom.xlsx')
}
