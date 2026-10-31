'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export function useOnline(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

/** Chip status koneksi di topbar. */
export function OfflineIndicator({ className }: { className?: string }) {
  const online = useOnline()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        online ? 'text-fg-subtle' : 'bg-phase-qc-soft text-phase-qc',
        className,
      )}
      role="status"
    >
      {online ? (
        <>
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-pulse-dot rounded-full bg-phase-done" />
          </span>
          <Wifi className="size-3.5 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Online · tersinkron</span>
        </>
      ) : (
        <>
          <WifiOff className="size-3.5" aria-hidden />
          Offline
        </>
      )}
    </span>
  )
}

/** Banner lebar penuh saat offline, menjelaskan apa yang tetap bisa dilakukan. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="border-b border-phase-qc/30 bg-phase-qc-soft px-4 py-2 text-center text-sm font-medium text-phase-qc" role="alert">
      Offline — perubahan disimpan sebagai <strong>pending sync</strong> dan dikirim saat koneksi kembali. Kirim
      WhatsApp dan pembayaran menunggu online.
    </div>
  )
}
