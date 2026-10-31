import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-border bg-surface-2/60 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('border-b border-border px-4 py-3 align-middle', className)} {...props} />
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('transition-colors last:[&>td]:border-b-0', className)} {...props} />
}
