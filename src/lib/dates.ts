// Dates are stored as plain 'YYYY-MM-DD' in the phone's local time zone,
// so "today" means today where you are, not in UTC.

export function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

// 'Wednesday 14 October'
export function longDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// Monday to Sunday of the week that contains this date
export function weekOf(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  const monday = addDays(iso, -((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}
