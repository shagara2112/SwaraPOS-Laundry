import { it, expect } from 'vitest'
import { buildWaMessage, buildWaUrl, normalizePhoneID, waEventForStatus } from './whatsapp'

it('menormalkan berbagai format nomor', () => {
  expect(normalizePhoneID('0812-3456-7890')).toBe('6281234567890')
  expect(normalizePhoneID('+62 812 3456 7890')).toBe('6281234567890')
  expect(normalizePhoneID('6281234567890')).toBe('6281234567890')
  expect(normalizePhoneID('812345678')).toBe('62812345678')
})

it('nomor kosong atau terlalu pendek tidak valid', () => {
  expect(normalizePhoneID('')).toBeNull()
  expect(normalizePhoneID('123')).toBeNull()
  expect(buildWaUrl('', 'Halo')).toBeNull()
})

it('membuat URL wa.me dengan teks ter-encode', () => {
  expect(buildWaUrl('0812-3456-7890', 'Halo Bu & Pak')).toBe(
    'https://wa.me/6281234567890?text=Halo%20Bu%20%26%20Pak',
  )
})

it('pesan memuat nama, nomor order, dan link lacak', () => {
  const text = buildWaMessage('READY', {
    customerName: 'Sari',
    orderNo: 'KMG-261031-0007',
    outletName: 'Laundry Bersih Kilat Kemang',
    trackingUrl: 'https://x.test/lacak/abc',
  })
  expect(text).toContain('Sari')
  expect(text).toContain('KMG-261031-0007')
  expect(text).toContain('https://x.test/lacak/abc')
})

it('memetakan status ke event WhatsApp', () => {
  expect(waEventForStatus('RECEIVED')).toBe('ORDER_RECEIVED')
  expect(waEventForStatus('IN_WASHING')).toBe('IN_PROCESS')
  expect(waEventForStatus('IN_DRYING')).toBeNull()
  expect(waEventForStatus('READY_FOR_PICKUP')).toBe('READY')
  expect(waEventForStatus('OUT_FOR_DELIVERY')).toBe('OUT_FOR_DELIVERY')
  expect(waEventForStatus('DELIVERED')).toBe('COMPLETED')
  expect(waEventForStatus('COMPLETED')).toBe('COMPLETED')
  expect(waEventForStatus('ISSUE_REPORTED')).toBe('ISSUE')
})
