'use client'

import { Check, Copy, ExternalLink, QrCode } from 'lucide-react'
import { useState } from 'react'
import { buttonClasses } from '@/components/ui/button'
import type { PaymentInstruction } from '@/lib/types'

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.replace(/\s/g, ''))
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          // Clipboard diblokir.
        }
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-fg hover:bg-surface-2"
    >
      {copied ? <Check className="size-4 text-phase-done" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? 'Tersalin' : 'Salin'}
    </button>
  )
}

/** Instruksi bayar platform yang dikonfigurasi Super Admin (transfer, link, atau QRIS). */
export function InstructionDetail({ instruction }: { instruction: PaymentInstruction }) {
  return (
    <div className="space-y-3 rounded-2xl bg-surface-2 p-4">
      {instruction.method === 'TRANSFER' && (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-subtle">Bank</dt>
            <dd className="font-semibold text-fg">{instruction.bankName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-subtle">Atas nama</dt>
            <dd className="text-right font-medium text-fg">{instruction.accountName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-subtle">No. rekening</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-base font-semibold text-fg">{instruction.accountNumber}</span>
              {instruction.accountNumber && <CopyValue value={instruction.accountNumber} />}
            </dd>
          </div>
        </dl>
      )}
      {instruction.method === 'LINK' && instruction.paymentUrl && (
        <a href={instruction.paymentUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'lg', 'w-full')}>
          <ExternalLink aria-hidden />
          Buka halaman pembayaran
        </a>
      )}
      {instruction.method === 'QRIS' && (
        <div className="flex items-center gap-4">
          <div className="grid size-28 shrink-0 place-items-center rounded-xl border border-dashed border-border-strong bg-surface text-center text-[11px] text-fg-subtle">
            <span>
              <QrCode className="mx-auto mb-1 size-6" aria-hidden />
              Gambar QRIS dari Super Admin
            </span>
          </div>
          <p className="text-sm text-fg-muted">
            Merchant: <span className="font-semibold text-fg">{instruction.merchantName}</span>
          </p>
        </div>
      )}
      <p className="text-sm text-fg-muted">{instruction.instructions}</p>
    </div>
  )
}
