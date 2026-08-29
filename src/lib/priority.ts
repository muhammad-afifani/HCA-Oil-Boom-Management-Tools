import type { LoanPriority, LoanRequest } from '../types'
import { daysFromToday } from './date'
import { effectiveLoanStatus, isLoanOpen, loanDaysRemaining } from './inventory'

// Lower score = more urgent = ranked first.
const STATUS_TIER: Record<string, number> = {
  Terlambat: 0,
  Aktif: 1,
  Disetujui: 2,
  Pending: 3,
}

const PRIORITY_WEIGHT: Record<LoanPriority, number> = {
  Urgent: 0,
  Tinggi: 1,
  Normal: 2,
}

export function urgencyScore(loan: LoanRequest): number {
  const status = effectiveLoanStatus(loan)
  const tier = STATUS_TIER[status] ?? 9
  const priorityBoost = PRIORITY_WEIGHT[loan.priority] ?? 2

  let dateComponent: number
  if (status === 'Disetujui') {
    dateComponent = daysFromToday(loan.startDate) // sooner to start (or overdue to start) = more urgent
  } else if (status === 'Pending') {
    dateComponent = daysFromToday(loan.requestDate) // longer waiting (older request) = more urgent
  } else {
    // Aktif / Terlambat: closer to / past due date = more urgent. TBC (no known end date)
    // sinks to the bottom of its tier since there's nothing to be urgent about yet.
    const days = loanDaysRemaining(loan)
    dateComponent = days === null ? 999999 : days
  }

  return tier * 100000 + dateComponent * 10 + priorityBoost
}

export function computeAutoOrderIds(loans: LoanRequest[]): string[] {
  return loans
    .filter(isLoanOpen)
    .slice()
    .sort((a, b) => urgencyScore(a) - urgencyScore(b))
    .map((l) => l.id)
}

/**
 * Resolves the display order of open loans.
 * - 'auto': always freshly computed from urgencyScore.
 * - 'manual': follows storedOrder, with any open loans missing from it
 *   (newly created, or freshly re-opened) appended in auto order.
 */
export function resolveOrderedLoans(
  loans: LoanRequest[],
  mode: 'auto' | 'manual',
  storedOrder: string[],
): LoanRequest[] {
  const openLoans = loans.filter(isLoanOpen)
  const byId = new Map(openLoans.map((l) => [l.id, l]))

  if (mode === 'auto') {
    return computeAutoOrderIds(loans).map((id) => byId.get(id)!)
  }

  const known = new Set(storedOrder)
  const ordered = storedOrder.filter((id) => byId.has(id)).map((id) => byId.get(id)!)
  const missing = computeAutoOrderIds(loans).filter((id) => !known.has(id))
  return [...ordered, ...missing.map((id) => byId.get(id)!)]
}
