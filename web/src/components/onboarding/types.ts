import type { DeliveryZone, PricingUnit } from '@/lib/types'

export type DayHours = { day: string; open: boolean; from: string; to: string }

export type WizardState = {
  business: { name: string; color: string; logoUrl?: string }
  outlet: { name: string; address: string; phone: string; hours: DayHours[] }
  zones: DeliveryZone[]
  services: { key: string; name: string; unit: PricingUnit; price: number; enabled: boolean }[]
}

export type StepProps<K extends keyof WizardState> = {
  value: WizardState[K]
  onChange: (value: WizardState[K]) => void
  errors: Record<string, string>
}

export const UNIT_LABEL: Record<PricingUnit, string> = {
  KG: 'per kg',
  ITEM: 'per item',
  PAIR: 'per pasang',
  PACKAGE: 'per paket',
  SQM: 'per m²',
  ADDON: 'add-on',
}
