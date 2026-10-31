'use client'

import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { create } from 'zustand'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'error' | 'info'
type ToastItem = { id: number; message: string; tone: ToastTone }

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }))
let nextId = 1

export function toast(message: string, tone: ToastTone = 'success') {
  const id = nextId++
  useToasts.setState((s) => ({ items: [...s.items, { id, message, tone }] }))
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), 3200)
}

const ICON = { success: CircleCheck, error: CircleAlert, info: Info }
const TONE = {
  success: 'text-phase-done',
  error: 'text-danger',
  info: 'text-primary',
}

export function Toaster() {
  const items = useToasts((s) => s.items)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {items.map((t) => {
        const Icon = ICON[t.tone]
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-md animate-rise items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg shadow-pop"
          >
            <Icon className={cn('size-5 shrink-0', TONE[t.tone])} />
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
