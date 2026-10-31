import type { Metadata } from 'next'
import { AppMockup } from '@/components/marketing/app-mockup'
import { DemoForm } from '@/components/marketing/demo-form'
import { Faq } from '@/components/marketing/faq'
import { FeaturesByRole } from '@/components/marketing/features-by-role'
import { FlowVisual } from '@/components/marketing/flow-visual'
import { Footer } from '@/components/marketing/footer'
import { Hero } from '@/components/marketing/hero'
import { Navbar } from '@/components/marketing/navbar'
import { Pricing } from '@/components/marketing/pricing'
import { ProblemBenefit } from '@/components/marketing/problem-benefit'
import { Testimonials } from '@/components/marketing/testimonials'

export const metadata: Metadata = {
  title: { absolute: 'SwaraPOS Laundry — Operasional & pelacakan cucian dalam satu alur' },
  description:
    'Kasir, produksi, QC, antar-jemput, dan pembayaran laundry dalam satu aplikasi. Pelanggan melacak cucian lewat link WhatsApp tanpa install aplikasi.',
  openGraph: {
    title: 'SwaraPOS Laundry',
    description: 'Cucian pelanggan selalu terlacak, operasional laundry selalu terkendali.',
    type: 'website',
    locale: 'id_ID',
  },
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FlowVisual />
        <ProblemBenefit />
        <FeaturesByRole />
        <AppMockup />
        <Pricing />
        <Testimonials />
        <Faq />
        <DemoForm />
      </main>
      <Footer />
    </>
  )
}
