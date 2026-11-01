import { toast } from '@/components/ui/toast'
import { useDemo } from './demo-store'
import type { ActionError, ActionResult, DemoState } from '@swarapos/core/store/state'

export const ERROR_MESSAGE: Record<ActionError, string> = {
  NOT_FOUND: 'Data tidak ditemukan. Coba muat ulang halaman.',
  NOT_ALLOWED: 'Aksi ini tidak bisa dilakukan pada kondisi sekarang.',
  QC_REQUIRED: 'QC harus lulus sebelum order bisa siap.',
  REASON_REQUIRED: 'Alasan atau catatan wajib diisi.',
  INVALID_TYPE: 'Format file harus JPG, PNG, atau PDF.',
  TOO_LARGE: 'Ukuran file harus di bawah 2 MB.',
  DUPLICATE: 'Nomor WhatsApp ini sudah dipakai pelanggan lain.',
  IN_USE: 'Pelanggan ini sudah punya order, jadi tidak bisa dihapus.',
  UNPAID: 'Order belum lunas. Catat pembayaran atau serahkan sebagai piutang dengan alasan.',
  OVERPAID: 'Total baru lebih kecil dari yang sudah dibayar.',
  TOO_MANY: 'Terlalu banyak permintaan aktif untuk nomor ini.',
}

/** Jalankan reducer lewat store, lalu tampilkan toast sukses atau pesan error. */
export function act<T>(fn: (s: DemoState) => ActionResult<T>, success?: string): ActionResult<T> {
  const result = useDemo.getState().run(fn)
  if (result.ok) {
    if (success) toast(success)
  } else {
    toast(ERROR_MESSAGE[result.error], 'error')
  }
  return result
}
