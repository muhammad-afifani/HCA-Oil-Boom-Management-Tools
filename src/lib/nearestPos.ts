import type { LoanRequest, MapLocation, StockBatch } from '../types'
import { distanceKm } from './geo'
import { summarizePosStock, type PosStockSummary } from './inventory'
import { getForecastSupply, getAllStandbySupply, type ForecastSupply } from './standby'

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

export interface StandbyOption {
  site: MapLocation
  distanceKm: number
  availableUnits: number
  unitLengthMeters: number
  sufficient: boolean
}

/** Nearest "standby at site" boom (already sitting idle at a finished job, no pos run needed). */
export function getNearestStandbyOptions(
  locations: MapLocation[],
  loans: LoanRequest[],
  siteId: string | undefined,
  quantityNeeded: number,
  excludeLoanId?: string,
): StandbyOption[] {
  const site = locations.find((l) => l.id === siteId)
  const effectiveLoans = excludeLoanId ? loans.filter((l) => l.id !== excludeLoanId) : loans

  return getAllStandbySupply(effectiveLoans, locations)
    .map((s) => ({
      site: s.site,
      distanceKm: site ? distanceKm(site.lat, site.lng, s.site.lat, s.site.lng) : 0,
      availableUnits: s.availableUnits,
      unitLengthMeters: s.unitLengthMeters,
      sufficient: s.availableUnits >= quantityNeeded,
    }))
    .sort((a, b) => {
      if (a.sufficient !== b.sufficient) return a.sufficient ? -1 : 1
      return a.distanceKm - b.distanceKm
    })
}

/** Boom due back soon at nearby sites — informational forecast, not yet pickable. */
export function getNearbyForecastSupply(
  locations: MapLocation[],
  loans: LoanRequest[],
  siteId: string | undefined,
  withinDays = 14,
): (ForecastSupply & { distanceKm: number })[] {
  const site = locations.find((l) => l.id === siteId)
  return getForecastSupply(loans, locations, withinDays).map((f) => ({
    ...f,
    distanceKm: site ? distanceKm(site.lat, site.lng, f.site.lat, f.site.lng) : 0,
  }))
}
