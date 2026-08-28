import type { LoanRequest, StockBatch } from '../types'
import { daysFromToday, todayISO } from './date'

// Statuses that still hold stock "out" of the post (reserved or in use).
export const RESERVING_STATUSES: LoanRequest['status'][] = ['Pending', 'Disetujui', 'Aktif']

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
    .filter((l) => l.sourcePosId === posId && RESERVING_STATUSES.includes(l.status))
    .reduce((sum, l) => sum + l.quantityUnits, 0)

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
  return loan.status === 'Aktif' && daysFromToday(loan.endDate) < 0
}

export function effectiveLoanStatus(loan: LoanRequest): LoanRequest['status'] | 'Terlambat' {
  if (isLoanOverdue(loan)) return 'Terlambat'
  return loan.status
}

export function loanDaysRemaining(loan: LoanRequest): number {
  return daysFromToday(loan.endDate)
}

export function isLoanOpen(loan: LoanRequest): boolean {
  return RESERVING_STATUSES.includes(loan.status)
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
