import { cn } from '@/lib/cn'

/** Logo SwaraPOS: gelombang air di dalam kotak bergradien, dibaca juga sebagai huruf S. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9', className)} aria-hidden>
      <defs>
        <linearGradient id="swara-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2d5bff" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#swara-g)" />
      <path
        d="M27.5 13.2c-1.6-1.6-4-2.4-6.6-2.4-3.9 0-6.6 2-6.6 4.9 0 2.6 2.1 3.7 5.4 4.4l1.6.3c2.4.5 3.4 1.1 3.4 2.4 0 1.5-1.6 2.5-4 2.5-2.3 0-4.3-.9-5.7-2.4"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M10 30.5c2.5-1.6 5-1.6 7.5 0s5 1.6 7.5 0 5-1.6 7.5 0" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function BrandMark({ className, subtitle = 'Laundry' }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandLogo />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-bold tracking-tight">SwaraPOS</span>
        <span className="mt-0.5 text-xs font-medium text-fg-subtle">{subtitle}</span>
      </span>
    </span>
  )
}
