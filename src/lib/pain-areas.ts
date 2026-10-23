// Which pain question a session asks, by its kind. Kinds not listed ask nothing.
// Adding a knee or a new kind later is one line here.
import { kindOf } from '@/data/rules'

export type PainArea = { body_area: string; side: string | null; label: string; short: string }

const ARCH: PainArea = { body_area: 'arch', side: 'R', label: 'Right arch, during', short: 'Arch' }

const BY_KIND: Record<string, PainArea> = {
  tendon: ARCH,
  run: ARCH,
  stability: ARCH,
  // neck: not asked during its session. Neck pain shows up over the day (bike, PC, after runs),
  // so the evening check-in asks it instead.
  test: ARCH, // heel-raise test: stop if pain goes above 3/10
  hike: ARCH, // no run log or ladder step: only kind 'run' gets those
}

export function painAreaFor(kind: string): PainArea | null {
  return BY_KIND[kindOf(kind)] ?? null
}
