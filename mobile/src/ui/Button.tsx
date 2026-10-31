import type { LucideIcon } from 'lucide-react-native'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { color, font, radius, space } from '@/theme'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp'
export type ButtonSize = 'md' | 'lg' | 'xl'

const BG: Record<ButtonVariant, [string, string]> = {
  primary: [color.primary, color.primaryPressed],
  secondary: [color.surface, color.surface2],
  ghost: ['transparent', color.surface2],
  danger: [color.danger, '#B91C1C'],
  whatsapp: [color.whatsapp, '#166534'],
}
const FG: Record<ButtonVariant, string> = {
  primary: color.white,
  secondary: color.fg,
  ghost: color.muted,
  danger: color.white,
  whatsapp: color.white,
}
// Tap target minimal 44 dp; produksi memakai xl (56 dp).
const HEIGHT: Record<ButtonSize, number> = { md: 44, lg: 50, xl: 56 }

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled,
  loading,
  style,
  accessibilityLabel,
}: {
  title: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const fg = FG[variant]
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => [
        styles.base,
        { height: HEIGHT[size], backgroundColor: BG[variant][pressed ? 1 : 0] },
        variant === 'secondary' && styles.outline,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={fg} /> : Icon && <Icon size={size === 'xl' ? 22 : 18} color={fg} />}
        <Text style={[styles.text, { color: fg, fontSize: size === 'xl' ? 17 : 15 }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, paddingHorizontal: space(4), alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: 1, borderColor: color.border },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  text: { fontFamily: font.semibold, flexShrink: 1 },
})
