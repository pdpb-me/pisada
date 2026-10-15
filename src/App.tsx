import { useState } from 'react'
import { ChartLineIcon, SunIcon } from 'lucide-react'
import { Login } from '@/components/login'
import { Progress } from '@/components/progress'
import { Today } from '@/components/today'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'today', label: 'Today', icon: SunIcon },
  { id: 'progress', label: 'Progress', icon: ChartLineIcon },
] as const
type Tab = (typeof TABS)[number]['id']

function App() {
  const session = useSession()
  const [tab, setTab] = useState<Tab>('today')
  if (session === undefined) return null // still checking, a split second
  if (session === null) return <Login />
  return (
    <>
      {/* room for the bottom bar */}
      <div className="pb-20">{tab === 'today' ? <Today /> : <Progress />}</div>
      <nav className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={cn('h-14 flex-1 flex-col gap-0.5 rounded-none text-xs', tab === id ? 'text-foreground' : 'text-muted-foreground')}
            >
              <Icon className="size-5" />
              {label}
            </Button>
          ))}
        </div>
      </nav>
    </>
  )
}

export default App
