// "It came with": what Pedro noticed came with the evening's neck pain or hand tingling.
// Stored in symptoms.triggers on that area's evening row. His own answer: never filled in
// from the watch (a bike day doesn't mean the bike caused it). Optional, several or none.
export const TRIGGERS = [
  { value: 'bike', label: 'Bike' },
  { value: 'desk', label: 'Desk' },
  { value: 'sleep', label: 'Sleep' }, // woke up with it
  { value: 'run', label: 'Run' },
  { value: 'other', label: 'Other' },
] as const

export type Trigger = (typeof TRIGGERS)[number]['value']

export const isTrigger = (s: string): s is Trigger => TRIGGERS.some((t) => t.value === s)

const labelOf = (t: string) => TRIGGERS.find((x) => x.value === t)?.label ?? t

// How many days each one was named, most first (ties in the chips' order)
export function triggerCounts(rows: { date: string; triggers?: string[] | null }[]) {
  const days = new Map<string, Set<string>>()
  for (const r of rows) for (const t of r.triggers ?? []) days.set(t, (days.get(t) ?? new Set()).add(r.date))
  const order = (t: string) => TRIGGERS.findIndex((x) => x.value === t)
  return [...days]
    .map(([t, d]) => ({ trigger: t, label: labelOf(t), days: d.size }))
    .sort((a, b) => b.days - a.days || order(a.trigger) - order(b.trigger))
}

// "You said it came with: Desk on 9 days, Bike on 4, Sleep on 1." (null when he never said)
export function triggerSentence(counts: { label: string; days: number }[]) {
  if (!counts.length) return null
  const parts = counts.map((c, i) => `${c.label} on ${c.days}${i === 0 ? (c.days === 1 ? ' day' : ' days') : ''}`)
  return `You said it came with: ${parts.join(', ')}.`
}
