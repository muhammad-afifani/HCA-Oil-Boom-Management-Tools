import type { AppDatabase, LoanRequest, MapLocation, StockBatch } from '../types'
import { makeId } from '../lib/id'

// Reference center point supplied by the user (Delta Mahakam area).
export const SITE_CENTER = {
  lat: -0.8414299596012856,
  lng: 117.27831949619498,
}

const now = new Date().toISOString()

function loc(
  name: string,
  type: MapLocation['type'],
  lat: number,
  lng: number,
  code?: string,
  area?: string,
): MapLocation {
  return {
    id: makeId('loc'),
    name,
    code,
    type,
    lat,
    lng,
    area,
    description: '',
    createdAt: now,
    updatedAt: now,
  }
}

// --- Storage posts (Pos penyimpanan oil boom), scattered around the delta ---
export const posUtama = loc('Pos Utama - Base Camp', 'pos', -0.84143, 117.27832, 'POS-01', 'Base Camp')
export const posDeltaUtara = loc('Pos Delta Utara', 'pos', -0.78261, 117.30452, 'POS-02', 'Delta Utara')
export const posDeltaSelatan = loc('Pos Delta Selatan', 'pos', -0.90874, 117.25190, 'POS-03', 'Delta Selatan')
export const posDeltaTimur = loc('Pos Delta Timur', 'pos', -0.83015, 117.35664, 'POS-04', 'Delta Timur')
export const posMuaraJawa = loc('Pos Muara Jawa', 'pos', -0.87652, 117.20073, 'POS-05', 'Muara Jawa')

export const seedPosList = [posUtama, posDeltaUtara, posDeltaSelatan, posDeltaTimur, posMuaraJawa]

// --- Work locations (sumur / platform / cluster) where spill-risk work happens ---
export const siteA = loc('Sumur MHK-101', 'sumur', -0.80532, 117.29811, 'MHK-101', 'Delta Utara')
export const siteB = loc('Platform NPU-B', 'platform', -0.76984, 117.32210, 'NPU-B', 'Delta Utara')
export const siteC = loc('Cluster Handil-7', 'cluster', -0.88420, 117.22940, 'HND-7', 'Delta Selatan')
export const siteD = loc('Sumur SPU-22', 'sumur', -0.92710, 117.26310, 'SPU-22', 'Delta Selatan')
export const siteE = loc('Platform Peciko-C', 'platform', -0.82190, 117.38220, 'PCK-C', 'Delta Timur')
export const siteF = loc('Cluster Tunu-3', 'cluster', -0.85510, 117.36840, 'TNU-3', 'Delta Timur')
export const siteG = loc('Sumur South-9', 'sumur', -0.86230, 117.18410, 'SM-9', 'Muara Jawa')
export const siteH = loc('Platform Serang-D', 'platform', -0.81020, 117.24310, 'SRG-D', 'Base Camp')

export const seedSiteList = [siteA, siteB, siteC, siteD, siteE, siteF, siteG, siteH]

export const seedLocations: MapLocation[] = [...seedPosList, ...seedSiteList]

// --- Stock batches (kondisi & jumlah per pos) ---
function batch(
  posId: string,
  label: string,
  qty: number,
  unitLength: number,
  condition: StockBatch['condition'],
): StockBatch {
  return {
    id: makeId('stk'),
    posId,
    label,
    quantityUnits: qty,
    unitLengthMeters: unitLength,
    condition,
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

export const seedStockBatches: StockBatch[] = [
  batch(posUtama.id, 'Boom Kuning 15m - Batch A', 30, 15, 'Baik'),
  batch(posUtama.id, 'Boom Kuning 15m - Batch B', 10, 15, 'Rusak Ringan'),
  batch(posDeltaUtara.id, 'Boom Oranye 15m', 25, 15, 'Baik'),
  batch(posDeltaUtara.id, 'Boom Oranye 15m (cadangan)', 5, 15, 'Rusak Ringan'),
  batch(posDeltaSelatan.id, 'Boom Kuning 15m', 28, 15, 'Baik'),
  batch(posDeltaSelatan.id, 'Boom Kuning 10m', 12, 10, 'Baik'),
  batch(posDeltaTimur.id, 'Boom Oranye 15m', 15, 15, 'Baik'),
  batch(posDeltaTimur.id, 'Boom Oranye 15m', 5, 15, 'Rusak Berat'),
  batch(posMuaraJawa.id, 'Boom Kuning 15m', 18, 15, 'Baik'),
]

// --- Loan requests (peminjaman oil boom) ---
function loan(partial: Omit<LoanRequest, 'id' | 'createdAt' | 'updatedAt'>): LoanRequest {
  return { ...partial, id: makeId('loan'), createdAt: now, updatedAt: now }
}

export const seedLoans: LoanRequest[] = [
  loan({
    requestNumber: 'REQ-2026-001',
    requesterName: 'Budi Santoso',
    entity: 'PT Mitra Marine Services',
    ext: '2145',
    boomFunction: 'Drilling Support',
    workDescription: 'Pemasangan boom pengaman saat mobilisasi rig di Sumur MHK-101',
    siteLocationId: siteA.id,
    sourcePosId: posDeltaUtara.id,
    quantityUnits: 6,
    unitLengthMeters: 15,
    requestDate: '2026-08-10',
    startDate: '2026-08-12',
    endDate: '2026-08-26',
    actualReturnDate: '2026-08-25',
    status: 'Selesai',
    priority: 'Normal',
    notes: 'Dikembalikan lebih cepat, kondisi baik.',
  }),
  loan({
    requestNumber: 'REQ-2026-002',
    requesterName: 'Andi Wijaya',
    entity: 'PT Pertamina Hulu - Production',
    ext: '3301',
    boomFunction: 'Well Intervention',
    workDescription: 'Proteksi tumpahan saat workover Platform NPU-B',
    siteLocationId: siteB.id,
    sourcePosId: posDeltaUtara.id,
    quantityUnits: 8,
    unitLengthMeters: 15,
    requestDate: '2026-08-15',
    startDate: '2026-08-18',
    endDate: '2026-09-02',
    status: 'Aktif',
    priority: 'Tinggi',
    notes: '',
  }),
  loan({
    requestNumber: 'REQ-2026-003',
    requesterName: 'Siti Rahma',
    entity: 'PT Marine Logistic Nusantara',
    ext: '5512',
    boomFunction: 'Marine Transport',
    workDescription: 'Pengamanan area bongkar muat BBM di Cluster Handil-7',
    siteLocationId: siteC.id,
    sourcePosId: posDeltaSelatan.id,
    quantityUnits: 10,
    unitLengthMeters: 15,
    requestDate: '2026-08-01',
    startDate: '2026-08-05',
    endDate: '2026-08-20',
    status: 'Selesai',
    actualReturnDate: '2026-08-21',
    priority: 'Normal',
    notes: '',
  }),
  loan({
    requestNumber: 'REQ-2026-004',
    requesterName: 'Hendra Gunawan',
    entity: 'PT Delta Sarana Energi',
    ext: '4420',
    boomFunction: 'Pipeline Maintenance',
    workDescription: 'Perbaikan flowline dekat Sumur SPU-22, potensi ceceran minyak',
    siteLocationId: siteD.id,
    sourcePosId: posDeltaSelatan.id,
    quantityUnits: 12,
    unitLengthMeters: 15,
    requestDate: '2026-08-18',
    startDate: '2026-08-20',
    endDate: '2026-08-27',
    status: 'Aktif',
    priority: 'Urgent',
    notes: 'Sudah terlambat, follow up pengembalian.',
  }),
  loan({
    requestNumber: 'REQ-2026-005',
    requesterName: 'Rudi Hartono',
    entity: 'PT Peciko Fabrication',
    ext: '2290',
    boomFunction: 'Fabrication Support',
    workDescription: 'Pekerjaan hot work & blasting di Platform Peciko-C',
    siteLocationId: siteE.id,
    sourcePosId: posDeltaTimur.id,
    quantityUnits: 8,
    unitLengthMeters: 15,
    requestDate: '2026-08-22',
    startDate: '2026-08-24',
    endDate: '2026-09-05',
    status: 'Aktif',
    priority: 'Normal',
    notes: '',
  }),
  loan({
    requestNumber: 'REQ-2026-006',
    requesterName: 'Yuni Kartika',
    entity: 'PT Tunu Offshore Services',
    ext: '3388',
    boomFunction: 'Vessel Mooring',
    workDescription: 'Sandar kapal suplai di Cluster Tunu-3',
    siteLocationId: siteF.id,
    sourcePosId: posDeltaTimur.id,
    quantityUnits: 4,
    unitLengthMeters: 15,
    requestDate: '2026-08-26',
    startDate: '2026-08-29',
    endDate: '2026-09-08',
    status: 'Disetujui',
    priority: 'Normal',
    notes: 'Menunggu mobilisasi tim.',
  }),
  loan({
    requestNumber: 'REQ-2026-007',
    requesterName: 'Fajar Nugroho',
    entity: 'PT South Mahakam Drilling',
    ext: '4901',
    boomFunction: 'Drilling Support',
    workDescription: 'Standby boom selama well testing Sumur South-9',
    siteLocationId: siteG.id,
    sourcePosId: posMuaraJawa.id,
    quantityUnits: 6,
    unitLengthMeters: 15,
    requestDate: '2026-08-27',
    startDate: '2026-09-01',
    endDate: '2026-09-15',
    status: 'Pending',
    priority: 'Normal',
    notes: 'Menunggu persetujuan ENV.',
  }),
  loan({
    requestNumber: 'REQ-2026-008',
    requesterName: 'Dewi Lestari',
    entity: 'PT Serang Construction',
    ext: '2701',
    boomFunction: 'Civil Work',
    workDescription: 'Pekerjaan sipil dekat kanal Platform Serang-D',
    siteLocationId: siteH.id,
    sourcePosId: posUtama.id,
    quantityUnits: 5,
    unitLengthMeters: 15,
    requestDate: '2026-08-05',
    startDate: '2026-08-07',
    endDate: '2026-08-14',
    status: 'Dibatalkan',
    priority: 'Normal',
    notes: 'Pekerjaan ditunda oleh entity, boom tidak jadi diambil.',
  }),
  loan({
    requestNumber: 'REQ-2026-009',
    requesterName: 'Andi Wijaya',
    entity: 'PT Pertamina Hulu - Production',
    ext: '3301',
    boomFunction: 'Well Intervention',
    workDescription: 'Lanjutan proteksi area Sumur MHK-101 pasca workover',
    siteLocationId: siteA.id,
    sourcePosId: posUtama.id,
    quantityUnits: 4,
    unitLengthMeters: 15,
    requestDate: '2026-08-20',
    startDate: '2026-08-22',
    endDate: '2026-08-27',
    status: 'Aktif',
    priority: 'Tinggi',
    notes: 'Overdue, sedang dikoordinasikan pengembaliannya.',
  }),
  loan({
    requestNumber: 'REQ-2026-010',
    requesterName: 'Bayu Prakoso',
    entity: 'PT Mitra Marine Services',
    ext: '2145',
    boomFunction: 'Marine Transport',
    workDescription: 'Escort boom untuk mobilisasi barge di Delta Selatan',
    siteLocationId: siteD.id,
    sourcePosId: posMuaraJawa.id,
    quantityUnits: 3,
    unitLengthMeters: 15,
    requestDate: '2026-08-28',
    startDate: '2026-09-03',
    endDate: '2026-09-10',
    status: 'Pending',
    priority: 'Normal',
    notes: '',
  }),
]

export function buildSeedDatabase(): AppDatabase {
  return {
    version: 1,
    settings: {
      companyName: 'HCA Environment Department',
      siteName: 'HCA Site - Delta Mahakam',
      centerLat: SITE_CENTER.lat,
      centerLng: SITE_CENTER.lng,
      defaultUnitLengthMeters: 15,
    },
    locations: seedLocations,
    stockBatches: seedStockBatches,
    loans: seedLoans,
  }
}
