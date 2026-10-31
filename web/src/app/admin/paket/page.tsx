'use client'

import { Save } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { parseRupiahID } from '@/lib/format'
import { act } from '@/lib/store/act'
import { updatePlan } from '@/lib/store/actions-platform'
import { useDemo } from '@/lib/store/demo-store'
import type { Plan } from '@/lib/types'

function PlanEditor({ plan, allFeatures }: { plan: Plan; allFeatures: string[] }) {
  const [price, setPrice] = useState(String(plan.pricePerOutletMonth))
  const [outlets, setOutlets] = useState(String(plan.limits.outlets))
  const [staff, setStaff] = useState(String(plan.limits.staff))
  const [features, setFeatures] = useState(plan.features)
  const priceValue = parseRupiahID(price)
  const outletsValue = parseRupiahID(outlets)
  const staffValue = parseRupiahID(staff)
  const invalid = priceValue === null || !outletsValue || !staffValue

  return (
    <Card>
      <CardHeader title={`Paket ${plan.name}`} description="Order tidak dibatasi. Harga dan limit disnapshot pada awal periode; invoice lama tidak berubah." />
      <CardBody className="space-y-5 pt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Harga / outlet / bulan (Rp)" htmlFor={`${plan.code}-price`}>
            <Input id={`${plan.code}-price`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="tabular" />
          </Field>
          <Field label="Maks. outlet" htmlFor={`${plan.code}-outlets`}>
            <Input id={`${plan.code}-outlets`} inputMode="numeric" value={outlets} onChange={(e) => setOutlets(e.target.value)} className="tabular" />
          </Field>
          <Field label="Maks. karyawan" htmlFor={`${plan.code}-staff`}>
            <Input id={`${plan.code}-staff`} inputMode="numeric" value={staff} onChange={(e) => setStaff(e.target.value)} className="tabular" />
          </Field>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-fg">Fitur (feature flag)</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {allFeatures.map((f) => (
              <label key={f} className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={features.includes(f)}
                  onChange={(e) => setFeatures(e.target.checked ? [...features, f] : features.filter((x) => x !== f))}
                  className="size-5 accent-[var(--primary)]"
                />
                {f}
              </label>
            ))}
          </div>
        </fieldset>
        {invalid && <p className="text-sm font-medium text-danger">Harga harus angka bulat; limit outlet dan karyawan harus lebih dari 0.</p>}
        <Button
          disabled={invalid}
          onClick={() =>
            act(
              (s) =>
                updatePlan(
                  s,
                  plan.code,
                  { pricePerOutletMonth: priceValue!, limits: { outlets: outletsValue!, staff: staffValue! }, features: allFeatures.filter((f) => features.includes(f)) },
                  s.adminActor,
                  new Date(),
                ),
              `Paket ${plan.name} disimpan`,
            )
          }
        >
          <Save aria-hidden />
          Simpan paket
        </Button>
      </CardBody>
    </Card>
  )
}

export default function PaketPage() {
  const plans = useDemo((s) => s.platform.plans)
  const allFeatures = [...new Set(plans.flatMap((p) => p.features))]
  return (
    <>
      <PageHeader title="Paket" description="Model per outlet per bulan. Perubahan berlaku mulai periode berikutnya." />
      <div className="grid gap-6 xl:grid-cols-2">
        {plans.map((p) => (
          <PlanEditor key={p.code} plan={p} allFeatures={allFeatures} />
        ))}
      </div>
    </>
  )
}
