import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const controlClasses =
  'w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 hover:border-border-strong focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClasses, 'h-11', className)} {...props} />
}
