import { newId } from '@swarapos/core/ids'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Directory, File, Paths } from 'expo-file-system'
import { Camera, X } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { color, font, radius, space } from '@/theme'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/Toast'

const MAX = 6

/** Salin foto dari cache kamera ke folder dokumen aplikasi supaya tidak terhapus saat cache dibersihkan. */
function persistPhoto(uri: string): string {
  if (Platform.OS === 'web') return uri
  const dir = new Directory(Paths.document, 'condition')
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true })
  const dest = new File(dir, `${newId('foto')}.jpg`)
  new File(uri).copy(dest)
  return dest.uri
}

/** Foto kondisi awal: pratinjau kecil, hapus (bila diizinkan), dan kamera untuk menambah (maks. 6). */
export function ConditionPhotos({ uris, onAdd, onRemove }: { uris: string[]; onAdd?: (uri: string) => void; onRemove?: (uri: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const camera = useRef<CameraView>(null)
  const full = uris.length >= MAX

  const shoot = async () => {
    if (!camera.current || busy || !onAdd) return
    setBusy(true)
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.5 })
      if (photo?.uri) {
        onAdd(persistPhoto(photo.uri))
        setOpen(false)
      }
    } catch {
      toast('Foto gagal diambil. Coba lagi.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: space(2) }}>
      {uris.length > 0 && (
        <View style={styles.grid}>
          {uris.map((uri, i) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} accessibilityLabel={`Foto kondisi ${i + 1}`} />
              {onRemove && (
                <Pressable onPress={() => onRemove(uri)} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Hapus foto ${i + 1}`}>
                  <X size={14} color={color.white} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
      {onAdd &&
        !full &&
        (!open ? (
          <Button title={uris.length ? 'Tambah foto' : 'Ambil foto kondisi'} icon={Camera} variant="secondary" onPress={() => setOpen(true)} />
        ) : !permission?.granted ? (
          <View style={styles.denied}>
            <Text style={styles.text}>
              {permission && !permission.canAskAgain ? 'Izin kamera ditolak. Aktifkan di Pengaturan Android untuk memotret kondisi cucian.' : 'Kamera dipakai untuk memotret noda atau kerusakan saat cucian diterima.'}
            </Text>
            {(!permission || permission.canAskAgain) && <Button title="Izinkan kamera" onPress={requestPermission} />}
          </View>
        ) : (
          <View style={{ gap: space(2) }}>
            <View style={styles.camera}>
              <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
            </View>
            <Button title="Potret" icon={Camera} size="lg" loading={busy} onPress={shoot} />
            <Button title="Batal" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        ))}
      <Text style={styles.text}>{full ? 'Maksimal 6 foto per order.' : `${uris.length}/6 foto. Potret noda, luntur, atau kerusakan sebelum dicuci.`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  thumbWrap: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.surface2 },
  thumb: { width: '100%', height: '100%' },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.7)' },
  camera: { height: 240, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.surface2 },
  denied: { gap: space(2), padding: space(3), borderRadius: radius.md, backgroundColor: color.surface2 },
  text: { fontFamily: font.regular, fontSize: 12, color: color.subtle },
})
