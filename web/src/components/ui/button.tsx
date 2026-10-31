import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

const BASE =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-sm hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger-hover',
  whatsapp: 'bg-whatsapp text-white shadow-sm hover:bg-whatsapp-hover',
}

// Tap target minimal 44px di layar sentuh; tombol produksi (xl) 56px.
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm pointer-coarse:h-11',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  xl: 'h-14 px-6 text-lg',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className)
}

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />
}
