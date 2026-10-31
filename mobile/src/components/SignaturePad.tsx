import { Eraser } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'

type Point = { x: number; y: number }

const toPath = (points: Point[]) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
const pointOf = (e: GestureResponderEvent): Point => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })

/** Tanda tangan penerima dengan jari; `onChange(true)` setelah ada goresan. */
export function SignaturePad({ onChange }: { onChange: (signed: boolean) => void }) {
  // Goresan terakhir sedang digambar; update fungsional supaya titik akhir tidak hilang saat jari diangkat.
  const [strokes, setStrokes] = useState<Point[][]>([])
  const signed = strokes.some((s) => s.length > 1)

  return (
    <View style={{ gap: space(2) }}>
      {/* Klaim gestur sejak sentuhan pertama agar ScrollView di lembar bukti tidak ikut menggulir. */}
      <View
        style={styles.pad}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          const p = pointOf(e)
          setStrokes((s) => [...s, [p]])
        }}
        onResponderMove={(e) => {
          const p = pointOf(e)
          setStrokes((s) => [...s.slice(0, -1), [...(s[s.length - 1] ?? []), p]])
          onChange(true)
        }}
        accessibilityLabel="Area tanda tangan penerima"
      >
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {strokes
            .filter((s) => s.length > 1)
            .map((s, i) => (
              <Path key={i} d={toPath(s)} stroke={color.fg} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
        </Svg>
        {!signed && (
          <Text style={styles.placeholder} selectable={false}>
            Tanda tangan di sini
          </Text>
        )}
      </View>
      <Button
        title="Hapus tanda tangan"
        icon={Eraser}
        variant="ghost"
        disabled={!signed}
        onPress={() => {
          setStrokes([])
          onChange(false)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { height: 160, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.white, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontFamily: font.regular, fontSize: 13, color: color.subtle },
})
