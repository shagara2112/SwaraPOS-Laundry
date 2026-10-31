'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ReasonDialog } from '@/components/order/reason-dialog'
import { StatusBadge } from '@/components/order/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import type { OrderStatus } from '@/lib/types'

const SAMPLE: OrderStatus[] = ['RECEIVED', 'IN_WASHING', 'QUALITY_CHECK', 'READY_FOR_PICKUP', 'COMPLETED', 'ON_HOLD', 'CANCELLED']

// Placeholder sampai Task 10 mengganti halaman ini dengan ringkasan sungguhan.
export default function TenantHome() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <PageHeader title="Ringkasan" description="Kerangka dashboard tenant." />
      <Card>
        <CardHeader title="Status per fase" />
        <CardBody className="flex flex-wrap gap-2">
          {SAMPLE.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Coba dialog alasan
          </Button>
        </CardBody>
      </Card>
      <ReasonDialog
        open={open}
        title="Tahan order"
        confirmLabel="Tahan"
        onConfirm={() => setOpen(false)}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
