import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { onDataChange } from '@/data/store'

// Loads data for a screen and loads it again whenever something is saved anywhere
// in the app. `key` names what is loaded (e.g. 'day:2026-10-19'): a new key loads
// anew. With keepPrevious, the old data stays on screen until the new data is in
// (no flash, e.g. when the week strip moves).
export function useQuery<T>(key: string, load: () => Promise<T>, { keepPrevious = false } = {}) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key })
  const [version, setVersion] = useState(0)
  const loadRef = useRef(load)
  useLayoutEffect(() => {
    loadRef.current = load
  })

  useEffect(() => onDataChange(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    let live = true
    loadRef.current().then(
      (data) => live && setState({ key, data }),
      (e: Error) => live && setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: e.message })),
    )
    return () => {
      live = false
    }
  }, [key, version])

  const current = state.key === key || keepPrevious
  return {
    data: current ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    reload: () => setVersion((v) => v + 1),
  }
}
