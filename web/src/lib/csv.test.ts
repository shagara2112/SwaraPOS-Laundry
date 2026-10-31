import { it, expect } from 'vitest'
import { toCsv } from './csv'

it('meng-quote koma, kutip, dan baris baru', () => {
  expect(toCsv([{ a: 'x,y', b: 'say "hi"', c: 3 }])).toBe('a,b,c\n"x,y","say ""hi""",3')
  expect(toCsv([{ a: 'baris\nbaru' }])).toBe('a\n"baris\nbaru"')
})

it('array kosong menghasilkan string kosong', () => {
  expect(toCsv([])).toBe('')
})
