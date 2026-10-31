import type { Metadata } from 'next'
import { TenantShell } from '@/components/layout/tenant-shell'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s · SwaraPOS Laundry' },
  robots: { index: false },
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <TenantShell>{children}</TenantShell>
}
