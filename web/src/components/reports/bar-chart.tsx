'use client'

import { Table2, ChartColumn } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/cn'

export type Datum = { label: string; value: number; hint?: string }

/** Kartu grafik dengan sakelar tabel, supaya data tidak hanya bisa dibaca lewat warna/panjang batang. */
export function ChartCard({
  title,
  description,
  data,
  format,
  children,
}: {
  title: string
  description?: string
  data: Datum[]
  format: (n: number) => string
  children: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <button
            type="button"
            onClick={() => setAsTable(!asTable)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-fg-muted hover:bg-surface-2 hover:text-fg pointer-coarse:h-11"
            aria-pressed={asTable}
          >
            {asTable ? <ChartColumn className="size-4" aria-hidden /> : <Table2 className="size-4" aria-hidden />}
            {asTable ? 'Grafik' : 'Tabel'}
          </button>
        }
      />
      <CardBody>
        {data.every((d) => d.value === 0) ? (
          <p className="py-10 text-center text-sm text-fg-subtle">Belum ada data pada rentang ini.</p>
        ) : asTable ? (
          <table className="w-full text-sm">
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-b border-border last:border-0">
                  <td className="py-2 text-fg-muted">{d.label}</td>
                  <td className="tabular py-2 text-right font-medium text-fg">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          children
        )}
      </CardBody>
    </Card>
  )
}

/** Batang horizontal untuk perbandingan antarkategori (satu seri, satu warna). */
export function HBarChart({ data, format }: { data: Datum[]; format: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="group grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-fg-muted" title={d.label}>
            {d.label}
          </span>
          <span className="relative h-5">
            <span
              className="absolute inset-y-1 left-0 rounded-r-[4px] bg-primary transition-opacity group-hover:opacity-80"
              style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value > 0 ? 4 : 0 }}
            />
            <span className="pointer-events-none absolute -top-8 left-0 z-10 hidden whitespace-nowrap rounded-lg bg-fg px-2 py-1 text-xs font-medium text-bg shadow-pop group-hover:block">
              {d.label}: {format(d.value)}
              {d.hint && ` · ${d.hint}`}
            </span>
          </span>
          <span className="tabular text-right font-semibold text-fg">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Kolom vertikal untuk deret waktu (satu seri), dengan gridline tipis dan tooltip per batang. */
export function ColumnChart({ data, format, formatAxis }: { data: Datum[]; format: (n: number) => string; formatAxis: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const ticks = [max, max / 2, 0]
  const labelEvery = Math.ceil(data.length / 8)
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2">
      <div className="flex h-48 flex-col justify-between pb-0 text-right text-[11px] text-fg-subtle">
        {ticks.map((t) => (
          <span key={t} className="tabular -translate-y-1/2 first:translate-y-0 last:translate-y-0">
            {formatAxis(t)}
          </span>
        ))}
      </div>
      <div className="relative h-48">
        {ticks.map((t, i) => (
          <span key={t} className={cn('absolute inset-x-0 border-t', i === ticks.length - 1 ? 'border-border-strong' : 'border-dashed border-border')} style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d) => (
            <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center">
              <span
                className="w-full max-w-7 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0 }}
              />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-fg px-2 py-1 text-xs font-medium text-bg shadow-pop group-hover:block">
                {d.label}: {format(d.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <span />
      <div className="mt-1.5 flex gap-[2px] text-[11px] text-fg-subtle">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 truncate text-center">
            {i % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
