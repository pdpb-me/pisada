import { CheckIcon, CircleDashedIcon, MinusIcon } from 'lucide-react'
import type { DaySession, Status } from '@/hooks/use-day'
import type { PainBand } from '@/lib/pain'
import { painAreaFor } from '@/lib/pain-areas'

// Small status icons instead of coloured blocks
export const STATUS_ICON: Record<Status, { icon: typeof CheckIcon; label: string; className: string }> = {
  done: { icon: CheckIcon, label: 'Done', className: 'text-status-done' },
  partial: { icon: CircleDashedIcon, label: 'Partial', className: 'text-status-partial' },
  skipped: { icon: MinusIcon, label: 'Skipped', className: 'text-status-skipped' },
}

export const PAIN_DOT: Record<PainBand, string> = {
  low: 'bg-pain-low',
  mid: 'bg-pain-mid',
  high: 'bg-pain-high',
}

// The pain score asked during this session, if any
export function sessionPain(session: DaySession) {
  const area = painAreaFor(session.kind)
  const score =
    session.log?.symptoms.find((s) => s.body_area === area?.body_area && s.timing === 'during')?.score ?? null
  return { area, score }
}
