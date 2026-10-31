import { getRandomValues } from 'expo-crypto'

// @swarapos/core memakai crypto.getRandomValues untuk token lacak; Hermes tidak selalu menyediakannya.
const g = globalThis as { crypto?: { getRandomValues?: unknown } }
if (!g.crypto?.getRandomValues) {
  g.crypto = { ...(g.crypto ?? {}), getRandomValues }
}
