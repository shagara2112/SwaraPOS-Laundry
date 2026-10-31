'use client'

import { Lock, ScrollText } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { formatDateTime } from '@swarapos/core/format'
import { useDemo } from '@/lib/store/demo-store'

export default function AuditPage() {
  const audit = useDemo((s) => s.platform.audit)
  const tenants = useDemo((s) => s.platform.tenants)
  const [action, setAction] = useState('all')
  const [tenantId, setTenantId] = useState('all')
  const actions = [...new Set(audit.map((a) => a.action))].sort()
  const visible = [...audit]
    .reverse()
    .filter((a) => action === 'all' || a.action === action)
    .filter((a) => tenantId === 'all' || a.tenantId === tenantId)
  const tenantName = (id?: string) => (id ? tenants.find((t) => t.id === id)?.name ?? id : 'Platform')

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Catatan permanen untuk harga, pembayaran, suspend, akses support, dan aksi sensitif lain."
        actions={
          <Badge className="px-3 py-1 text-sm">
            <Lock aria-hidden />
            Tidak dapat diubah
          </Badge>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <Select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter aksi" className="sm:w-72">
            <option value="all">Semua aksi</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} aria-label="Filter tenant" className="sm:w-64">
            <option value="all">Semua tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={ScrollText} title="Tidak ada entri" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Waktu</Th>
                <Th>Aktor</Th>
                <Th>Aksi</Th>
                <Th>Tenant</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <Tr key={a.id}>
                  <Td className="whitespace-nowrap text-fg-muted">{formatDateTime(a.at)}</Td>
                  <Td className="whitespace-nowrap font-medium">{a.actor.name}</Td>
                  <Td>
                    <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg">{a.action}</code>
                  </Td>
                  <Td className="whitespace-nowrap text-fg-muted">{tenantName(a.tenantId)}</Td>
                  <Td className="min-w-64 text-fg-muted">{a.detail}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
