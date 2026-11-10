// What Pedro thought of a video after doing it: one tap, optional. Not pain and not a
// status, so no colour. Stored in video_feedback.rating (see supabase/migrations).
export const RATINGS = [
  { value: 'keep', label: 'Keep' },
  { value: 'easy', label: 'Too easy' },
  { value: 'hard', label: 'Too hard' },
  { value: 'irritated', label: 'Irritated' },
  { value: 'drop', label: 'Don’t show again' },
] as const

export type VideoRating = (typeof RATINGS)[number]['value']

export const isRating = (s: string): s is VideoRating => RATINGS.some((r) => r.value === s)

export const ratingLabel = (rating: string) => RATINGS.find((r) => r.value === rating)?.label ?? rating

// The grey line under a video on the session screen: this session's rating, else the
// latest one from another session ("Last time"), else nothing
export function ratingLine(mine: string | undefined, last: { rating: string } | undefined) {
  if (mine) return `You said: ${ratingLabel(mine)}`
  if (last) return `Last time: ${ratingLabel(last.rating)}`
  return null
}
