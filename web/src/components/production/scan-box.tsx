'use client'

import { ScanLine } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { useDemo } from '@/lib/store/demo-store'

/** Scanner barcode bertindak seperti keyboard: ketik/scan lalu Enter. Menerima nomor order, token, atau URL lacak. */
export function ScanBox({ large }: { large: boolean }) {
  const router = useRouter()
  const orders = useDemo((s) => s.orders)
  const [value, setValue] = useState('')

  const submit = () => {
    const raw = value.trim()
    if (!raw) return
    const token = raw.includes('/lacak/') ? raw.split('/lacak/')[1].split(/[?#]/)[0] : raw
    const order = orders.find((o) => o.orderNo.toLowerCase() === raw.toLowerCase() || o.trackingToken === token)
    if (!order) {
      toast(`Order "${raw}" tidak ditemukan`, 'error')
      return
    }
    setValue('')
    router.push(`/app/order/${order.id}`)
  }

  return (
    <div className="relative">
      <ScanLine className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle', large ? 'size-6' : 'size-4')} aria-hidden />
      <Input
        data-search
        autoFocus={large}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Scan label atau ketik nomor order, lalu Enter"
        aria-label="Scan atau cari nomor order"
        className={cn(large ? 'h-14 pl-12 text-lg' : 'pl-9')}
      />
    </div>
  )
}
