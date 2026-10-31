import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Langkah">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors',
                done && 'bg-primary text-primary-fg',
                active && 'bg-primary-soft text-primary ring-2 ring-primary',
                !done && !active && 'bg-surface-2 text-fg-subtle',
              )}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn('hidden text-sm font-medium sm:inline', active ? 'text-fg' : 'text-fg-muted')}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('h-px flex-1', done ? 'bg-primary' : 'bg-border')} aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}
