import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { OfflineBadge } from '@/components/OfflineBadge'
import { color, font, space } from '@/theme'

/** Kerangka layar: header (judul, kembali opsional, status koneksi), isi bergulir, footer opsional. */
export function Screen({
  title,
  subtitle,
  back,
  right,
  children,
  footer,
  scroll = true,
}: {
  title: string
  subtitle?: string
  back?: boolean
  right?: ReactNode
  children: ReactNode
  footer?: ReactNode
  scroll?: boolean
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        {back && (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back} accessibilityRole="button" accessibilityLabel="Kembali">
            <ArrowLeft size={22} color={color.fg} />
          </Pressable>
        )}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
        <OfflineBadge />
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{children}</View>
      )}
      {footer && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    minHeight: 56,
    paddingHorizontal: space(4),
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    backgroundColor: color.surface,
  },
  back: { width: 44, height: 44, marginLeft: -space(2), alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  title: { fontFamily: font.bold, fontSize: 18, color: color.fg },
  subtitle: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
  content: { padding: space(4), paddingBottom: space(10) },
  flex: { flex: 1 },
  footer: { padding: space(3), paddingHorizontal: space(4), borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.surface },
})
