// Run–walk ladder: shared wording and number format

// Minutes as "1,5" (Pedro's decimal comma), whole numbers as they are
export function num(n: number | string) {
  const v = Number(n)
  return Number.isInteger(v) ? String(v) : String(v).replace('.', ',')
}

export const LADDER_RULES =
  'Clean = no arch niggle, or ≤ 3/10 during that’s back to baseline next morning. ' +
  'Up a step after 2 clean runs in a row; a niggle that lingers holds the step; ' +
  'over 3/10 drops one. Decided at the weekly check-in.'
