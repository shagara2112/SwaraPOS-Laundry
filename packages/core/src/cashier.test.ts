import { describe, expect, it } from 'vitest'
import { emptyDraft, orderInputFromDraft, summarizeDraft, type OrderDraft } from './cashier'
import { createSeed } from './store/seed'
import type { Customer } from './types'

const now = new Date('2026-10-31T03:00:00Z')
const s = createSeed(now)
const outlet = s.outlets.find((o) => o.id === 'o-kmg')!
const noLocation: Customer = { id: 'c-x', name: 'Tanpa Titik', phone: '0812-1111-2222', address: 'Jl. Contoh 1', createdAt: now.toISOString() } as Customer
const withLocation = s.customers.find((c) => c.location && c.address)!

function summarize(draft: Partial<OrderDraft>, customer: Customer | null = noLocation, outsideZone = { confirmed: false, feeText: '' }) {
  return summarizeDraft({
    draft: { ...emptyDraft(), ...draft },
    customer: customer ?? undefined,
    outlet,
    services: s.services,
    zones: s.zones,
    expressPct: s.tenant.expressSurchargePct,
    outsideZone,
    now,
  })
}

const kilo35 = { key: 'l1', serviceId: 's-kilo-reg', qtyText: '3,5' }

describe('summarizeDraft', () => {
  it('drop-off 3,5 kg + parfum + express + diantar 6 km: subtotal + 50% + Rp12.000', () => {
    const r = summarize({ customerId: noLocation.id, intake: 'DROP_OFF', handback: 'DELIVERY', lines: [kilo35], addons: ['s-parfum'], express: true, manualKm: '6' })
    expect(r.totals.subtotal).toBe(29500)
    expect(r.totals.expressFee).toBe(14750)
    expect(r.totals.pickupFee).toBe(0)
    expect(r.totals.deliveryFee).toBe(12000)
    expect(r.totals.total).toBe(29500 + 14750 + 12000)
    expect(r.blockers).toEqual([])
  })

  it('draf kosong memblokir pelanggan dan layanan', () => {
    const r = summarize({}, null)
    expect(r.blockers).toEqual(['Pilih atau tambah pelanggan', 'Tambah minimal satu layanan utama'])
    expect(r.dueAt).toBeNull()
  })

  it('add-on saja tidak cukup sebagai layanan utama', () => {
    expect(summarize({ addons: ['s-parfum'] }).blockers).toContain('Tambah minimal satu layanan utama')
  })

  it('jumlah kosong atau bukan angka memblokir simpan', () => {
    expect(summarize({ lines: [{ ...kilo35, qtyText: '' }] }).blockers).toContain('Lengkapi berat/jumlah setiap layanan')
    expect(summarize({ lines: [{ ...kilo35, qtyText: 'abc' }] }).blockers).toContain('Lengkapi berat/jumlah setiap layanan')
  })

  it('jemput/antar butuh alamat dan jarak', () => {
    const noAddress = { ...noLocation, address: undefined }
    const r = summarize({ lines: [kilo35], intake: 'PICKUP' }, noAddress)
    expect(r.blockers).toContain('Alamat pelanggan wajib untuk jemput/antar')
    expect(r.blockers).toContain('Isi jarak dari outlet')
  })

  it('luar zona butuh konfirmasi dan biaya manual per perjalanan', () => {
    const base = { lines: [kilo35], intake: 'PICKUP' as const, handback: 'DELIVERY' as const, manualKm: '15' }
    const blocked = summarize(base)
    expect(blocked.quote?.status).toBe('NEEDS_CONFIRMATION')
    expect(blocked.blockers).toContain('Konfirmasi area di luar zona & isi biaya')
    const ok = summarize(base, noLocation, { confirmed: true, feeText: '20.000' })
    expect(ok.totals.pickupFee).toBe(20000)
    expect(ok.totals.deliveryFee).toBe(20000)
    expect(ok.blockers).toEqual([])
  })

  it('pelanggan bertitik lokasi memakai jarak garis lurus (dibulatkan 0,1 km), bukan km manual', () => {
    const r = summarize({ lines: [kilo35], handback: 'DELIVERY', manualKm: '99' }, withLocation)
    expect(r.distanceKm).not.toBe(99)
    expect(Math.round(r.distanceKm! * 10) / 10).toBe(r.distanceKm)
    expect(r.quote?.status).toBe('OK')
  })

  it('estimasi selesai dari SLA terpanjang, express separuh', () => {
    const normal = summarize({ lines: [kilo35] })
    const express = summarize({ lines: [kilo35], express: true })
    expect(normal.dueAt!.getTime() - now.getTime()).toBe(48 * 3600_000)
    expect(express.dueAt!.getTime() - now.getTime()).toBe(24 * 3600_000)
  })
})

describe('orderInputFromDraft', () => {
  it('membawa kunci idempotensi, item valid, add-on, dan biaya dari ringkasan', () => {
    const draft: OrderDraft = { ...emptyDraft(), customerId: noLocation.id, handback: 'DELIVERY', lines: [kilo35], addons: ['s-parfum'], manualKm: '6', conditions: ['Noda'] }
    const summary = summarize(draft)
    const input = orderInputFromDraft(draft, summary, outlet.id)
    expect(input).toMatchObject({
      outletId: 'o-kmg',
      customerId: noLocation.id,
      handback: 'DELIVERY',
      items: [
        { serviceId: 's-kilo-reg', qty: 3.5 },
        { serviceId: 's-parfum', qty: 1 },
      ],
      conditionNotes: ['Noda'],
      pickupFee: 0,
      deliveryFee: 12000,
      distanceKm: 6,
      idempotencyKey: draft.key,
    })
  })

  it('setiap draf kosong punya kunci baru', () => {
    expect(emptyDraft().key).not.toBe(emptyDraft().key)
  })
})

describe('diskon di draf kasir', () => {
  const base = { customerId: noLocation.id, lines: [kilo35] }
  it('diskon mengurangi total dan ikut ke input order', () => {
    const draft = { ...emptyDraft(), ...base, discount: { type: 'AMOUNT' as const, valueText: '4.500', reason: 'Langganan' } }
    const r = summarize(draft)
    expect(r.totals.discount).toBe(4500)
    expect(r.totals.total).toBe(24500 - 4500)
    expect(orderInputFromDraft(draft, r, outlet.id).discount).toEqual({ type: 'AMOUNT', value: 4500, reason: 'Langganan' })
  })

  it('diskon tanpa alasan atau angka tidak valid memblokir simpan', () => {
    expect(summarize({ ...base, discount: { type: 'AMOUNT', valueText: '4.500', reason: '' } }).blockers).toContain('Isi alasan diskon')
    expect(summarize({ ...base, discount: { type: 'PERCENT', valueText: '120', reason: 'x' } }).blockers).toContain('Diskon tidak valid')
  })

  it('kolom diskon kosong berarti tanpa diskon', () => {
    const r = summarize({ ...base, discount: { type: 'AMOUNT', valueText: '', reason: '' } })
    expect(r.totals.discount).toBe(0)
    expect(r.blockers).toEqual([])
  })
})
