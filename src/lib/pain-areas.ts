// Which pain question a session asks, by its kind. Kinds not listed ask nothing.
// Adding a knee or a new kind later is one line here.
export type PainArea = { body_area: string; side: string | null; label: string; short: string }

const ARCH: PainArea = { body_area: 'arch', side: 'R', label: 'Right arch, during', short: 'Arch' }
const NECK: PainArea = { body_area: 'neck', side: 'C', label: 'Neck, during', short: 'Neck' }

const BY_KIND: Record<string, PainArea> = {
  tendon: ARCH,
  run: ARCH,
  stability: ARCH,
  neck: NECK,
}

export function painAreaFor(kind: string): PainArea | null {
  return BY_KIND[kind] ?? null
}
