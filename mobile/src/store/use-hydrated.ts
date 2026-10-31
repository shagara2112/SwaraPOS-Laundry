import { useEffect, useState } from 'react'
import { useDemo } from './demo-store'
import { useSession } from './session-store'

let started = false

function bothHydrated() {
  return useDemo.persist.hasHydrated() && useSession.persist.hasHydrated()
}

/** `true` setelah data demo dan sesi dimuat dari AsyncStorage. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(bothHydrated)

  useEffect(() => {
    // Sudah terhidrasi saat mount: state awal sudah `true`.
    if (bothHydrated()) return
    const check = () => bothHydrated() && setHydrated(true)
    const unsubDemo = useDemo.persist.onFinishHydration(check)
    const unsubSession = useSession.persist.onFinishHydration(check)
    if (!started) {
      started = true
      void useDemo.persist.rehydrate()
      void useSession.persist.rehydrate()
    }
    return () => {
      unsubDemo()
      unsubSession()
    }
  }, [])

  return hydrated
}
