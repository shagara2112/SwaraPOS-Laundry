import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useSession } from '@/store/session-store'

// Placeholder grup (kurir) sampai Task 5 menambahkan tab.
export default function Placeholder() {
  const signOut = useSession((s) => s.signOut)
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text>Grup kurir</Text>
      <Pressable onPress={() => { signOut(); router.replace('/masuk') }}>
        <Text>Ganti peran</Text>
      </Pressable>
    </View>
  )
}
