// Hand tingling, asked in the evening check-in. Stored in symptoms as body_area 'hands',
// context 'tingling'. The question changed on TINGLING_SINCE:
// - before: how strong, None / A bit / A lot, stored 0 / 2 / 5
// - from then: how much of the day, None / Moments / Hours / Most of the day, stored 0 / 2 / 5 / 8
// An answer keeps the words it was given in: the date decides. Don't compare the two scales
// as one; days with tingling (score > 0) mean the same on both. Bands match the pain colours.
// (The coach has the same rule: tinglingWord in supabase/functions/_shared/coach.ts.)
import type { PainBand } from '@/lib/pain'

export const TINGLING_SINCE = '2026-11-13'

type Level = { score: number; label: string; band: PainBand }

export const OLD_TINGLING_LEVELS = [
  { score: 0, label: 'None', band: 'low' },
  { score: 2, label: 'A bit', band: 'low' },
  { score: 5, label: 'A lot', band: 'mid' },
] as const satisfies readonly Level[]

export const TINGLING_LEVELS = [
  { score: 0, label: 'None', band: 'low' },
  { score: 2, label: 'Moments', band: 'low' },
  { score: 5, label: 'Hours', band: 'mid' },
  { score: 8, label: 'Most of the day', band: 'high' },
] as const satisfies readonly Level[]

export const isNewTingling = (date: string) => date >= TINGLING_SINCE

// The words asked on that day
export const tinglingLevels = (date: string): readonly Level[] => (isNewTingling(date) ? TINGLING_LEVELS : OLD_TINGLING_LEVELS)

// Any 0–10 score maps to the level whose band it's in, on that day's scale
export function tinglingLevelFor(score: number, date: string) {
  if (score === 0) return 0
  if (score <= 3) return 2
  if (!isNewTingling(date) || score <= 6) return 5
  return 8
}

export function tinglingLabel(score: number, date: string) {
  const level = tinglingLevelFor(score, date)
  return tinglingLevels(date).find((l) => l.score === level)!.label
}

// "Hours or more": the new scale's long days (none on the old scale)
export const tinglingLong = (score: number, date: string) => isNewTingling(date) && score >= 5

// Which hand (symptoms.side on the hands row)
export const HANDS = [
  { value: 'L', label: 'Left' },
  { value: 'R', label: 'Right' },
  { value: 'B', label: 'Both' },
] as const
export type Hand = (typeof HANDS)[number]['value']
export const isHand = (s: string | null | undefined): s is Hand => HANDS.some((h) => h.value === s)
