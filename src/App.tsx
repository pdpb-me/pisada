import { Login } from '@/components/login'
import { Today } from '@/components/today'
import { useSession } from '@/hooks/use-session'

function App() {
  const session = useSession()
  if (session === undefined) return null // still checking, a split second
  if (session === null) return <Login />
  return <Today />
}

export default App
