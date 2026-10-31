'use client'

import type { LucideIcon } from 'lucide-react'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { BrandMark } from './brand-mark'

export type NavItem = { href: string; label: string; icon: LucideIcon }

/** Item aktif = href terpanjang yang cocok dengan path, supaya /app/order/baru tidak ikut menyalakan /app/order. */
export function activeHref(pathname: string, items: NavItem[]): string | undefined {
  return items
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(href + '/'))
    .sort((a, b) => b.length - a.length)[0]
}

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = activeHref(pathname, items)
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = href === active
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors pointer-coarse:h-11',
                isActive ? 'bg-primary-soft text-primary' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              {isActive && <span className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-primary" aria-hidden />}
              <Icon className="size-[18px] shrink-0" aria-hidden />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Sidebar({
  items,
  areaLabel,
  footer,
  className,
}: {
  items: NavItem[]
  areaLabel: string
  footer?: ReactNode
  className?: string
}) {
  return (
    <aside className={cn('flex-col border-r border-border bg-surface', className)}>
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Beranda SwaraPOS">
          <BrandMark subtitle={areaLabel} />
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3" aria-label="Navigasi utama">
        <NavLinks items={items} />
      </nav>
      <div className="space-y-3 border-t border-border p-4">
        {footer}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-medium text-fg-subtle hover:text-fg"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Lihat landing page
        </Link>
      </div>
    </aside>
  )
}
