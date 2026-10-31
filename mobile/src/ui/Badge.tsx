import type { Tone } from '@swarapos/core/labels'
import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { font, radius, space, tone as tones } from '@/theme'

export function Badge({ tone = 'neutral', label, icon: Icon }: { tone?: Tone; label: string; icon?: LucideIcon }) {
  const t = tones[tone]
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {Icon && <Icon size={13} color={t.fg} />}
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: space(2.5),
    paddingVertical: 3,
  },
  text: { fontFamily: font.semibold, fontSize: 12 },
})
