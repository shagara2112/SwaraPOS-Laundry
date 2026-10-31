'use client'

import { Building2, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { formatDate } from '@swarapos/core/format'
import { TENANT_STATUS } from '@swarapos/core/labels'
import { useDemo } from '@/lib/store/demo-store'

export default function TenantListPage() {
  const router = useRouter()
  const tenants = useDemo((s) => s.platform.tenants)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const q = query.trim().toLowerCase()
  const visible = tenants
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.ownerName.toLowerCase().includes(q) || t.city.toLowerCase().includes(q))
    .filter((t) => status === 'all' || t.status === status)

  return (
    <>
      <PageHeader title="Tenant" description={`${tenants.length} bisnis laundry terdaftar`} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, owner, atau kota" className="pl-9" aria-label="Cari tenant" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status" className="sm:w-48">
            <option value="all">Semua status</option>
            {Object.entries(TENANT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={Building2} title="Tidak ada tenant yang cocok" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Tenant</Th>
                <Th>Kota</Th>
                <Th>Paket</Th>
                <Th className="text-right">Outlet</Th>
                <Th className="text-right">Order bulan ini</Th>
                <Th>Status</Th>
                <Th>Daftar</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <Tr key={t.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => router.push(`/admin/tenant/${t.id}`)}>
                  <Td>
                    <Link href={`/admin/tenant/${t.id}`} className="font-medium text-fg hover:text-primary" onClick={(e) => e.stopPropagation()}>
                      {t.name}
                    </Link>
                    <p className="text-xs text-fg-subtle">{t.ownerName}</p>
                  </Td>
                  <Td className="text-fg-muted">{t.city}</Td>
                  <Td>
                    <Badge tone={t.plan === 'PRO' ? 'production' : 'neutral'}>{t.plan === 'PRO' ? 'Pro' : 'Basic'}</Badge>
                  </Td>
                  <Td className="tabular text-right">{t.outletCount}</Td>
                  <Td className="tabular text-right">{t.ordersThisMonth.toLocaleString('id-ID')}</Td>
                  <Td>
                    <Badge tone={TENANT_STATUS[t.status].tone}>{TENANT_STATUS[t.status].label}</Badge>
                  </Td>
                  <Td className="text-fg-muted">{formatDate(t.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
