import { ROLE_HOME } from '@swarapos/core/permissions'
import { Redirect, type Href } from 'expo-router'
import { useSession } from '@/store/session-store'

/** Arahkan ke layar Masuk atau ke grup tab sesuai peran yang tersimpan. */
export default function Index() {
  const role = useSession((s) => s.role)
  return <Redirect href={(role ? ROLE_HOME[role] : '/masuk') as Href} />
}
