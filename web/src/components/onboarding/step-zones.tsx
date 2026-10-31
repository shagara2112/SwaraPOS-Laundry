'use client'

import { Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import type { DeliveryZone } from '@/lib/types'
import type { StepProps } from './types'

function NumberCell({ value, onChange, label, suffix }: { value: number; onChange: (n: number) => void; label: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={0}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tabular h-10 w-28"
        aria-label={label}
      />
      {suffix && <span className="text-xs text-fg-subtle">{suffix}</span>}
    </div>
  )
}

export function StepZones({ value, onChange }: StepProps<'zones'>) {
  // Batas atas satu zona otomatis menjadi batas bawah zona berikutnya, supaya tidak ada celah.
  const set = (i: number, patch: Partial<DeliveryZone>) =>
    onChange(
      value.map((z, idx) => {
        if (idx === i) return { ...z, ...patch }
        if (idx === i + 1 && patch.maxKm !== undefined) return { ...z, minKm: patch.maxKm }
        return z
      }),
    )
  return (
    <div className="space-y-4">
      <p className="flex gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-fg">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        Zona dihitung dari jarak garis lurus outlet ke alamat pelanggan. Alamat di luar zona terakhir ditandai perlu
        konfirmasi staf.
      </p>
      <div className="rounded-xl border border-border">
        <Table>
          <thead>
            <tr>
              <Th>Zona</Th>
              <Th>Sampai radius</Th>
              <Th>Biaya jemput</Th>
              <Th>Biaya antar</Th>
            </tr>
          </thead>
          <tbody>
            {value.map((z, i) => (
              <Tr key={z.id}>
                <Td className="font-medium">
                  {z.name}
                  <span className="block text-xs font-normal text-fg-subtle">mulai {z.minKm} km</span>
                </Td>
                <Td>
                  <NumberCell value={z.maxKm} label={`Radius ${z.name}`} suffix="km" onChange={(n) => set(i, { maxKm: n })} />
                </Td>
                <Td>
                  <NumberCell value={z.pickupFee} label={`Biaya jemput ${z.name}`} onChange={(n) => set(i, { pickupFee: n })} />
                </Td>
                <Td>
                  <NumberCell value={z.deliveryFee} label={`Biaya antar ${z.name}`} onChange={(n) => set(i, { deliveryFee: n })} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  )
}
