import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'primary' | 'violet' | 'cyan' | 'warning' | 'danger' | 'success'

const ICON_TONE: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  violet: 'bg-phase-production-soft text-phase-production',
  cyan: 'bg-phase-ready-soft text-phase-ready',
  warning: 'bg-phase-qc-soft text-phase-qc',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-phase-done-soft text-phase-done',
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: Tone
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <span className={cn('grid size-9 place-items-center rounded-xl', ICON_TONE[tone])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="tabular mt-3 text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  )
}
