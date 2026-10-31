import { create } from 'zustand'

/** Preferensi tampilan sementara (tidak dipersist). */
export const useUi = create<{ focusMode: boolean; setFocusMode: (on: boolean) => void }>((set) => ({
  focusMode: false,
  setFocusMode: (on) => set({ focusMode: on }),
}))
