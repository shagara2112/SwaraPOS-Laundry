import { CircleAlert, CircleCheck, Info } from 'lucide-react-native'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { create } from 'zustand'
import { color, font, radius, shadow, space } from '@/theme'

type ToastTone = 'success' | 'error' | 'info'
type ToastItem = { id: number; message: string; tone: ToastTone }

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }))
let nextId = 1

export function toast(message: string, toneName: ToastTone = 'success') {
  const id = nextId++
  useToasts.setState((s) => ({ items: [...s.items, { id, message, tone: toneName }] }))
}

function ToastRow({ item }: { item: ToastItem }) {
  useEffect(() => {
    const t = setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== item.id) })), 3000)
    return () => clearTimeout(t)
  }, [item.id])
  const Icon = item.tone === 'error' ? CircleAlert : item.tone === 'info' ? Info : CircleCheck
  const iconColor = item.tone === 'error' ? color.danger : item.tone === 'info' ? color.primary : '#15803D'
  return (
    <View style={styles.toast} accessibilityRole="alert">
      <Icon size={20} color={iconColor} />
      <Text style={styles.text}>{item.message}</Text>
    </View>
  )
}

export function Toaster() {
  const items = useToasts((s) => s.items)
  const insets = useSafeAreaInsets()
  if (items.length === 0) return null
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 80 }]}>
      {items.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space(4), right: space(4), alignItems: 'center', gap: space(2) },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    maxWidth: 480,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    ...shadow.pop,
  },
  text: { flexShrink: 1, fontFamily: font.medium, fontSize: 14, color: color.fg },
})
