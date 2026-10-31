'use client'

import { Camera } from 'lucide-react'
import { cn } from '@/lib/cn'

const NOTES = ['Noda', 'Luntur', 'Bahan sensitif', 'Kancing/resleting rusak', 'Item kurang', 'Berbau']

export function ConditionNotes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
      <div className="flex flex-wrap content-start gap-2">
        {NOTES.map((n) => {
          const on = value.includes(n)
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== n) : [...value, n])}
              className={cn(
                'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors',
                on ? 'border-phase-exception bg-phase-exception-soft text-phase-exception' : 'border-border text-fg-muted hover:text-fg',
              )}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong text-center text-xs text-fg-subtle">
        <Camera className="size-5" aria-hidden />
        Foto kondisi awal
        <span className="text-[10px]">(kamera di aplikasi Android)</span>
      </div>
    </div>
  )
}
