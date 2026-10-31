import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { controlClasses } from './input'

export function Textarea({ className, rows = 3, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={rows} className={cn(controlClasses, 'py-2.5 leading-relaxed', className)} {...props} />
}
