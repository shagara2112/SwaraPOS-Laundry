import Link from 'next/link'
import { BrandMark } from '@/components/layout/brand-mark'

const COLUMNS = [
  {
    title: 'Produk',
    links: [
      { href: '/#alur', label: 'Alur kerja' },
      { href: '/#fitur', label: 'Fitur' },
      { href: '/#harga', label: 'Harga' },
    ],
  },
  {
    title: 'Mulai',
    links: [
      { href: '/daftar', label: 'Daftar gratis' },
      { href: '/masuk', label: 'Masuk' },
      { href: '/#demo', label: 'Minta demo' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <BrandMark />
          <p className="mt-4 max-w-xs text-sm text-fg-muted">
            Platform operasional dan pelacakan cucian untuk usaha laundry Indonesia.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-fg">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-fg-muted hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-fg-subtle">
        © 2026 SwaraPOS Laundry · Prototipe tampilan
      </div>
    </footer>
  )
}
