import type { Role } from '@swarapos/core/permissions'
import { Redirect } from 'expo-router'
import { Tabs } from 'expo-router/js-tabs'
import type { LucideIcon } from 'lucide-react-native'
import { useSession } from '@/store/session-store'
import { color, font } from '@/theme'

export type TabDef = { name: string; title: string; icon: LucideIcon }

/** Tab bawah untuk satu peran. Peran lain yang membuka rute ini dialihkan ke beranda perannya. */
export function RoleTabs({ role, tabs }: { role: Role; tabs: TabDef[] }) {
  const current = useSession((s) => s.role)
  if (!current) return <Redirect href="/masuk" />
  if (current !== role) return <Redirect href="/" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.subtle,
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        tabBarStyle: { borderTopColor: color.border, backgroundColor: color.surface, minHeight: 60 },
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      {tabs.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color: c, size }) => <Icon size={size ?? 22} color={c} /> }} />
      ))}
    </Tabs>
  )
}
