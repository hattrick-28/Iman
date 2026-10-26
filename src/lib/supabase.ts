import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session as AuthSession } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { CONFIG } from './config';

export const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Refresh tokens only while the app is in the foreground (Supabase's React Native guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export function useSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

/** Albanian messages for the auth errors people actually hit. */
export function authError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Emaili ose fjalëkalimi nuk është i saktë.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ky email ka tashmë llogari. Hyr me të.';
  if (m.includes('password') && m.includes('6')) return 'Fjalëkalimi duhet të ketë të paktën 6 shkronja.';
  if (m.includes('email not confirmed')) return 'Konfirmo emailin nga lidhja që të dërguam.';
  if (m.includes('network') || m.includes('fetch')) return 'Nuk ka lidhje me internetin.';
  return 'Diçka nuk shkoi. Provo përsëri.';
}
