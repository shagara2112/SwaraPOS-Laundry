import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { color, font, radius, space } from '@/theme'

export function TextField({
  label,
  error,
  hint,
  required,
  style,
  ...input
}: TextInputProps & { label?: string; error?: string; hint?: string; required?: boolean }) {
  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: color.danger }}> *</Text>}
        </Text>
      )}
      <TextInput
        placeholderTextColor={color.subtle}
        accessibilityLabel={label}
        style={[styles.input, input.multiline && styles.multiline, !!error && styles.invalid, style]}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space(1.5) },
  label: { fontFamily: font.medium, fontSize: 14, color: color.fg },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    paddingHorizontal: space(3),
    fontFamily: font.regular,
    fontSize: 15,
    color: color.fg,
  },
  multiline: { minHeight: 88, paddingTop: space(3), textAlignVertical: 'top' },
  invalid: { borderColor: color.danger },
  error: { fontFamily: font.medium, fontSize: 12, color: color.danger },
  hint: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
})
