'use client'

import { RotateCcw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { act } from '@/lib/store/act'
import { QC_CHECKLIST } from '@swarapos/core/production'
import { recordQc, transitionOrder } from '@swarapos/core/store/actions-order'
import type { Order } from '@swarapos/core/types'
import { ReasonDialog } from './reason-dialog'

/** Panel QC: lulus membuka status siap, gagal mengirim kembali ke cuci ulang. */
export function QcPanel({ order, size = 'md' }: { order: Order; size?: 'md' | 'xl' }) {
  const [checked, setChecked] = useState<boolean[]>(QC_CHECKLIST.map(() => false))
  const [failOpen, setFailOpen] = useState(false)
  const allChecked = checked.every(Boolean)

  const pass = () => {
    const qc = act((s) => recordQc(s, order.id, { passed: true, notes: 'checklist lengkap' }, s.tenantActor, new Date()))
    if (qc.ok) act((s) => transitionOrder(s, order.id, 'READY_FOR_PICKUP', {}, s.tenantActor, new Date()), 'QC lulus — order siap')
  }

  const fail = (reason: string) => {
    const qc = act((s) => recordQc(s, order.id, { passed: false, notes: reason }, s.tenantActor, new Date()))
    if (qc.ok) {
      act((s) => transitionOrder(s, order.id, 'IN_WASHING', { note: `Cuci ulang: ${reason}` }, s.tenantActor, new Date()), 'Dikirim ke cuci ulang')
      setFailOpen(false)
    }
  }

  return (
    <Card className="border-phase-qc/40">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-phase-qc" aria-hidden />
            Quality check
          </span>
        }
        description="Centang semua poin sebelum order bisa ditandai siap."
      />
      <CardBody>
        <ul className="grid gap-2 sm:grid-cols-2">
          {QC_CHECKLIST.map((label, i) => (
            <li key={label}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-fg hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={(e) => setChecked(checked.map((c, idx) => (idx === i ? e.target.checked : c)))}
                  className="size-5 accent-[var(--phase-done)]"
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size={size === 'xl' ? 'xl' : 'lg'} onClick={pass} disabled={!allChecked}>
            <ShieldCheck aria-hidden />
            Lulus QC
          </Button>
          <Button size={size === 'xl' ? 'xl' : 'lg'} variant="secondary" onClick={() => setFailOpen(true)}>
            <RotateCcw aria-hidden />
            Gagal — cuci ulang
          </Button>
        </div>
      </CardBody>
      <ReasonDialog
        open={failOpen}
        title="QC gagal"
        description={`${order.orderNo} akan kembali ke tahap cuci.`}
        label="Temuan QC"
        placeholder="Contoh: noda kerah masih terlihat"
        confirmLabel="Kirim ke cuci ulang"
        confirmVariant="primary"
        onClose={() => setFailOpen(false)}
        onConfirm={fail}
      />
    </Card>
  )
}
