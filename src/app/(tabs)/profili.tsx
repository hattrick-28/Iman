import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { IconBell, IconGift, IconStar } from '@/components/icons';
import { Body, Button, Card, Chip, confirm, Field, Gap, H2, Kicker, Notice, Row, Screen, Small, ToggleRow } from '@/components/ui';
import { CONFIG } from '@/lib/config';
import { disableReminder, enableReminder } from '@/lib/notifications';
import { TRANSLATIONS } from '@/lib/quran';
import { deleteAccount } from '@/lib/remote';
import { resetAll, resetStats, setPrefs, useStore, type GoalUnit } from '@/lib/store';
import { supabase, useSession } from '@/lib/supabase';
import { C, F, S } from '@/lib/theme';

const UNIT: Record<GoalUnit, string> = { verses: 'ajete', pages: 'faqe', minutes: 'minuta' };
const AMOUNTS: Record<GoalUnit, number[]> = { verses: [5, 10, 20, 50, 100], pages: [1, 2, 5, 10, 20], minutes: [5, 10, 15, 30, 60] };
const HOURS = [5, 6, 7, 13, 18, 20, 21, 22];

export default function Profili() {
  const s = useStore((x) => x);
  const p = s.prefs;
  const { session } = useSession();
  const [name, setName] = useState(p.name);
  const [msg, setMsg] = useState<{ t: string; tone: 'success' | 'error' | 'info' } | null>(null);

  async function setReminder(on: boolean, hour = p.reminderHour) {
    if (!on) {
      await disableReminder();
      setPrefs({ remindersOn: false });
      return;
    }
    const ok = await enableReminder(hour, 0);
    setPrefs({ remindersOn: ok, reminderHour: hour, reminderMinute: 0 });
    if (!ok) setMsg({ t: 'Njoftimet nuk lejohen. Aktivizoji te cilësimet e telefonit.', tone: 'error' });
  }

  return (
    <Screen>
      <Gap h={S.md} />
      <H2 style={{ fontSize: 30, lineHeight: 34 }}>Profili</H2>
      <Gap />

      <Card glow>
        {session ? (
          <>
            <Kicker>Llogaria</Kicker>
            <Gap h={S.xs} />
            <Body>{session.user.email}</Body>
            <Small>Leximi yt ruhet dhe sinkronizohet.</Small>
          </>
        ) : (
          <>
            <Body>Pa llogari, gjithçka ruhet vetëm në këtë telefon.</Body>
            <Gap h={S.md} />
            <Button title="Krijo llogari ose hyr" onPress={() => router.push('/auth')} />
          </>
        )}
      </Card>

      <Gap h={S.md} />
      <Row title={s.premium ? 'Iman Premium · aktiv' : 'Iman Premium'} subtitle={s.premium ? 'Faleminderit që e mbështet Imanin' : `${CONFIG.premiumPriceLabel} në muaj`}
        icon={<IconStar color={C.accent} size={20} />} onPress={() => router.push('/premium')} />
      <Gap h={S.sm} />
      <Row title="Dhuro" subtitle="Për dikë në nevojë ose për ekipin" icon={<IconGift color={C.accent} size={20} />} onPress={() => router.push('/donate')} />

      <Gap h={S.xl} />
      <Kicker>Emri</Kicker>
      <Gap h={S.sm} />
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <View style={{ flex: 1 }}><Field value={name} onChangeText={setName} placeholder="Emri yt" maxLength={60} /></View>
        <Button title="Ruaj" kind="secondary" disabled={name.trim() === p.name} onPress={async () => {
          setPrefs({ name: name.trim() });
          if (session) await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', session.user.id);
        }} />
      </View>

      <Gap h={S.xl} />
      <Kicker>Synimi ditor</Kicker>
      <Gap h={S.sm} />
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        {(['verses', 'pages', 'minutes'] as GoalUnit[]).map((u) => (
          <Chip key={u} label={UNIT[u]} selected={p.goalUnit === u} onPress={() => setPrefs({ goalUnit: u, goalAmount: AMOUNTS[u][1] })} />
        ))}
      </View>
      <Gap h={S.sm} />
      <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
        {AMOUNTS[p.goalUnit].map((a) => <Chip key={a} label={String(a)} selected={p.goalAmount === a} onPress={() => setPrefs({ goalAmount: a })} />)}
      </View>
      <Small style={{ marginTop: 6 }}>Ndryshimi vlen nga dita e nesërme nëse ke lexuar sot.</Small>
      <Gap h={S.md} />
      <Small>Synimi i serisë</Small>
      <Gap h={S.xs} />
      <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
        {[3, 7, 30, 100].map((d) => <Chip key={d} label={`${d} ditë`} selected={p.streakGoal === d} onPress={() => setPrefs({ streakGoal: d })} />)}
      </View>

      <Gap h={S.xl} />
      <Kicker>Leximi</Kicker>
      <Gap h={S.sm} />
      <View style={{ gap: S.sm }}>
        {TRANSLATIONS.map((t) => <Chip key={t.id} label={t.label} selected={p.translation === t.id} onPress={() => setPrefs({ translation: t.id })} />)}
        <ToggleRow title="Shfaq përkthimin" value={p.showTranslation} onChange={(v) => setPrefs({ showTranslation: v })} />
        <ToggleRow title="Shfaq transliterimin" value={p.showTranslit} onChange={(v) => setPrefs({ showTranslit: v })} />
        <ToggleRow title="Nivelet e leximit" value={p.readingLevels} onChange={(v) => setPrefs({ readingLevels: v })} />
        <ToggleRow title="Shfaq hasenatet" subtitle="Shkronjat × 10. Disa dijetarë e kanë mos-pëlqyer numërimin e shpërblimit tënd, prandaj është i fshehur." value={p.showHasanat} onChange={(v) => setPrefs({ showHasanat: v })} />
        <ToggleRow title="Dridhje e lehtë" value={p.haptics} onChange={(v) => setPrefs({ haptics: v })} />
      </View>

      <Gap h={S.xl} />
      <Kicker>Përkujtimi</Kicker>
      <Gap h={S.sm} />
      <ToggleRow title="Përkujtim ditor" subtitle={p.remindersOn ? `Çdo ditë në ${String(p.reminderHour).padStart(2, '0')}:00` : 'Fikur'} value={p.remindersOn} onChange={(v) => setReminder(v)} />
      {p.remindersOn && (
        <>
          <Gap h={S.sm} />
          <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
            {HOURS.map((h) => <Chip key={h} label={`${String(h).padStart(2, '0')}:00`} selected={p.reminderHour === h} onPress={() => setReminder(true, h)} />)}
          </View>
        </>
      )}
      {msg && <><Gap h={S.sm} /><Notice tone={msg.tone}>{msg.t}</Notice></>}

      <Gap h={S.xl} />
      <Kicker>Më shumë</Kicker>
      <Gap h={S.sm} />
      <View style={{ gap: S.sm }}>
        <Row title="Seria dhe historia" onPress={() => router.push('/stats')} />
        <Row title="Të ruajturat" subtitle="Suret, ajetet dhe shënimet" onPress={() => router.push('/saved')} />
        <Row title="Burimet dhe falënderimet" subtitle="Teksti, përkthimet, fontet" onPress={() => router.push('/credits')} />
        <Row title="Ndihmë dhe sugjerime" icon={<IconBell color={C.accent} size={18} />} onPress={() => Linking.openURL(`mailto:${CONFIG.supportEmail}?subject=Iman`)} />
        <Row title="Kushtet e përdorimit" onPress={() => WebBrowser.openBrowserAsync(CONFIG.termsUrl)} />
        <Row title="Politika e privatësisë" onPress={() => WebBrowser.openBrowserAsync(CONFIG.privacyUrl)} />
      </View>

      <Gap h={S.xl} />
      <View style={{ gap: S.sm }}>
        <Button title="Rifillo statistikat" kind="ghost" onPress={() => confirm('Rifillo statistikat?', 'Fshihet historia e leximit dhe seria. Shënimet dhe të ruajturat mbeten.', () => {
          resetStats();
          if (session) supabase.rpc('reset_stats');
        }, 'Rifillo')} />
        {session && <Button title="Dil nga llogaria" kind="ghost" onPress={() => supabase.auth.signOut()} />}
        <Button title="Fshi llogarinë dhe të dhënat" kind="danger" onPress={() => confirm('Fshi gjithçka?', 'Llogaria, leximi, shënimet dhe bisedat fshihen përgjithmonë. Abonimi anulohet te App Store ose Google Play.', async () => {
          if (session) {
            const ok = await deleteAccount();
            if (!ok) return setMsg({ t: 'Fshirja nuk u krye. Kontrollo internetin dhe provo përsëri.', tone: 'error' });
            await supabase.auth.signOut();
          }
          await resetAll();
          router.replace('/onboarding');
        })} />
      </View>
      <Gap />
      <Text style={{ color: C.muted, fontFamily: F.sans, fontSize: 12, textAlign: 'center' }}>Iman {Constants.expoConfig?.version ?? ''}</Text>
    </Screen>
  );
}
