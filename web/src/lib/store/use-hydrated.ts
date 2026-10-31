'use client'

import { useEffect, useState } from 'react'
import { useDemo } from './demo-store'

/** `true` setelah data demo dimuat dari localStorage. Halaman merender skeleton sampai saat itu. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (useDemo.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsubscribe = useDemo.persist.onFinishHydration(() => setHydrated(true))
    void useDemo.persist.rehydrate()
    return unsubscribe
  }, [])

  return hydrated
}
