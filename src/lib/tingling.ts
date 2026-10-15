// Hand tingling, asked in the evening check-in. Stored in symptoms as
// body_area 'hands', context 'tingling', score 0 / 2 / 5 (bands match the pain colours).
import type { PainBand } from '@/lib/pain'

export const TINGLING_LEVELS = [
  { score: 0, label: 'None', band: 'low' },
  { score: 2, label: 'A bit', band: 'low' },
  { score: 5, label: 'A lot', band: 'mid' },
] as const satisfies readonly { score: number; label: string; band: PainBand }[]

export function tinglingLevelFor(score: number) {
  if (score === 0) return 0
  return score <= 3 ? 2 : 5
}

export function tinglingLabel(score: number) {
  return TINGLING_LEVELS.find((l) => l.score === tinglingLevelFor(score))!.label
}
