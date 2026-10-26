import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { IconBook, IconChat, IconCompass, IconHome, IconUser } from '@/components/icons';
import { useStore } from '@/lib/store';
import { C, F } from '@/lib/theme';

export default function TabsLayout() {
  const onboarded = useStore((s) => s.prefs.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
        tabBarLabelStyle: { fontFamily: F.sansMedium, fontSize: 11 },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Kreu', tabBarIcon: ({ color }) => <IconHome color={color as string} size={22} /> }} />
      <Tabs.Screen name="lexo" options={{ title: 'Lexo', tabBarIcon: ({ color }) => <IconBook color={color as string} size={22} /> }} />
      <Tabs.Screen name="pyet" options={{ title: 'Pyet Imanin', tabBarIcon: ({ color }) => <IconChat color={color as string} size={22} /> }} />
      <Tabs.Screen name="eksploro" options={{ title: 'Eksploro', tabBarIcon: ({ color }) => <IconCompass color={color as string} size={22} /> }} />
      <Tabs.Screen name="profili" options={{ title: 'Profili', tabBarIcon: ({ color }) => <IconUser color={color as string} size={22} /> }} />
    </Tabs>
  );
}
