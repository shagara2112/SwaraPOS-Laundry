import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandMark } from '@/components/layout/brand-mark'

/** Bingkai halaman masuk/daftar: latar glow, logo, kartu di tengah. */
export function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="Kembali ke beranda">
          <BrandMark />
        </Link>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-md animate-rise">
          <div className="rounded-3xl border border-white/10 bg-surface/85 p-6 shadow-pop backdrop-blur sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
            <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>
        </div>
      </main>
    </div>
  )
}
