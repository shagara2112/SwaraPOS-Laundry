import Link from 'next/link'
import { BrandMark } from '@/components/layout/brand-mark'
import { ButtonLink } from '@/components/ui/button'

const LINKS = [
  { href: '/#alur', label: 'Alur' },
  { href: '/#fitur', label: 'Fitur' },
  { href: '/#harga', label: 'Harga' },
  { href: '/#faq', label: 'FAQ' },
]

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="SwaraPOS Laundry — beranda">
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi landing">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ButtonLink href="/masuk" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Masuk
          </ButtonLink>
          <ButtonLink href="/daftar" size="sm">
            Daftar Gratis
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
