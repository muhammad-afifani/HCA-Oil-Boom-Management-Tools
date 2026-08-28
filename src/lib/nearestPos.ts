import type { LoanRequest, MapLocation, StockBatch } from '../types'
import { distanceKm } from './geo'
import { summarizePosStock, type PosStockSummary } from './inventory'

export interface PosOption {
  pos: MapLocation
  distanceKm: number
  stock: PosStockSummary
  sufficient: boolean
}

export function getNearestPosOptions(
  locations: MapLocation[],
  batches: StockBatch[],
  loans: LoanRequest[],
  siteId: string | undefined,
  quantityNeeded: number,
  excludeLoanId?: string,
): PosOption[] {
  const site = locations.find((l) => l.id === siteId)
  const posList = locations.filter((l) => l.type === 'pos')
  const effectiveLoans = excludeLoanId ? loans.filter((l) => l.id !== excludeLoanId) : loans

  return posList
    .map((pos) => {
      const stock = summarizePosStock(batches, effectiveLoans, pos.id)
      const dist = site ? distanceKm(site.lat, site.lng, pos.lat, pos.lng) : 0
      return {
        pos,
        distanceKm: dist,
        stock,
        sufficient: stock.availableUnits >= quantityNeeded,
      }
    })
    .sort((a, b) => {
      if (a.sufficient !== b.sufficient) return a.sufficient ? -1 : 1
      return a.distanceKm - b.distanceKm
    })
}
