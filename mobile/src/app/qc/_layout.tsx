import { QrCode, ShieldCheck, UserRound } from 'lucide-react-native'
import { RoleTabs } from '@/components/RoleTabs'

export default function Layout() {
  return (
    <RoleTabs
      role="QC"
      tabs={[
        { name: 'index', title: 'Antrean QC', icon: ShieldCheck },
        { name: 'scan', title: 'Scan', icon: QrCode },
        { name: 'akun', title: 'Akun', icon: UserRound },
      ]}
    />
  )
}
