import type { LoanRequest, MapLocation } from '../types'
import { loanDaysRemaining, reservedUnitsAtLocation } from './inventory'

/**
 * Boom that finished a job but was left standby at the work site instead of being hauled
 * back to a pos — the next request can draw from it directly, no pos run needed.
 */
export interface StandbySupply {
  site: MapLocation
  availableUnits: number
  unitLengthMeters: number
  standbyLoans: LoanRequest[]
}

export function summarizeStandbyAtSite(loans: LoanRequest[], site: MapLocation): StandbySupply {
  const standbyLoans = loans.filter(
    (l) => l.status === 'Selesai' && l.returnedTo === 'standby' && l.siteLocationId === site.id,
  )
  const baseUnits = standbyLoans.reduce((sum, l) => sum + l.quantityUnits, 0)
  const reservedUnits = reservedUnitsAtLocation(loans, site.id)
  const availableUnits = Math.max(0, baseUnits - reservedUnits)
  const unitLengthMeters = standbyLoans[0]?.unitLengthMeters ?? 15
  return { site, availableUnits, unitLengthMeters, standbyLoans }
}

export function getAllStandbySupply(loans: LoanRequest[], locations: MapLocation[]): StandbySupply[] {
  const siteIds = new Set(
    loans.filter((l) => l.status === 'Selesai' && l.returnedTo === 'standby').map((l) => l.siteLocationId),
  )
  return Array.from(siteIds)
    .map((id) => locations.find((l) => l.id === id))
    .filter((site): site is MapLocation => !!site)
    .map((site) => summarizeStandbyAtSite(loans, site))
    .filter((s) => s.availableUnits > 0)
}

/** Boom still in active use, but due back soon (or overdue) — a preview of what will free up and where. */
export interface ForecastSupply {
  loan: LoanRequest
  site: MapLocation
  daysUntil: number
}

export function getForecastSupply(loans: LoanRequest[], locations: MapLocation[], withinDays = 14): ForecastSupply[] {
  return loans
    .filter((l) => l.status === 'Aktif')
    .map((l) => {
      const days = loanDaysRemaining(l)
      const site = locations.find((loc) => loc.id === l.siteLocationId)
      return days !== null && site ? { loan: l, site, daysUntil: days } : null
    })
    .filter((f): f is ForecastSupply => f !== null && f.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}
