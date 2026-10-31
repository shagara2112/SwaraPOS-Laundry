import {
  Ban,
  CircleCheck,
  Inbox,
  PackageCheck,
  ShieldCheck,
  TriangleAlert,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL, statusPhase } from '@/lib/domain/order-status'
import type { OrderStatus, StatusPhase } from '@/lib/types'

export const PHASE_ICON: Record<StatusPhase, LucideIcon> = {
  intake: Inbox,
  production: WashingMachine,
  qc: ShieldCheck,
  ready: PackageCheck,
  done: CircleCheck,
  exception: TriangleAlert,
}

export const PHASE_LABEL: Record<StatusPhase, string> = {
  intake: 'Masuk',
  production: 'Produksi',
  qc: 'Quality check',
  ready: 'Siap / antar',
  done: 'Selesai',
  exception: 'Pengecualian',
}

export function statusIcon(status: OrderStatus): LucideIcon {
  return status === 'CANCELLED' ? Ban : PHASE_ICON[statusPhase(status)]
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const Icon = statusIcon(status)
  return (
    <Badge tone={statusPhase(status)} className={className}>
      <Icon aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  )
}
