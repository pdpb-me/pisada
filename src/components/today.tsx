import { LogOutIcon } from 'lucide-react'
import { SessionCard } from '@/components/session-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDay } from '@/hooks/use-day'
import { longDate, todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

export function Today() {
  const date = todayISO()
  const { sessions, setStatus, setComment } = useDay(date)

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-4 p-4">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-2xl font-semibold">Today</h1>
          <p className="text-sm text-muted-foreground">{longDate(date)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Log out"
          onClick={() => supabase.auth.signOut()}
        >
          <LogOutIcon />
        </Button>
      </header>

      {sessions === undefined ? (
        <>
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </>
      ) : sessions.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nothing planned today.
        </p>
      ) : (
        sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            onStatus={(status) => setStatus(s, status)}
            onComment={(comment) => setComment(s, comment)}
          />
        ))
      )}
    </main>
  )
}
