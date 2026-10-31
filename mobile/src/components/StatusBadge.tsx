import { STATUS_LABEL, statusPhase } from '@swarapos/core/domain/order-status'
import type { OrderStatus, StatusPhase } from '@swarapos/core/types'
import { Ban, CircleCheck, Inbox, PackageCheck, ShieldCheck, TriangleAlert, WashingMachine, type LucideIcon } from 'lucide-react-native'
import { Badge } from '@/ui/Badge'

export const PHASE_ICON: Record<StatusPhase, LucideIcon> = {
  intake: Inbox,
  production: WashingMachine,
  qc: ShieldCheck,
  ready: PackageCheck,
  done: CircleCheck,
  exception: TriangleAlert,
}

export function statusIcon(status: OrderStatus): LucideIcon {
  return status === 'CANCELLED' ? Ban : PHASE_ICON[statusPhase(status)]
}

/** Status selalu ikon + label, tidak hanya warna. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={statusPhase(status)} label={STATUS_LABEL[status]} icon={statusIcon(status)} />
}
