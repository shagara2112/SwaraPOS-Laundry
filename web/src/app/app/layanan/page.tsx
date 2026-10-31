'use client'

import { Info } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { parseRupiahID } from '@/lib/format'
import { UNIT_SHORT } from '@/lib/labels'
import { act } from '@/lib/store/act'
import { setServiceActive, updateServicePrice } from '@/lib/store/actions-catalog'
import { useDemo } from '@/lib/store/demo-store'
import type { Service } from '@/lib/types'

function PriceCell({ service, outletId, outletCode }: { service: Service; outletId: string; outletCode: string }) {
  const current = service.prices[outletId] ?? 0
  const [value, setValue] = useState(String(current))
  const commit = () => {
    const next = parseRupiahID(value)
    if (next === null) {
      toast('Harga harus angka rupiah bulat, contoh 7500 atau 7.500.', 'error')
      setValue(String(current))
      return
    }
    if (next === current) {
      setValue(String(current))
      return
    }
    const r = act((s) => updateServicePrice(s, service.id, outletId, next, s.tenantActor, new Date()), `Harga ${service.name} (${outletCode}) diperbarui`)
    if (!r.ok) setValue(String(current))
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-fg-subtle">Rp</span>
      <Input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="tabular h-10 w-28 text-right"
        aria-label={`Harga ${service.name} di ${outletCode}`}
        disabled={!service.active}
      />
    </div>
  )
}

export default function LayananPage() {
  const services = useDemo((s) => s.services)
  const outlets = useDemo((s) => s.outlets)
  const categories = [...new Set(services.map((s) => s.category))]

  return (
    <>
      <PageHeader title="Layanan & harga" description="Harga per outlet. Tekan Enter atau pindah kolom untuk menyimpan." />
      <p className="mb-5 flex gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-fg">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        Perubahan harga hanya berlaku untuk order baru. Order lama memakai harga saat order dibuat dan tercatat di audit log.
      </p>
      <div className="space-y-6">
        {categories.map((cat) => (
          <Card key={cat}>
            <h2 className="px-5 pt-4 text-sm font-semibold uppercase tracking-wide text-fg-subtle">{cat}</h2>
            <Table className="mt-2">
              <thead>
                <tr>
                  <Th>Layanan</Th>
                  <Th>Satuan</Th>
                  <Th>Durasi</Th>
                  {outlets.map((o) => (
                    <Th key={o.id}>Harga {o.code}</Th>
                  ))}
                  <Th className="text-right">Aktif</Th>
                </tr>
              </thead>
              <tbody>
                {services
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <Tr key={s.id} className={cn(!s.active && 'opacity-60')}>
                      <Td className="font-medium">{s.name}</Td>
                      <Td className="text-fg-muted">{s.unit === 'ADDON' ? 'add-on' : `per ${UNIT_SHORT[s.unit]}`}</Td>
                      <Td className="tabular text-fg-muted">{s.durationHours ? `${s.durationHours} jam` : '—'}</Td>
                      {outlets.map((o) => (
                        <Td key={o.id}>
                          <PriceCell key={`${s.id}-${o.id}-${s.prices[o.id]}`} service={s} outletId={o.id} outletCode={o.code} />
                        </Td>
                      ))}
                      <Td className="text-right">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={s.active}
                          aria-label={`${s.active ? 'Nonaktifkan' : 'Aktifkan'} ${s.name}`}
                          onClick={() => act((st) => setServiceActive(st, s.id, !s.active, st.tenantActor, new Date()), s.active ? `${s.name} dinonaktifkan` : `${s.name} diaktifkan`)}
                          className={cn('inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors', s.active ? 'bg-primary' : 'bg-border-strong')}
                        >
                          <span className={cn('size-5 rounded-full bg-white shadow transition-transform', s.active && 'translate-x-5')} />
                        </button>
                      </Td>
                    </Tr>
                  ))}
              </tbody>
            </Table>
          </Card>
        ))}
      </div>
    </>
  )
}
