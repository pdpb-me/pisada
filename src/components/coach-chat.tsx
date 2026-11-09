import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowUpIcon } from 'lucide-react'
import { CardSkeleton, EmptyNote, ErrorCard } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { DemoCoachNotice } from '@/data/backend'
import { CHAT_MAX_CHARS, LIMITS } from '@/data/rules'
import { sendChat, write } from '@/data/store'
import type { ChatMessage, Proposal } from '@/data/types'
import { useChatMessages, useChatProposals } from '@/hooks/use-data'
import { placeProposals } from '@/lib/chat-items'
import { useToday } from '@/lib/clock'
import { appDay } from '@/lib/dates'
import { relativeDay } from '@/lib/format'
import { cn } from '@/lib/utils'

const SUGGESTIONS = ['What do I do today?', 'How is my arch doing?', 'Let’s do the weekly check-in']
const TALLEST_BOX = 160 // px; a longer message scrolls inside the box
const NEAR_END = 120 // px

// What Pedro is writing and the message on its way live outside the screen: they stay when
// he looks at another tab, and a reply that arrives (or fails) meanwhile still lands here
type Chat = {
  draft: string
  sending: boolean
  failed: string | null
  pending: { text: string; reply: string; lastId?: string } | null
}
let chat: Chat = { draft: '', sending: false, failed: null, pending: null }
const listeners = new Set<() => void>()
const setChat = (change: Partial<Chat>) => {
  chat = { ...chat, ...change }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

// His words are dark, like a chosen answer; the coach's are a white card
function Bubble({ role, children }: { role: ChatMessage['role']; children: string }) {
  return (
    <p
      className={cn(
        'max-w-[88%] rounded-xl px-3.5 py-2.5 text-base leading-relaxed wrap-anywhere whitespace-pre-wrap',
        role === 'user' ? 'self-end bg-foreground text-background' : 'self-start bg-card ring-1 ring-foreground/10',
      )}
    >
      {children}
    </p>
  )
}

const DECIDED: Record<string, string> = {
  applied: 'Applied: the plan is updated.',
  declined: 'Not applied.',
  stale: 'Not applied: the plan changed in the meantime. Ask the coach again.',
  replaced: 'Replaced by a newer proposal.',
}

// What the coach proposes: the plan changes only with Apply
function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [busy, setBusy] = useState(false)
  const pending = proposal.status === 'pending'
  const decide = async (apply: boolean) => {
    setBusy(true)
    await write.decideProposal(proposal.id, apply)
    setBusy(false)
  }
  return (
    <Card className="gap-3 px-4 py-4" aria-label="The coach’s proposal">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">Proposal</span>
        <p className="text-base font-semibold">{proposal.summary}</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {proposal.lines.map((line, i) => (
          <li key={i} className="wrap-anywhere">
            {line}
          </li>
        ))}
      </ul>
      {pending ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 rounded-full" disabled={busy} onClick={() => void decide(false)}>
            No
          </Button>
          <Button className="h-11 rounded-full" disabled={busy} onClick={() => void decide(true)}>
            Apply
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{DECIDED[proposal.status] ?? proposal.status}</p>
      )}
    </Card>
  )
}

// The chat with the coach. Saved messages come from the backend; the one being sent and
// its reply show here until they are saved. The box stays above the tab bar, in the flow
// of the page, so the phone's keyboard can push it up by itself.
export function CoachChat() {
  const today = useToday()
  const messages = useChatMessages()
  const proposals = useChatProposals().data
  const { draft: text, sending, failed, pending } = useSyncExternalStore(subscribe, () => chat)
  const setText = (draft: string) => setChat({ draft })
  const box = useRef<HTMLTextAreaElement>(null)
  const followEnd = useRef(true)

  const saved = messages.data
  // stays until the saved messages include this exchange, so nothing flashes away
  const last = saved?.at(-1)
  const showPending = pending && !(last && last.id !== pending.lastId && last.role === 'coach')
  const cards = placeProposals(saved ?? [], proposals ?? [])

  // Grows with the text (not every browser can do it with CSS alone)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    // scrollHeight leaves the border out: without it the box would scroll by a hair
    el.style.height = `${Math.min(el.scrollHeight + el.offsetHeight - el.clientHeight, TALLEST_BOX)}px`
    // a taller box shouldn't cover the last message
    if (followEnd.current) window.scrollTo(0, document.documentElement.scrollHeight)
  }, [text, saved])

  // Reading older messages: a new word shouldn't pull him back to the end
  useEffect(() => {
    const onScroll = () => {
      followEnd.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - NEAR_END
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    if (followEnd.current) window.scrollTo(0, document.documentElement.scrollHeight)
  }, [saved?.length, proposals?.length, pending?.reply, failed])

  const send = async () => {
    const message = text.trim()
    if (chat.sending || !saved || !LIMITS.chat(message)) return
    followEnd.current = true
    setChat({ draft: '', failed: null, sending: true, pending: { text: message, reply: '', lastId: last?.id } })
    const problem = await sendChat(message, (reply) => setChat({ pending: chat.pending && { ...chat.pending, reply } }))
    setChat({ sending: false })
    if (problem) {
      // nothing he wrote is lost, unless he has started another message
      setChat({ pending: null, failed: problem, draft: chat.draft || message })
    }
  }

  return (
    // The box sits right on the tab bar (64 px + its 1 px border), inside the room App keeps
    // for it: where it stops at the end of the page is where it sticks, so it covers nothing
    <main className="mx-auto -mb-[15px] flex min-h-[calc(100svh-4rem)] max-w-md flex-col">
      <header className="border-b bg-card px-4 pt-4 pb-3">
        <h1 className="text-display font-bold">Coach</h1>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-4" role="log" aria-label="Messages" aria-busy={sending}>
        {DemoCoachNotice && <p className="text-sm text-muted-foreground">{DemoCoachNotice}</p>}
        {messages.error && !saved && <ErrorCard what="the chat" onRetry={messages.retry} />}
        {!messages.error && !saved && <CardSkeleton />}
        {saved?.length === 0 && !showPending && (
          <>
            <EmptyNote title="Write to your coach">
              It reads your plan, your logs and your check-ins, and can propose changes. The plan changes only when you tap Apply.
            </EmptyNote>
            <div className="flex flex-col items-start gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" className="h-11 rounded-full px-4" onClick={() => setText(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </>
        )}
        {saved?.map((m, i) => {
          const day = appDay(new Date(m.created_at))
          const newDay = i === 0 || appDay(new Date(saved[i - 1].created_at)) !== day
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {newDay && <span className="self-center text-xs text-muted-foreground">{relativeDay(day, today)}</span>}
              <Bubble role={m.role}>{m.text}</Bubble>
              {cards.under.get(m.id)?.map((p) => (
                <ProposalCard key={p.id} proposal={p} />
              ))}
            </div>
          )
        })}
        {cards.atEnd.map((p) => (
          <ProposalCard key={p.id} proposal={p} />
        ))}
        {showPending && (
          <>
            <Bubble role="user">{pending.text}</Bubble>
            {pending.reply ? <Bubble role="coach">{pending.reply}</Bubble> : <span className="self-start text-sm text-muted-foreground">The coach is writing…</span>}
          </>
        )}
        {failed && (
          <p className="rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10" role="alert">
            {failed}
          </p>
        )}
      </div>

      <form
        className="sticky bottom-[calc(65px+env(safe-area-inset-bottom))] z-10 flex items-end gap-2 border-t bg-background px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Textarea
            ref={box}
            rows={1}
            value={text}
            maxLength={CHAT_MAX_CHARS}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write to the coach…"
            aria-label="Message to the coach"
            className="min-h-11 resize-none rounded-xl bg-card px-3 py-2.5 md:text-base"
          />
          {/* near the limit, so a long paste isn't cut without a word */}
          {text.length > CHAT_MAX_CHARS - 200 && (
            <span className="self-end text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {text.length} / {CHAT_MAX_CHARS}
            </span>
          )}
        </div>
        <Button type="submit" className="size-11 shrink-0 rounded-full p-0" disabled={sending || !saved || !LIMITS.chat(text)} aria-label="Send">
          <ArrowUpIcon className="size-5" />
        </Button>
      </form>
    </main>
  )
}
