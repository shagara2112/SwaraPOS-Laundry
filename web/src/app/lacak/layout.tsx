import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lacak cucian',
  robots: { index: false, follow: false },
}

export default function LacakLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-bg">{children}</div>
}
