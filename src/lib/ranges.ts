// The time ranges of the detail screens
export const RANGES = [
  { id: '4w', days: 28, label: '4 weeks', text: 'last 4 weeks', before: 'the 4 weeks before' },
  { id: '3m', days: 91, label: '3 months', text: 'last 3 months', before: 'the 3 months before' },
  { id: '6m', days: 182, label: '6 months', text: 'last 6 months', before: 'the 6 months before' },
] as const
export type Range = (typeof RANGES)[number]
export type RangeId = Range['id']
