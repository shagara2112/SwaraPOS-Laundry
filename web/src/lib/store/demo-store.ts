import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { createSeed } from './seed'
import {
  DEMO_STATE_VERSION,
  migratePersisted,
  parseStoredJson,
  type ActionResult,
  type DemoState,
} from './state'

export type DemoStore = DemoState & {
  /** Jalankan reducer terhadap state saat ini; state hanya diganti bila hasilnya `ok`. */
  run<T>(fn: (s: DemoState) => ActionResult<T>): ActionResult<T>
  reset(): void
}

function pickState(store: DemoStore): DemoState {
  const { run: _run, reset: _reset, ...state } = store
  void _run
  void _reset
  return state
}

// localStorage bisa tidak tersedia (mode privat) atau berisi JSON rusak; keduanya
// tidak boleh menghentikan hidrasi.
const safeStorage: PersistStorage<DemoState> = {
  getItem: (name) => {
    try {
      return parseStoredJson(localStorage.getItem(name)) as StorageValue<DemoState> | null
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value))
    } catch {
      // Kuota penuh atau penyimpanan diblokir: demo tetap jalan di memori.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      // Abaikan.
    }
  },
}

export const useDemo = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...createSeed(new Date()),
      run: (fn) => {
        const result = fn(pickState(get()))
        if (result.ok) set(result.state)
        return result
      },
      reset: () => set(createSeed(new Date())),
    }),
    {
      name: 'swarapos-demo',
      version: DEMO_STATE_VERSION,
      // Data contoh hanya dibaca dari localStorage setelah mount (lihat useHydrated),
      // supaya HTML server dan render pertama di browser selalu sama.
      skipHydration: true,
      storage: safeStorage,
      partialize: (store) => pickState(store),
      migrate: (persisted, version) => migratePersisted(persisted, version) ?? createSeed(new Date()),
      merge: (persisted, current) => {
        const valid = migratePersisted(persisted, DEMO_STATE_VERSION)
        return valid ? { ...current, ...valid } : current
      },
    },
  ),
)
