// How dates, times and amounts read in the app (British English, day before month)
import { addDays, daysBetween } from '@/lib/dates'

const noon = (iso: string) => new Date(`${iso}T12:00:00`)
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString('en-GB', o)

export const weekday = (iso: string) => fmt(iso, { weekday: 'long' }) // 'Thursday'
export const weekdayShort = (iso: string) => fmt(iso, { weekday: 'short' }) // 'Thu'
export const weekdayLetter = (iso: string) => fmt(iso, { weekday: 'narrow' }) // 'T'
export const dayMonth = (iso: string) => fmt(iso, { day: 'numeric', month: 'short' }) // '19 Nov'
export const dayLabel = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' }) // 'Thu 19 Nov'
export const longDate = (iso: string) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' }) // 'Thursday 19 November'
export const monthName = (month: string) => fmt(`${month}-01`, { month: 'long', year: 'numeric' }) // 'November 2026'

// 'Today', 'Yesterday', 'Tomorrow', else 'Thu 19 Nov'
export function relativeDay(iso: string, today: string) {
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  if (iso === addDays(today, 1)) return 'Tomorrow'
  return dayLabel(iso)
}

// 'in 3 days', 'tomorrow', 'today', '2 days ago'
export function inDays(iso: string, today: string) {
  const n = daysBetween(today, iso)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

export const time = (at: Date) => at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// '33 min', '1 h 05'
export function duration(seconds: number | null | undefined) {
  if (seconds == null) return '–'
  const m = Math.round(seconds / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

export const km = (metres: number) => `${(metres / 1000).toFixed(1)} km`

// Numbers as text use a point (the weight box accepts a comma too)
export const decimal = (n: number | string, digits?: number) => {
  const v = Number(n)
  return digits != null ? v.toFixed(digits) : String(v)
}

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`
