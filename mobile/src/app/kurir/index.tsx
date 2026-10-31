import { Hammer } from 'lucide-react-native'
import { EmptyState } from '@/ui/misc'
import { Screen } from '@/ui/Screen'

// Placeholder sampai task layar ini dikerjakan.
export default function Placeholder() {
  return (
    <Screen title="Tugas">
      <EmptyState icon={Hammer} title="Sedang dibangun" />
    </Screen>
  )
}
