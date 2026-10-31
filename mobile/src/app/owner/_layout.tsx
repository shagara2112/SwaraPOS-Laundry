import { ChartColumn, ClipboardList, LayoutDashboard, Truck, UserRound } from 'lucide-react-native'
import { RoleTabs } from '@/components/RoleTabs'

export default function Layout() {
  return (
    <RoleTabs
      role="OWNER"
      tabs={[
        { name: 'index', title: 'Ringkasan', icon: LayoutDashboard },
        { name: 'order', title: 'Order', icon: ClipboardList },
        { name: 'antar', title: 'Antar-jemput', icon: Truck },
        { name: 'laporan', title: 'Laporan', icon: ChartColumn },
        { name: 'akun', title: 'Akun', icon: UserRound },
      ]}
    />
  )
}
