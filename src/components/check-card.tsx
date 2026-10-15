import type { LucideIcon } from 'lucide-react'
import { PAIN_DOT } from '@/lib/session-status'
import { painBand } from '@/lib/pain'
import { cn } from '@/lib/utils'

// A half-width card for a daily check-in: title + icon, what it asks, then the answer
// (with its pain colour and word) or the question to tap.
export function CheckCard({
  title,
  icon: Icon,
  asks,
  answers,
  prompt,
  onClick,
}: {
  title: string
  icon: LucideIcon
  asks: string
  answers: { label: string; score: number }[]
  prompt: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-32 flex-col gap-1.5 rounded-[18px] bg-card p-3.5 text-left text-card-foreground ring-1 ring-foreground/10"
    >
      <span className="flex items-start justify-between">
        <span className="text-[15px] font-semibold">{title}</span>
        <Icon className="size-[18px] text-primary" />
      </span>
      <span className="text-xs text-muted-foreground">{asks}</span>
      <span className="mt-auto flex flex-col gap-0.5">
        {answers.length > 0 ? (
          answers.map((a) => (
            <span key={a.label} className="flex items-center gap-1.5 text-base font-semibold">
              <span className={cn('size-2 rounded-full', PAIN_DOT[painBand(a.score)])} />
              {a.label}
            </span>
          ))
        ) : (
          <span className="text-base font-semibold text-primary">{prompt}</span>
        )}
      </span>
    </button>
  )
}
