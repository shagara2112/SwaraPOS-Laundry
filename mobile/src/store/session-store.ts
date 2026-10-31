import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Role } from '@swarapos/core/permissions'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useDemo } from './demo-store'

type Session = {
  role: Role | null
  outletId: string | null
  /** Staf yang dipilih bila satu peran punya beberapa orang di outlet (mis. dua kurir). */
  staffId: string | null
  signIn: (role: Role, outletId: string, staffId?: string) => void
  signOut: () => void
}

/** Sesi demo: peran dan outlet yang dipilih di layar Masuk. Login sungguhan menyusul bersama backend. */
export const useSession = create<Session>()(
  persist(
    (set) => ({
      role: null,
      outletId: null,
      staffId: null,
      signIn: (role, outletId, staffId) => {
        useDemo.setState({ activeOutletId: outletId })
        set({ role, outletId, staffId: staffId ?? null })
      },
      signOut: () => set({ role: null }),
    }),
    {
      name: 'swarapos-session',
      skipHydration: true,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ role: s.role, outletId: s.outletId, staffId: s.staffId }),
    },
  ),
)
