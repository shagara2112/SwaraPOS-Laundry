'use client'

import { cn } from '@/lib/cn'

export type TabItem = { id: string; label: string; count?: number }

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'scrollbar-thin flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-1',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors pointer-coarse:h-11',
              active ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'tabular rounded-full px-1.5 text-xs',
                  active ? 'bg-primary-soft text-primary' : 'bg-border/60 text-fg-muted',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
