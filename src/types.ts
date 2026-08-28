// Core domain types for the Oil Boom Management Tool

export type LocationType = 'pos' | 'sumur' | 'platform' | 'cluster' | 'lainnya'

export interface MapLocation {
  id: string
  name: string
  code?: string
  type: LocationType
  lat: number
  lng: number
  area?: string // e.g. sub-area / field name
  description?: string
  createdAt: string
  updatedAt: string
}

export type BoomCondition = 'Baik' | 'Rusak Ringan' | 'Rusak Berat'

export interface StockBatch {
  id: string
  posId: string
  label: string
  quantityUnits: number
  unitLengthMeters: number
  condition: BoomCondition
  notes?: string
  createdAt: string
  updatedAt: string
}

export type LoanStatus =
  | 'Pending'
  | 'Disetujui'
  | 'Aktif'
  | 'Selesai'
  | 'Dibatalkan'

export type LoanPriority = 'Normal' | 'Tinggi' | 'Urgent'

export interface LoanRequest {
  id: string
  requestNumber: string
  requesterName: string
  entity: string
  ext: string
  boomFunction: string
  workDescription: string
  siteLocationId: string
  sourcePosId: string
  quantityUnits: number
  unitLengthMeters: number
  requestDate: string
  startDate: string
  endDate: string
  actualReturnDate?: string
  status: LoanStatus
  priority: LoanPriority
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  companyName: string
  siteName: string
  centerLat: number
  centerLng: number
  defaultUnitLengthMeters: number
}

export interface AppDatabase {
  version: number
  settings: AppSettings
  locations: MapLocation[]
  stockBatches: StockBatch[]
  loans: LoanRequest[]
  exportedAt?: string
}
