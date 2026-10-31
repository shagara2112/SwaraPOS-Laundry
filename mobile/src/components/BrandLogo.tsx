import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'

/** Logo SwaraPOS (sama dengan web): gelombang air di kotak bergradien, dibaca juga sebagai huruf S. */
export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="SwaraPOS">
      <Defs>
        <LinearGradient id="swara" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2d5bff" />
          <Stop offset="0.55" stopColor="#7c3aed" />
          <Stop offset="1" stopColor="#06b6d4" />
        </LinearGradient>
      </Defs>
      <Rect width="40" height="40" rx="11" fill="url(#swara)" />
      <Path
        d="M27.5 13.2c-1.6-1.6-4-2.4-6.6-2.4-3.9 0-6.6 2-6.6 4.9 0 2.6 2.1 3.7 5.4 4.4l1.6.3c2.4.5 3.4 1.1 3.4 2.4 0 1.5-1.6 2.5-4 2.5-2.3 0-4.3-.9-5.7-2.4"
        fill="none"
        stroke="#fff"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path d="M10 30.5c2.5-1.6 5-1.6 7.5 0s5 1.6 7.5 0 5-1.6 7.5 0" fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}
