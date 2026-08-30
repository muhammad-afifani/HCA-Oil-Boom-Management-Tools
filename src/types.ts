// Core domain types for the Oil Boom Management Tool

export type LocationType = 'pos' | 'sumur' | 'platform' | 'cluster' | 'lainnya'

/** A non-boom item stocked at a location (mainly the central warehouse) — informational only. */
export interface OtherStockItem {
  id: string
  name: string
  quantity: number
  unit: string
  notes?: string
}

export interface MapLocation {
  id: string
  name: string
  code?: string
  type: LocationType
  lat: number
  lng: number
  area?: string // e.g. sub-area / field name
  description?: string
  /** Marks a pos as the central backup warehouse (e.g. "OSR Warehouse") — shown distinctly on the map. */
  isWarehouse?: boolean
  /** Other spill-response equipment kept alongside boom at this location (mainly the warehouse). */
  otherItems?: OtherStockItem[]
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

/** An extra pos tapped to cover a shortfall beyond what sourcePosId/quantityUnits alone can supply. */
export interface LoanAllocation {
  posId: string
  quantityUnits: number
}

export interface LoanRequest {
  id: string
  requestNumber: string
  requesterName: string
  entity: string
  ext: string
  email?: string
  boomFunction: string
  workDescription: string
  siteLocationId: string
  /** Primary/main pos this loan draws from. Its own share is quantityUnits minus whatever additionalSources cover. */
  sourcePosId: string
  quantityUnits: number
  unitLengthMeters: number
  /** Optional split allocation: other pos tapped when sourcePosId alone can't cover quantityUnits. */
  additionalSources?: LoanAllocation[]
  requestDate: string
  startDate: string
  endDate: string
  /** True when the planned end date isn't known yet ("TBC") — endDate may be blank in that case. */
  endDateTBC?: boolean
  actualReturnDate?: string
  /**
   * Where the boom physically ended up once this loan reached "Selesai".
   * 'pos' (default) = hauled back to sourcePosId, folded back into normal pos stock.
   * 'standby' = left on standby at siteLocationId instead of being transported back — the next
   * request can pick it up directly from there without waiting for a pos run.
   */
  returnedTo?: 'pos' | 'standby'
  status: LoanStatus
  priority: LoanPriority
  notes?: string
  approvedBy?: string
  installedAt?: string
  installedPhotoDataUrl?: string
  installedNotes?: string
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  companyName: string
  siteName: string
  centerLat: number
  centerLng: number
  defaultUnitLengthMeters: number
  /** Company logo (PNG, uploaded by the user) shown in the sidebar and browser tab favicon. */
  logoDataUrl?: string
}

export interface AppDatabase {
  version: number
  settings: AppSettings
  locations: MapLocation[]
  stockBatches: StockBatch[]
  loans: LoanRequest[]
  exportedAt?: string
  /** 'auto' = ranked by computed urgency; 'manual' = user drag-reordered override. Optional for backward-compat with older exports. */
  priorityMode?: PriorityMode
  /** Loan IDs in manual rank order (only meaningful when priorityMode === 'manual'). */
  priorityOrder?: string[]
}

export type PriorityMode = 'auto' | 'manual'
