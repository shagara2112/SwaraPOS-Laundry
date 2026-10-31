import { QrCode, UserRound, WashingMachine } from 'lucide-react-native'
import { RoleTabs } from '@/components/RoleTabs'

export default function Layout() {
  return (
    <RoleTabs
      role="OPERATOR"
      tabs={[
        { name: 'index', title: 'Produksi', icon: WashingMachine },
        { name: 'scan', title: 'Scan', icon: QrCode },
        { name: 'akun', title: 'Akun', icon: UserRound },
      ]}
    />
  )
}
