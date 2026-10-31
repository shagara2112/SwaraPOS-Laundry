'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const KEY = 'swarapos-theme'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark')
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    if (next) document.documentElement.dataset.theme = 'dark'
    else delete document.documentElement.dataset.theme
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light')
    } catch {
      // Penyimpanan diblokir: tema tetap berlaku sampai halaman dimuat ulang.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-xl text-fg-muted hover:bg-surface-2 hover:text-fg pointer-coarse:size-11"
      aria-label={dark ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
      title={dark ? 'Mode terang' : 'Mode gelap'}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}
