'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() memfokuskan elemen pertama (tombol tutup); arahkan ke field yang ditandai.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])
  return ref
}

type DialogProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const WIDTH = { sm: 'w-[min(100%-2rem,26rem)]', md: 'w-[min(100%-2rem,32rem)]', lg: 'w-[min(100%-2rem,44rem)]' }

/** Dialog modal berbasis `<dialog>` native: fokus terkunci, Esc menutup, klik latar menutup. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', className }: DialogProps) {
  const ref = useModal(open)
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] rounded-2xl border border-border bg-surface p-0 text-fg shadow-pop open:animate-rise',
        WIDTH[size],
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-m-2 grid size-11 shrink-0 place-items-center rounded-xl text-fg-subtle hover:bg-surface-2 hover:text-fg"
              aria-label="Tutup"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-2/50 px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  children?: ReactNode
  footer?: ReactNode
}

/** Panel geser dari kanan untuk detail. */
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const ref = useModal(open)
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 ml-auto h-dvh max-h-dvh w-[min(100%,30rem)] max-w-none border-l border-border bg-surface p-0 text-fg shadow-pop"
    >
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 grid size-11 place-items-center rounded-xl text-fg-subtle hover:bg-surface-2 hover:text-fg"
              aria-label="Tutup"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
