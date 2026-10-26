import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Chip, Field, Gap, H2, Header, Notice, Screen, Small } from '@/components/ui';
import { CONFIG } from '@/lib/config';
import { getState } from '@/lib/store';
import { authError, supabase } from '@/lib/supabase';
import { syncNow } from '@/lib/sync';
import { S } from '@/lib/theme';
import * as WebBrowser from 'expo-web-browser';

export default function Auth() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [mode, setMode] = useState<'signup' | 'signin' | 'reset'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'error' | 'success' | 'info' } | null>(null);

  const leave = () => (from === 'onboarding' || !router.canGoBack() ? router.replace('/') : router.back());

  async function submit() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return setMsg({ text: 'Shkruaj një email të vlefshëm.', tone: 'error' });
    if (mode !== 'reset' && password.length < 6) return setMsg({ text: 'Fjalëkalimi duhet të ketë të paktën 6 shkronja.', tone: 'error' });
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: e, password, options: { data: { name: getState().prefs.name } } });
        if (error) throw error;
        if (!data.session) {
          setMsg({ text: 'Të dërguam një email. Hape lidhjen për të konfirmuar llogarinë, pastaj hyr.', tone: 'success' });
          setMode('signin');
          return;
        }
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(e);
        if (error) throw error;
        setMsg({ text: 'Nëse ky email ka llogari, të dërguam udhëzimet për fjalëkalim të ri.', tone: 'success' });
        return;
      }
      await syncNow();
      leave();
    } catch (err) {
      setMsg({ text: authError(err instanceof Error ? err.message : String(err)), tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={<Header title="Llogaria" />}>
      <Gap h={S.md} />
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Chip label="Llogari e re" selected={mode === 'signup'} onPress={() => { setMode('signup'); setMsg(null); }} />
        <Chip label="Hyr" selected={mode === 'signin'} onPress={() => { setMode('signin'); setMsg(null); }} />
      </View>
      <Gap />
      <H2>{mode === 'signup' ? 'Krijo llogarinë' : mode === 'signin' ? 'Mirë se u ktheve' : 'Fjalëkalim i ri'}</H2>
      <Gap h={S.sm} />
      <Body muted>
        {mode === 'reset' ? 'Shkruaj emailin dhe të dërgojmë një lidhje.' : 'Leximi që ke bërë deri tani në këtë telefon kalon automatikisht në llogari.'}
      </Body>
      <Gap />
      <View style={{ gap: S.md }}>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        {mode !== 'reset' && (
          <Field label="Fjalëkalimi" value={password} onChangeText={setPassword} secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            onSubmitEditing={submit} />
        )}
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        <Button title={mode === 'signup' ? 'Krijo llogarinë' : mode === 'signin' ? 'Hyr' : 'Dërgo lidhjen'} onPress={submit} loading={busy} />
        {mode === 'signin' && <Button title="Harrova fjalëkalimin" kind="ghost" onPress={() => { setMode('reset'); setMsg(null); }} />}
        {from === 'onboarding' && <Button title="Më vonë" kind="ghost" onPress={() => router.replace('/')} />}
      </View>
      <Gap h={S.xl} />
      <Small>Duke krijuar llogari pranon kushtet e përdorimit dhe politikën e privatësisë.</Small>
      <View style={{ flexDirection: 'row', gap: S.lg, flexWrap: 'wrap' }}>
        <Button title="Kushtet" kind="ghost" onPress={() => WebBrowser.openBrowserAsync(CONFIG.termsUrl)} style={{ minHeight: 40 }} />
        <Button title="Privatësia" kind="ghost" onPress={() => WebBrowser.openBrowserAsync(CONFIG.privacyUrl)} style={{ minHeight: 40 }} />
      </View>
    </Screen>
  );
}
