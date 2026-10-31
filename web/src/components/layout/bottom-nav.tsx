'use client'

import { Ellipsis } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Drawer } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { activeHref, NavLinks, type NavItem } from './sidebar'

const PRIMARY_COUNT = 4

/** Navigasi bawah untuk layar < 768px: 4 menu utama + "Lainnya". */
export function BottomNav({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const active = activeHref(pathname, items)
  const primary = items.slice(0, PRIMARY_COUNT)
  const rest = items.slice(PRIMARY_COUNT)
  const restActive = rest.some((i) => i.href === active)

  const itemClass = (isActive: boolean) =>
    cn(
      'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium',
      isActive ? 'text-primary' : 'text-fg-subtle',
    )

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur',
          className,
        )}
        aria-label="Navigasi bawah"
      >
        {primary.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={itemClass(href === active)} aria-current={href === active ? 'page' : undefined}>
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
        {rest.length > 0 && (
          <button type="button" onClick={() => setMoreOpen(true)} className={itemClass(restActive)}>
            <Ellipsis className="size-5" aria-hidden />
            Lainnya
          </button>
        )}
      </nav>
      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu lainnya">
        <NavLinks items={rest} onNavigate={() => setMoreOpen(false)} />
      </Drawer>
    </>
  )
}
