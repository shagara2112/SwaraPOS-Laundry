import type { Metadata } from 'next'
import { AdminShell } from '@/components/layout/admin-shell'

export const metadata: Metadata = {
  title: { default: 'Super Admin', template: '%s · Super Admin SwaraPOS' },
  robots: { index: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
