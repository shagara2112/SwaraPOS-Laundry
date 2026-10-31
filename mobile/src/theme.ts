import type { Tone } from '@swarapos/core/labels'

// Nilai sama dengan token web (web/src/app/globals.css, mode terang).
export const color = {
  brandBlue: '#2D5BFF',
  brandViolet: '#7C3AED',
  brandCyan: '#06B6D4',
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  surface2: '#F0F3F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  fg: '#0F172A',
  muted: '#475569',
  subtle: '#64748B',
  primary: '#2D5BFF',
  primaryPressed: '#1E45E6',
  primarySoft: '#EAEFFF',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  whatsapp: '#15803D',
  white: '#FFFFFF',
} as const

export const tone: Record<Tone, { fg: string; bg: string }> = {
  intake: { fg: '#1D4ED8', bg: '#DBEAFE' },
  production: { fg: '#6D28D9', bg: '#EDE9FE' },
  qc: { fg: '#A16207', bg: '#FEF3C7' },
  ready: { fg: '#0E7490', bg: '#CFFAFE' },
  done: { fg: '#15803D', bg: '#DCFCE7' },
  exception: { fg: '#C2410C', bg: '#FFEDD5' },
  neutral: { fg: '#475569', bg: '#F0F3F9' },
  primary: { fg: '#2D5BFF', bg: '#EAEFFF' },
  success: { fg: '#15803D', bg: '#DCFCE7' },
  warning: { fg: '#A16207', bg: '#FEF3C7' },
  danger: { fg: '#DC2626', bg: '#FEE2E2' },
}

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const

/** Kelipatan 4 dp. */
export const space = (n: number) => n * 4

export const shadow = {
  card: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  pop: { shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const
