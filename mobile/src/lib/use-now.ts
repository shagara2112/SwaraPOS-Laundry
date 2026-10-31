import { useEffect, useState } from 'react'

/** Waktu sekarang yang diperbarui berkala, untuk tanda terlambat dan hitung mundur. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
