import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import type { Tone } from '@swarapos/core/labels'

export type BadgeTone = Tone

const TONES: Record<BadgeTone, string> = {
  intake: 'bg-phase-intake-soft text-phase-intake',
  production: 'bg-phase-production-soft text-phase-production',
  qc: 'bg-phase-qc-soft text-phase-qc',
  ready: 'bg-phase-ready-soft text-phase-ready',
  done: 'bg-phase-done-soft text-phase-done',
  exception: 'bg-phase-exception-soft text-phase-exception',
  neutral: 'bg-surface-2 text-fg-muted',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-phase-done-soft text-phase-done',
  warning: 'bg-phase-qc-soft text-phase-qc',
  danger: 'bg-danger-soft text-danger',
}

type BadgeProps = ComponentProps<'span'> & { tone?: BadgeTone }

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
