// Which exercises are measured tests, and what the app asks for.
// A session whose exercises include one of these gets Left / Right number boxes
// in its log, saved to the tests table (one row per side). Adding a test is one line here.
export type TestSpec = { test: string; unit: string; label: string }

const BY_EXERCISE: Record<string, TestSpec> = {
  sl_heel_raise_test: { test: 'sl_heel_raise', unit: 'reps', label: 'Reps per side' },
}

export function testFor(exercises: string[]): TestSpec | null {
  for (const slug of exercises) if (BY_EXERCISE[slug]) return BY_EXERCISE[slug]
  return null
}

export type Side = 'L' | 'R'
export const SIDES: { side: Side; label: string }[] = [
  { side: 'L', label: 'Left' },
  { side: 'R', label: 'Right' },
]
