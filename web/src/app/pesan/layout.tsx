import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pesan jemput cucian',
  robots: { index: false, follow: false },
}

export default function PesanLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-bg">{children}</div>
}
