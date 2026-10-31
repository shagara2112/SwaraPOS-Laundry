import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SwaraPOS Laundry',
    template: '%s · SwaraPOS Laundry',
  },
  description:
    'Platform operasional laundry: order, produksi, pickup-delivery, pembayaran, dan pelacakan cucian pelanggan secara real-time.',
}

export const viewport: Viewport = {
  themeColor: '#2d5bff',
}

// Terapkan tema tersimpan sebelum paint agar tidak berkedip.
const themeScript = `try{if(localStorage.getItem('swarapos-theme')==='dark'){document.documentElement.dataset.theme='dark'}}catch(e){}`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${jakarta.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
