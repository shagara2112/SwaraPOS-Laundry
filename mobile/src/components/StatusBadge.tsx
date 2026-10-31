import { statusPhase } from '@swarapos/core/domain/order-status'
import { staffStatusLabel } from '@swarapos/core/labels'
import type { HandbackType, OrderStatus, StatusPhase } from '@swarapos/core/types'
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

/** Status selalu ikon + label, tidak hanya warna. Beri `handback` agar order siap antar terbaca "Siap diantar". */
export function StatusBadge({ status, handback = 'SELF_PICKUP' }: { status: OrderStatus; handback?: HandbackType }) {
  return <Badge tone={statusPhase(status)} label={staffStatusLabel(status, handback)} icon={statusIcon(status)} />
}
