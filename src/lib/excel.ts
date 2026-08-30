import ExcelJS from 'exceljs'
import type { AppDatabase, BoomCondition, LoanAllocation, LoanPriority, LoanRequest, LoanStatus, LocationType, MapLocation, OtherStockItem, StockBatch } from '../types'
import { makeId } from './id'
import { downloadBlob, dateStamp } from './jsonIO'
import { loanStatusLabel } from './inventory'

const LOCATION_TYPES: LocationType[] = ['pos', 'sumur', 'platform', 'cluster', 'lainnya']
const CONDITIONS: BoomCondition[] = ['Baik', 'Rusak Ringan', 'Rusak Berat']
const STATUSES: LoanStatus[] = ['Pending', 'Disetujui', 'Aktif', 'Selesai', 'Dibatalkan']
const PRIORITIES: LoanPriority[] = ['Normal', 'Tinggi', 'Urgent']

// Accepts both the human-friendly label shown in the app/Excel (e.g. "Sedang Dipakai")
// and the raw internal value (e.g. "Aktif", for older exports) when parsing status back in.
const STATUS_LABEL_TO_VALUE: Record<string, LoanStatus> = {}
for (const s of STATUSES) {
  STATUS_LABEL_TO_VALUE[loanStatusLabel(s).toLowerCase()] = s
  STATUS_LABEL_TO_VALUE[s.toLowerCase()] = s
}

// Single source of truth for the Lokasi sheet's column order.
const LOC_HEADERS = [
  'ID', 'Nama', 'Kode', 'Tipe (pos/sumur/platform/cluster/lainnya)', 'Area', 'Latitude', 'Longitude', 'Deskripsi',
  'Gudang Pusat (Ya/Tidak)', 'Peralatan Lain (nama:jumlah:satuan, nama:jumlah:satuan, ...)',
] as const
const LOC_COL: Record<(typeof LOC_HEADERS)[number], number> = Object.fromEntries(
  LOC_HEADERS.map((h, i) => [h, i + 1]),
) as Record<(typeof LOC_HEADERS)[number], number>

// Single source of truth for the Peminjaman sheet's column order — export and import both
// derive their column indices from this array so they can never drift out of sync.
const LOAN_HEADERS = [
  'ID', 'No Permintaan', 'Nama Peminta', 'Entity/Perusahaan', 'Ext', 'Email', 'Fungsi Pekerjaan',
  'Deskripsi Pekerjaan', 'Lokasi Kerja Kode', 'Lokasi Kerja Nama', 'Pos Asal Kode', 'Pos Asal Nama',
  'Pos Tambahan (kode:jumlah, kode:jumlah, ...)', 'Jumlah Unit', 'Panjang per Unit (m)',
  'Tgl Request', 'Tgl Mulai', 'Tgl Selesai Rencana', 'Selesai TBC (Ya/Tidak)', 'Tgl Kembali Aktual',
  'Kembali Ke (Pos/Standby)', 'Status (Pending/Disetujui/Sedang Dipakai/Selesai/Dibatalkan)', 'Prioritas',
  'Disetujui Oleh (ENV)', 'Catatan',
] as const

const COL: Record<(typeof LOAN_HEADERS)[number], number> = Object.fromEntries(
  LOAN_HEADERS.map((h, i) => [h, i + 1]),
) as Record<(typeof LOAN_HEADERS)[number], number>

function headerRow(sheet: ExcelJS.Worksheet, headers: readonly string[]) {
  const row = sheet.addRow(headers as string[])
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

function encodeAdditionalSources(loan: LoanRequest, locations: MapLocation[]): string {
  const extra = loan.additionalSources ?? []
  return extra
    .filter((a) => a.quantityUnits > 0)
    .map((a) => {
      const pos = locations.find((l) => l.id === a.posId)
      return `${pos?.code || pos?.name || a.posId}:${a.quantityUnits}`
    })
    .join(', ')
}

function decodeAdditionalSources(raw: string, locations: MapLocation[], warnings: string[], rowNumber: number): LoanAllocation[] {
  if (!raw.trim()) return []
  const result: LoanAllocation[] = []
  for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [codeRaw, qtyRaw] = part.split(':').map((s) => s.trim())
    const qty = Number(qtyRaw)
    const pos = locations.find((l) => (l.code && l.code.toLowerCase() === codeRaw?.toLowerCase()) || l.name.toLowerCase() === codeRaw?.toLowerCase())
    if (!pos || !Number.isFinite(qty) || qty <= 0) {
      warnings.push(`Baris Peminjaman ${rowNumber}: pos tambahan "${part}" tidak valid/tidak ditemukan, diabaikan`)
      continue
    }
    result.push({ posId: pos.id, quantityUnits: qty })
  }
  return result
}

function encodeOtherItems(items: OtherStockItem[] | undefined): string {
  return (items ?? []).filter((it) => it.name.trim()).map((it) => `${it.name}:${it.quantity}:${it.unit}`).join(', ')
}

function decodeOtherItems(raw: string): OtherStockItem[] {
  if (!raw.trim()) return []
  const result: OtherStockItem[] = []
  for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [name, qtyRaw, unit] = part.split(':').map((s) => s.trim())
    if (!name) continue
    result.push({ id: makeId('item'), name, quantity: Number(qtyRaw) || 0, unit: unit || 'unit' })
  }
  return result
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
  headerRow(wsLoc, LOC_HEADERS)
  for (const l of db.locations) {
    wsLoc.addRow([
      l.id, l.name, l.code ?? '', l.type, l.area ?? '', l.lat, l.lng, l.description ?? '',
      l.isWarehouse ? 'Ya' : 'Tidak', encodeOtherItems(l.otherItems),
    ])
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
  headerRow(wsLoan, LOAN_HEADERS)
  for (const l of db.loans) {
    const site = db.locations.find((x) => x.id === l.siteLocationId)
    const pos = db.locations.find((x) => x.id === l.sourcePosId)
    const row = new Array(LOAN_HEADERS.length).fill('')
    row[COL['ID'] - 1] = l.id
    row[COL['No Permintaan'] - 1] = l.requestNumber
    row[COL['Nama Peminta'] - 1] = l.requesterName
    row[COL['Entity/Perusahaan'] - 1] = l.entity
    row[COL['Ext'] - 1] = l.ext
    row[COL['Email'] - 1] = l.email ?? ''
    row[COL['Fungsi Pekerjaan'] - 1] = l.boomFunction
    row[COL['Deskripsi Pekerjaan'] - 1] = l.workDescription
    row[COL['Lokasi Kerja Kode'] - 1] = site?.code ?? ''
    row[COL['Lokasi Kerja Nama'] - 1] = site?.name ?? ''
    row[COL['Pos Asal Kode'] - 1] = pos?.code ?? ''
    row[COL['Pos Asal Nama'] - 1] = pos?.name ?? ''
    row[COL['Pos Tambahan (kode:jumlah, kode:jumlah, ...)'] - 1] = encodeAdditionalSources(l, db.locations)
    row[COL['Jumlah Unit'] - 1] = l.quantityUnits
    row[COL['Panjang per Unit (m)'] - 1] = l.unitLengthMeters
    row[COL['Tgl Request'] - 1] = l.requestDate
    row[COL['Tgl Mulai'] - 1] = l.startDate
    row[COL['Tgl Selesai Rencana'] - 1] = l.endDateTBC ? '' : l.endDate
    row[COL['Selesai TBC (Ya/Tidak)'] - 1] = l.endDateTBC ? 'Ya' : 'Tidak'
    row[COL['Tgl Kembali Aktual'] - 1] = l.actualReturnDate ?? ''
    row[COL['Kembali Ke (Pos/Standby)'] - 1] = l.returnedTo === 'standby' ? 'Standby' : l.status === 'Selesai' ? 'Pos' : ''
    row[COL['Status (Pending/Disetujui/Sedang Dipakai/Selesai/Dibatalkan)'] - 1] = loanStatusLabel(l.status)
    row[COL['Prioritas'] - 1] = l.priority
    row[COL['Disetujui Oleh (ENV)'] - 1] = l.approvedBy ?? ''
    row[COL['Catatan'] - 1] = l.notes ?? ''
    wsLoan.addRow(row)
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
    const name = cellStr(row, LOC_COL['Nama'])
    if (!name) return
    const typeRaw = cellStr(row, LOC_COL['Tipe (pos/sumur/platform/cluster/lainnya)']).toLowerCase() as LocationType
    const type = LOCATION_TYPES.includes(typeRaw) ? typeRaw : 'lainnya'
    if (!LOCATION_TYPES.includes(typeRaw)) warnings.push(`Baris Lokasi ${rowNumber}: tipe "${cellStr(row, LOC_COL['Tipe (pos/sumur/platform/cluster/lainnya)'])}" tidak dikenal, diset "lainnya"`)
    const now = new Date().toISOString()
    locations.push({
      id: cellStr(row, LOC_COL['ID']) || makeId('loc'),
      name,
      code: cellStr(row, LOC_COL['Kode']) || undefined,
      type,
      area: cellStr(row, LOC_COL['Area']) || undefined,
      lat: cellNum(row, LOC_COL['Latitude']),
      lng: cellNum(row, LOC_COL['Longitude']),
      description: cellStr(row, LOC_COL['Deskripsi']) || undefined,
      isWarehouse: cellStr(row, LOC_COL['Gudang Pusat (Ya/Tidak)']).toLowerCase().startsWith('y') || undefined,
      otherItems: decodeOtherItems(cellStr(row, LOC_COL['Peralatan Lain (nama:jumlah:satuan, nama:jumlah:satuan, ...)'])),
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
      const requestNumber = cellStr(row, COL['No Permintaan'])
      if (!requestNumber) return
      const siteId = findLocId(cellStr(row, COL['Lokasi Kerja Kode']), cellStr(row, COL['Lokasi Kerja Nama']), rowNumber, 'Peminjaman (lokasi kerja)')
      const posId = findLocId(cellStr(row, COL['Pos Asal Kode']), cellStr(row, COL['Pos Asal Nama']), rowNumber, 'Peminjaman (pos asal)')
      if (!siteId || !posId) return
      const statusRaw = cellStr(row, COL['Status (Pending/Disetujui/Sedang Dipakai/Selesai/Dibatalkan)'])
      const status = STATUS_LABEL_TO_VALUE[statusRaw.toLowerCase()] ?? 'Pending'
      const priorityRaw = cellStr(row, COL['Prioritas']) as LoanPriority
      const priority = PRIORITIES.includes(priorityRaw) ? priorityRaw : 'Normal'
      const endDateTBC = cellStr(row, COL['Selesai TBC (Ya/Tidak)']).toLowerCase().startsWith('y')
      const returnedToRaw = cellStr(row, COL['Kembali Ke (Pos/Standby)']).toLowerCase()
      const returnedTo = returnedToRaw === 'standby' ? 'standby' : returnedToRaw === 'pos' ? 'pos' : undefined
      const now = new Date().toISOString()
      loans.push({
        id: cellStr(row, COL['ID']) || makeId('loan'),
        requestNumber,
        requesterName: cellStr(row, COL['Nama Peminta']),
        entity: cellStr(row, COL['Entity/Perusahaan']),
        ext: cellStr(row, COL['Ext']),
        email: cellStr(row, COL['Email']) || undefined,
        boomFunction: cellStr(row, COL['Fungsi Pekerjaan']),
        workDescription: cellStr(row, COL['Deskripsi Pekerjaan']),
        siteLocationId: siteId,
        sourcePosId: posId,
        quantityUnits: cellNum(row, COL['Jumlah Unit']),
        unitLengthMeters: cellNum(row, COL['Panjang per Unit (m)']) || settings.defaultUnitLengthMeters,
        additionalSources: decodeAdditionalSources(cellStr(row, COL['Pos Tambahan (kode:jumlah, kode:jumlah, ...)']), locations, warnings, rowNumber),
        requestDate: cellStr(row, COL['Tgl Request']),
        startDate: cellStr(row, COL['Tgl Mulai']),
        endDate: endDateTBC ? '' : cellStr(row, COL['Tgl Selesai Rencana']),
        endDateTBC,
        actualReturnDate: cellStr(row, COL['Tgl Kembali Aktual']) || undefined,
        returnedTo,
        status,
        priority,
        approvedBy: cellStr(row, COL['Disetujui Oleh (ENV)']) || undefined,
        notes: cellStr(row, COL['Catatan']) || undefined,
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
  headerRow(wsLoc, LOC_HEADERS)
  wsLoc.addRow(['', 'Pos Contoh', 'POS-99', 'pos', 'Area X', -0.8414, 117.2783, 'Contoh baris, silakan hapus', 'Tidak', ''])
  wsLoc.columns.forEach((c) => (c.width = 20))

  const wsStock = wb.addWorksheet('Stok Boom')
  headerRow(wsStock, ['ID', 'Pos Kode', 'Pos Nama', 'Label Batch', 'Jumlah Unit', 'Panjang per Unit (m)', 'Kondisi (Baik/Rusak Ringan/Rusak Berat)', 'Catatan'])
  wsStock.addRow(['', 'POS-99', 'Pos Contoh', 'Boom Kuning 15m', 10, 15, 'Baik', ''])
  wsStock.columns.forEach((c) => (c.width = 20))

  const wsLoan = wb.addWorksheet('Peminjaman')
  headerRow(wsLoan, LOAN_HEADERS)
  wsLoan.columns.forEach((c) => (c.width = 18))

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, 'template-hca-oil-boom.xlsx')
}
