import { X } from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, font, radius, space } from '@/theme'
import { Button, type ButtonVariant } from './Button'
import { TextField } from './TextField'

/** Lembar bawah (bottom sheet) berbasis Modal. */
export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  visible: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Dialog Modal Android edge-to-edge tidak di-resize oleh keyboard, jadi padding dipakai di kedua platform. */}
      <KeyboardAvoidingView behavior="padding" style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Tutup" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space(3) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.titles}>
              <Text style={styles.title}>{title}</Text>
              {description && <Text style={styles.description}>{description}</Text>}
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Tutup">
              <X size={22} color={color.subtle} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={{ gap: space(4) }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** Lembar untuk aksi yang wajib beralasan (tahan, batal, gagal antar, cuci ulang). */
export function ReasonSheet({
  visible,
  title,
  description,
  label = 'Alasan',
  placeholder,
  confirmLabel,
  confirmVariant = 'danger',
  onConfirm,
  onClose,
}: {
  visible: boolean
  title: string
  description?: string
  label?: string
  placeholder?: string
  confirmLabel: string
  confirmVariant?: ButtonVariant
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const close = () => {
    setReason('')
    onClose()
  }
  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={title}
      description={description}
      footer={
        <Button
          title={confirmLabel}
          variant={confirmVariant}
          size="lg"
          disabled={!reason.trim()}
          onPress={() => {
            onConfirm(reason.trim())
            setReason('')
          }}
        />
      }
    >
      <TextField label={label} required value={reason} onChangeText={setReason} placeholder={placeholder} multiline hint="Wajib diisi. Tercatat di riwayat dan audit log." />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(10,15,30,0.5)' },
  sheet: { maxHeight: '88%', backgroundColor: color.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space(4) },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, marginTop: space(2) },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space(3), paddingTop: space(3), paddingBottom: space(3) },
  titles: { flex: 1 },
  title: { fontFamily: font.bold, fontSize: 18, color: color.fg },
  description: { marginTop: 2, fontFamily: font.regular, fontSize: 13, color: color.muted },
  close: { width: 44, height: 44, marginRight: -space(2), marginTop: -space(2), alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  footer: { paddingTop: space(3), gap: space(2) },
})
