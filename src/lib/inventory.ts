import type { LoanAllocation, LoanRequest, StockBatch } from '../types'
import { daysFromToday, todayISO } from './date'

// Statuses that still hold stock "out" of the post (reserved or in use).
export const RESERVING_STATUSES: LoanRequest['status'][] = ['Pending', 'Disetujui', 'Aktif']

/**
 * Full breakdown of which pos this loan draws from, including the primary
 * pos (sourcePosId) and any optional split allocations (additionalSources)
 * used when the primary pos alone couldn't cover quantityUnits.
 */
export function getLoanAllocations(loan: LoanRequest): LoanAllocation[] {
  const extra = loan.additionalSources ?? []
  const extraTotal = extra.reduce((sum, a) => sum + a.quantityUnits, 0)
  const primaryQty = Math.max(0, loan.quantityUnits - extraTotal)
  const allocations: LoanAllocation[] = []
  if (primaryQty > 0) allocations.push({ posId: loan.sourcePosId, quantityUnits: primaryQty })
  for (const a of extra) {
    if (a.quantityUnits > 0) allocations.push(a)
  }
  return allocations
}

export interface PosStockSummary {
  posId: string
  baikUnits: number
  rusakRinganUnits: number
  rusakBeratUnits: number
  usableUnits: number // baik + rusak ringan (bisa dipakai)
  totalUnits: number
  reservedUnits: number
  availableUnits: number
  unitLengthMeters: number
  totalMeters: number
  availableMeters: number
}

export function summarizePosStock(
  batches: StockBatch[],
  loans: LoanRequest[],
  posId: string,
): PosStockSummary {
  const posBatches = batches.filter((b) => b.posId === posId)
  const baikUnits = sumUnits(posBatches, 'Baik')
  const rusakRinganUnits = sumUnits(posBatches, 'Rusak Ringan')
  const rusakBeratUnits = sumUnits(posBatches, 'Rusak Berat')
  const usableUnits = baikUnits + rusakRinganUnits
  const totalUnits = usableUnits + rusakBeratUnits

  const reservedUnits = loans
    .filter((l) => RESERVING_STATUSES.includes(l.status))
    .reduce((sum, l) => {
      const forThisPos = getLoanAllocations(l).find((a) => a.posId === posId)
      return sum + (forThisPos?.quantityUnits ?? 0)
    }, 0)

  const availableUnits = Math.max(0, usableUnits - reservedUnits)

  // Weighted-average unit length for meter conversion (fallback to 15m default).
  const totalMeters = posBatches.reduce((sum, b) => sum + b.quantityUnits * b.unitLengthMeters, 0)
  const unitLengthMeters = totalUnits > 0 ? totalMeters / (usableUnits + rusakBeratUnits || 1) : 15
  const availableMeters = Math.round(availableUnits * unitLengthMeters)

  return {
    posId,
    baikUnits,
    rusakRinganUnits,
    rusakBeratUnits,
    usableUnits,
    totalUnits,
    reservedUnits,
    availableUnits,
    unitLengthMeters,
    totalMeters,
    availableMeters,
  }
}

function sumUnits(batches: StockBatch[], condition: StockBatch['condition']): number {
  return batches
    .filter((b) => b.condition === condition)
    .reduce((sum, b) => sum + b.quantityUnits, 0)
}

export function isLoanOverdue(loan: LoanRequest): boolean {
  if (loan.endDateTBC || !loan.endDate) return false
  return loan.status === 'Aktif' && daysFromToday(loan.endDate) < 0
}

export function effectiveLoanStatus(loan: LoanRequest): LoanRequest['status'] | 'Terlambat' {
  if (isLoanOverdue(loan)) return 'Terlambat'
  return loan.status
}

/** Days until the planned end date, or null when it's TBC / not yet set. */
export function loanDaysRemaining(loan: LoanRequest): number | null {
  if (loan.endDateTBC || !loan.endDate) return null
  return daysFromToday(loan.endDate)
}

export function isLoanOpen(loan: LoanRequest): boolean {
  return RESERVING_STATUSES.includes(loan.status)
}

/** Short human label for a loan's remaining time to its planned end date ("3 hari lagi", "Lewat 2 hari", "TBC"). */
export function loanCountdownText(loan: LoanRequest): string {
  const days = loanDaysRemaining(loan)
  if (days === null) return 'TBC'
  if (days < 0) return `Lewat ${Math.abs(days)} hari`
  if (days === 0) return 'Selesai hari ini'
  return `${days} hari lagi`
}

// Internal status values stay stable (data, Excel/JSON, comparisons); this only maps to
// what's shown to the user, so "Aktif" reads as "Sedang Dipakai" everywhere in the UI.
export const LOAN_STATUS_LABELS: Record<string, string> = {
  Pending: 'Pending',
  Disetujui: 'Disetujui',
  Aktif: 'Sedang Dipakai',
  Selesai: 'Selesai',
  Dibatalkan: 'Dibatalkan',
  Terlambat: 'Terlambat',
}

export function loanStatusLabel(status: string): string {
  return LOAN_STATUS_LABELS[status] ?? status
}

export interface CompanySummary {
  totalUnits: number
  usableUnits: number
  damagedUnits: number
  reservedUnits: number
  availableUnits: number
  totalMeters: number
  availableMeters: number
  activeLoans: number
  overdueLoans: number
  pendingLoans: number
  postsCount: number
  sitesCount: number
}

export function summarizeCompany(
  batches: StockBatch[],
  loans: LoanRequest[],
  posIds: string[],
  sitesCount: number,
): CompanySummary {
  const perPos = posIds.map((id) => summarizePosStock(batches, loans, id))
  const totalUnits = perPos.reduce((s, p) => s + p.totalUnits, 0)
  const usableUnits = perPos.reduce((s, p) => s + p.usableUnits, 0)
  const damagedUnits = perPos.reduce((s, p) => s + p.rusakBeratUnits, 0)
  const reservedUnits = perPos.reduce((s, p) => s + p.reservedUnits, 0)
  const availableUnits = perPos.reduce((s, p) => s + p.availableUnits, 0)
  const totalMeters = perPos.reduce((s, p) => s + p.totalMeters, 0)
  const availableMeters = perPos.reduce((s, p) => s + p.availableMeters, 0)

  const activeLoans = loans.filter((l) => l.status === 'Aktif').length
  const overdueLoans = loans.filter(isLoanOverdue).length
  const pendingLoans = loans.filter((l) => l.status === 'Pending').length

  return {
    totalUnits,
    usableUnits,
    damagedUnits,
    reservedUnits,
    availableUnits,
    totalMeters,
    availableMeters,
    activeLoans,
    overdueLoans,
    pendingLoans,
    postsCount: posIds.length,
    sitesCount,
  }
}

export function todaysDate(): string {
  return todayISO()
}
