'use client'

import { useState, type ReactNode } from 'react'
import { Button, type ButtonVariant } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

/** Dialog untuk aksi yang wajib beralasan (tahan, batal, tolak, suspend). */
export function ReasonDialog({
  open,
  title,
  description,
  label = 'Alasan',
  placeholder,
  confirmLabel,
  confirmVariant = 'danger',
  onConfirm,
  onClose,
  children,
}: {
  open: boolean
  title: ReactNode
  description?: ReactNode
  label?: string
  placeholder?: string
  confirmLabel: string
  confirmVariant?: ButtonVariant
  onConfirm: (reason: string) => void
  onClose: () => void
  children?: ReactNode
}) {
  const [reason, setReason] = useState('')
  const valid = reason.trim().length > 0

  const close = () => {
    setReason('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
          <Button
            variant={confirmVariant}
            disabled={!valid}
            onClick={() => {
              onConfirm(reason.trim())
              setReason('')
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {children}
        <Field label={label} htmlFor="reason" required hint="Wajib diisi. Tercatat di riwayat dan audit log.">
          <Textarea
            id="reason"
            data-autofocus
            value={reason}
            placeholder={placeholder}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  )
}
