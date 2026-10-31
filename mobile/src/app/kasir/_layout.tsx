import { ClipboardList, ScanLine, UserRound, Users } from 'lucide-react-native'
import { RoleTabs } from '@/components/RoleTabs'

export default function Layout() {
  return (
    <RoleTabs
      role="CASHIER"
      tabs={[
        { name: 'index', title: 'Order baru', icon: ScanLine },
        { name: 'order', title: 'Order', icon: ClipboardList },
        { name: 'pelanggan', title: 'Pelanggan', icon: Users },
        { name: 'akun', title: 'Akun', icon: UserRound },
      ]}
    />
  )
}
