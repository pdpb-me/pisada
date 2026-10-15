import { useCallback, useEffect, useState } from 'react'

// A small stack of screens inside one tab (e.g. Today → session → exercise).
// Each push adds a browser history entry, so the phone's back gesture goes
// back one screen instead of leaving the app.
export function useScreens<T>(root: T) {
  const [stack, setStack] = useState<T[]>([root])

  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const push = useCallback((screen: T) => {
    window.history.pushState({ pisada: true }, '')
    setStack((s) => [...s, screen])
    window.scrollTo(0, 0)
  }, [])

  // Swap the current screen without a new history entry (e.g. "Next exercise")
  const replace = useCallback((screen: T) => {
    setStack((s) => [...s.slice(0, -1), screen])
    window.scrollTo(0, 0)
  }, [])

  const back = useCallback(() => window.history.back(), [])

  return { screen: stack[stack.length - 1], depth: stack.length, push, replace, back }
}
