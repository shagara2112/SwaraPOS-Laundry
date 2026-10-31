import { Bike, History, UserRound } from 'lucide-react-native'
import { RoleTabs } from '@/components/RoleTabs'

export default function Layout() {
  return (
    <RoleTabs
      role="COURIER"
      tabs={[
        { name: 'index', title: 'Tugas', icon: Bike },
        { name: 'riwayat', title: 'Riwayat', icon: History },
        { name: 'akun', title: 'Akun', icon: UserRound },
      ]}
    />
  )
}
