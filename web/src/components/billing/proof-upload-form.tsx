'use client'

import { FileCheck2, TriangleAlert, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { validateProofFile } from '@/lib/domain/proof-file'
import { formatRupiah, parseRupiahID } from '@/lib/format'
import { act } from '@/lib/store/act'
import { submitSubscriptionProof } from '@/lib/store/actions-platform'
import type { PaymentInstruction, SubscriptionInvoice } from '@/lib/types'

const FILE_ERROR = {
  INVALID_TYPE: 'Format harus JPG, PNG, atau PDF.',
  TOO_LARGE: 'Ukuran file harus di bawah 2 MB.',
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB` : `${Math.ceil(bytes / 1024)} KB`
}

export function ProofUploadForm({ invoice, instruction }: { invoice: SubscriptionInvoice; instruction: PaymentInstruction }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [amount, setAmount] = useState(String(invoice.amount))
  const [note, setNote] = useState('')
  const amountValue = parseRupiahID(amount) ?? 0
  const amountError = amount.trim() !== '' && parseRupiahID(amount) === null ? 'Isi nominal rupiah bulat, contoh 598000 atau 598.000.' : undefined
  const mismatch = amountValue > 0 && amountValue !== invoice.amount

  const pick = (f: File | undefined) => {
    if (!f) return
    const check = validateProofFile({ type: f.type, size: f.size })
    if (!check.ok) {
      setFile(null)
      setFileError(FILE_ERROR[check.error])
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFileError(null)
    setFile(f)
  }

  const submit = () => {
    if (!file) return
    const r = act(
      (s) =>
        submitSubscriptionProof(
          s,
          invoice.id,
          { instructionId: instruction.id, amountClaimed: amountValue, note, file: { name: file.name, type: file.type, size: file.size } },
          s.tenantActor,
          new Date(),
        ),
      'Bukti terkirim — menunggu review tim SwaraPOS',
    )
    if (r.ok) {
      setFile(null)
      setNote('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Bukti pembayaran" htmlFor="proof-file" required error={fileError} hint="JPG, PNG, atau PDF di bawah 2 MB.">
        <label
          htmlFor="proof-file"
          className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border-strong px-4 py-3 hover:bg-surface-2"
        >
          {file ? <FileCheck2 className="size-6 shrink-0 text-phase-done" aria-hidden /> : <Upload className="size-6 shrink-0 text-fg-subtle" aria-hidden />}
          <span className="min-w-0 text-sm">
            {file ? (
              <>
                <span className="block truncate font-medium text-fg">{file.name}</span>
                <span className="text-fg-subtle">{formatSize(file.size)} · ketuk untuk ganti</span>
              </>
            ) : (
              <span className="text-fg-muted">Pilih file bukti transfer / tangkapan layar</span>
            )}
          </span>
        </label>
        <input
          ref={inputRef}
          id="proof-file"
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </Field>
      <Field label="Nominal yang dibayar (Rp)" htmlFor="proof-amount" required error={amountError}>
        <Input id="proof-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" aria-invalid={!!amountError} />
      </Field>
      {mismatch && (
        <p className="flex gap-2 rounded-xl bg-phase-qc-soft px-3 py-2.5 text-sm text-phase-qc">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Nominal berbeda dari tagihan {formatRupiah(invoice.amount)} — akan dikonfirmasi tim Finance.
        </p>
      )}
      <Field label="Catatan (opsional)" htmlFor="proof-note">
        <Textarea id="proof-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: dibayar dari rekening a.n. Rina W." />
      </Field>
      <Button size="lg" className="w-full" disabled={!file || !(amountValue > 0)} onClick={submit}>
        <Upload aria-hidden />
        Kirim bukti pembayaran
      </Button>
    </div>
  )
}
