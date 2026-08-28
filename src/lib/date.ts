export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

export function diffDays(startIso: string, endIso: string): number {
  const start = parseDate(startIso).getTime()
  const end = parseDate(endIso).getTime()
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

export function daysFromToday(iso: string): number {
  return diffDays(todayISO(), iso)
}

export function formatDateID(iso?: string): string {
  if (!iso) return '-'
  return parseDate(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function planDurationDays(startIso: string, endIso: string): number {
  return diffDays(startIso, endIso) + 1
}
