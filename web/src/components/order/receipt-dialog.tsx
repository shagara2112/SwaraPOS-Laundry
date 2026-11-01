'use client'

import { Printer } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { buildReceipt, receiptHtml } from '@swarapos/core/receipt'
import type { Customer, Order, Outlet } from '@swarapos/core/types'
import { useDemo } from '@/lib/store/demo-store'

/** Pratinjau nota dalam iframe; Cetak hanya mencetak isi iframe, bukan halaman dashboard. */
export function ReceiptDialog({ open, onClose, order, outlet, customer }: { open: boolean; onClose: () => void; order: Order; outlet: Outlet; customer: Customer }) {
  const businessName = useDemo((s) => s.tenant.name)
  const frame = useRef<HTMLIFrameElement>(null)
  const paper = outlet.receiptPaper ?? 58
  const html = useMemo(
    () => receiptHtml(buildReceipt({ order, outlet, customer, businessName, trackingOrigin: window.location.origin }), paper),
    [order, outlet, customer, businessName, paper],
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Nota order"
      description={`Kertas ${paper} mm · ubah di Pengaturan → Outlet.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={() => frame.current?.contentWindow?.print()}>
            <Printer aria-hidden />
            Cetak nota
          </Button>
        </>
      }
    >
      <div className="flex justify-center rounded-xl bg-surface-2 p-3">
        <iframe ref={frame} srcDoc={html} title={`Nota ${order.orderNo}`} className="h-[28rem] rounded-md bg-white shadow-card" style={{ width: `calc(${paper}mm + 8px)` }} />
      </div>
      <p className="mt-3 text-xs text-fg-subtle">
        Printer thermal USB yang terpasang di komputer bisa dipilih di dialog cetak. Atur ukuran kertas di{' '}
        <Link href="/app/pengaturan" className="font-medium text-primary hover:underline">
          Pengaturan
        </Link>
        .
      </p>
    </Dialog>
  )
}
