// Which check-in Today asks for, and how. One rule, so the morning and the evening never
// both push at once.
//   morning (right arch at first steps): asked from the start of the day until answered
//   evening (neck and hands over the whole day): asked from 18:00; earlier it waits quietly
// Past days can be filled in; future days ask nothing.
export type Ask = 'now' | 'later' | 'fill-in' | 'none'

export const EVENING_FROM = 18

export function dueCheckIns(date: string, today: string, hour: number): { morning: Ask; evening: Ask } {
  if (date > today) return { morning: 'none', evening: 'none' }
  if (date < today) return { morning: 'fill-in', evening: 'fill-in' }
  // the app's day runs 04:00 → 04:00, so 00:00–03:59 is still the evening
  const evening = hour >= EVENING_FROM || hour < 4
  return { morning: 'now', evening: evening ? 'now' : 'later' }
}
