import { it, expect } from 'vitest'
import { formatDueIn, formatQty } from './labels'

const now = new Date('2026-10-31T03:00:00Z')
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString()

it('formatDueIn menyebut sisa waktu atau keterlambatan', () => {
  expect(formatDueIn(at(90), now)).toBe('1 jam 30 mnt lagi')
  expect(formatDueIn(at(45), now)).toBe('45 mnt lagi')
  expect(formatDueIn(at(2 * 24 * 60 + 5 * 60), now)).toBe('2 hari 5 jam lagi')
  expect(formatDueIn(at(-180), now)).toBe('terlambat 3 jam')
  expect(formatDueIn(at(-20), now)).toBe('terlambat 20 mnt')
})

it('formatQty memakai satuan yang sesuai', () => {
  expect(formatQty('KG', 3.5)).toBe('3,5 kg')
  expect(formatQty('ITEM', 4)).toBe('4 pcs')
  expect(formatQty('PAIR', 1)).toBe('1 pasang')
  expect(formatQty('SQM', 1.25)).toBe('1,25 m²')
  expect(formatQty('ADDON', 1)).toBe('1×')
})
