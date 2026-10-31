import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware'
import { createSeed } from '@swarapos/core/store/seed'
import {
  DEMO_STATE_VERSION,
  isDemoStale,
  migratePersisted,
  parseStoredJson,
  shiftDemoTime,
  type ActionResult,
  type DemoState,
} from '@swarapos/core/store/state'

export type DemoStore = DemoState & {
  /** Jalankan reducer dari core; state hanya diganti bila hasilnya `ok`. */
  run<T>(fn: (s: DemoState) => ActionResult<T>): ActionResult<T>
  reset(): void
}

function pickState(store: DemoStore): DemoState {
  const { run: _run, reset: _reset, ...state } = store
  void _run
  void _reset
  return state
}

// AsyncStorage bisa berisi JSON rusak atau gagal dibaca; keduanya tidak boleh menghentikan hidrasi.
const safeStorage: PersistStorage<DemoState> = {
  getItem: async (name) => {
    try {
      return parseStoredJson(await AsyncStorage.getItem(name)) as StorageValue<DemoState> | null
    } catch {
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value))
    } catch {
      // Penyimpanan penuh: demo tetap jalan di memori.
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name)
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
      skipHydration: true,
      storage: safeStorage,
      partialize: (store) => pickState(store),
      migrate: (persisted, version) => migratePersisted(persisted, version) ?? createSeed(new Date()),
      merge: (persisted, current) => {
        const valid = migratePersisted(persisted, DEMO_STATE_VERSION)
        if (!valid) return current
        const now = new Date()
        return { ...current, ...(isDemoStale(valid, now) ? shiftDemoTime(valid, now) : valid) }
      },
    },
  ),
)
