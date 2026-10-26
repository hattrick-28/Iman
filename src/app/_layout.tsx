import '@/global.css';
// Import single weights only, so unused font files aren't bundled.
import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran/400Regular';
import { CormorantSC_600SemiBold } from '@expo-google-fonts/cormorant-sc/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Oswald_600SemiBold } from '@expo-google-fonts/oswald/600SemiBold';
import { Oswald_700Bold } from '@expo-google-fonts/oswald/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { configurePurchases } from '@/lib/purchases';
import { loadState } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { syncNow } from '@/lib/sync';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, border: C.border, primary: C.accent },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Oswald_600SemiBold, Oswald_700Bold, CormorantSC_600SemiBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, AmiriQuran_400Regular,
  });
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    loadState().finally(() => setStateLoaded(true));
    supabase.auth.getSession().then(({ data }) => {
      configurePurchases(data.session?.user.id ?? null);
      syncNow();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        configurePurchases(session?.user.id ?? null);
        syncNow();
      }
    });
    const app = AppState.addEventListener('change', (s) => s === 'active' && syncNow());
    return () => {
      sub.subscription.unsubscribe();
      app.remove();
    };
  }, []);

  const ready = (fontsLoaded || !!fontError) && stateLoaded;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="read" />
        <Stack.Screen name="premium" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="donate" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </ThemeProvider>
  );
}
