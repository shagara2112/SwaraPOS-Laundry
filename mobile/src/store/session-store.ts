import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Role } from '@swarapos/core/permissions'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useDemo } from './demo-store'

type Session = {
  role: Role | null
  outletId: string | null
  signIn: (role: Role, outletId: string) => void
  signOut: () => void
}

/** Sesi demo: peran dan outlet yang dipilih di layar Masuk. Login sungguhan menyusul bersama backend. */
export const useSession = create<Session>()(
  persist(
    (set) => ({
      role: null,
      outletId: null,
      signIn: (role, outletId) => {
        useDemo.setState({ activeOutletId: outletId })
        set({ role, outletId })
      },
      signOut: () => set({ role: null }),
    }),
    {
      name: 'swarapos-session',
      skipHydration: true,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ role: s.role, outletId: s.outletId }),
    },
  ),
)
