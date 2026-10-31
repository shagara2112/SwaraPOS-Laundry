import { CameraView, useCameraPermissions } from 'expo-camera'
import { Camera, RotateCcw } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { toast } from '@/ui/Toast'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'

/** Foto bukti serah-terima. URI hanya disimpan di perangkat (prototipe belum mengunggah). */
export function ProofCamera({ uri, onChange }: { uri: string | null; onChange: (uri: string | null) => void }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const camera = useRef<CameraView>(null)

  const shoot = async () => {
    if (!camera.current || busy) return
    setBusy(true)
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.5 })
      if (photo?.uri) {
        onChange(photo.uri)
        setOpen(false)
      }
    } catch {
      toast('Foto gagal diambil. Coba lagi atau pakai tanda tangan.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (uri) {
    return (
      <View style={{ gap: space(2) }}>
        <Image source={{ uri }} style={styles.preview} accessibilityLabel="Foto bukti serah-terima" />
        <Button title="Ulangi foto" icon={RotateCcw} variant="ghost" onPress={() => onChange(null)} />
      </View>
    )
  }

  if (!open) return <Button title="Ambil foto bukti" icon={Camera} variant="secondary" onPress={() => setOpen(true)} />

  if (!permission?.granted) {
    const blocked = permission && !permission.canAskAgain
    return (
      <View style={styles.denied}>
        <Text style={styles.text}>
          {blocked ? 'Izin kamera ditolak. Aktifkan di Pengaturan Android, atau pakai tanda tangan penerima.' : 'Kamera dipakai untuk memotret cucian saat diserahkan.'}
        </Text>
        {!blocked && <Button title="Izinkan kamera" onPress={requestPermission} />}
      </View>
    )
  }

  return (
    <View style={{ gap: space(2) }}>
      <View style={styles.preview}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      </View>
      <Button title="Potret" icon={Camera} size="lg" loading={busy} onPress={shoot} />
    </View>
  )
}

const styles = StyleSheet.create({
  preview: { height: 220, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.surface2 },
  denied: { gap: space(2), padding: space(3), borderRadius: radius.md, backgroundColor: color.surface2 },
  text: { fontFamily: font.regular, fontSize: 13, color: color.muted },
})
