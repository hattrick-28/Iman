import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';

import { Body, Button, Card, Chip, Field, Gap, Header, Notice, Screen, Small, ToggleRow } from '@/components/ui';
import { fmtTime } from '@/lib/format';
import { acceptInvite, createInvite, leaderboard, setLeaderboardOptIn, type BoardRow } from '@/lib/remote';
import { setState, useStore } from '@/lib/store';
import { useSession } from '@/lib/supabase';
import { C, F, R, S } from '@/lib/theme';

const COUNTRIES = [['AL', 'Shqipëri'], ['XK', 'Kosovë'], ['MK', 'Maqedoni e Veriut'], ['ME', 'Mal i Zi'], ['DE', 'Gjermani'], ['CH', 'Zvicër'], ['IT', 'Itali'], ['GB', 'Britani'], ['US', 'SHBA']] as const;

export default function Leaderboard() {
  const { session, ready } = useSession();
  const optedIn = useStore((s) => s.leaderboardOptIn);
  const [scope, setScope] = useState<'friends' | 'region' | 'global'>('friends');
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareName, setShareName] = useState(true);
  const [country, setCountry] = useState<string>('AL');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ t: string; tone: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    if (!session || !optedIn) return;
    setLoading(true);
    setRows(await leaderboard(scope));
    setLoading(false);
  }, [session, optedIn, scope]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (ready && !session) {
    return (
      <Screen header={<Header title="Renditja" />}>
        <Card><Body muted>Renditja kërkon llogari, që leximi të numërohet saktë dhe vetëm me pëlqimin tënd.</Body><Gap h={S.md} /><Button title="Krijo llogari ose hyr" onPress={() => router.push('/auth')} /></Card>
      </Screen>
    );
  }

  if (!optedIn) {
    return (
      <Screen header={<Header title="Renditja" />}>
        <Body muted>Renditja rendit lexuesit sipas ajeteve të lexuara sot (ora UTC). Nuk rendisim hasenatet: shpërblimin e di vetëm Allahu.</Body>
        <Gap />
        <Card style={{ gap: S.md }}>
          <ToggleRow title="Shfaq emrin tim" subtitle="Përndryshe shfaqesh si 'Lexues'" value={shareName} onChange={setShareName} />
          <Small>Vendi</Small>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {COUNTRIES.map(([c, n]) => <Chip key={c} label={n} selected={country === c} onPress={() => setCountry(c)} />)}
          </View>
          <Button title="Pranoj dhe bashkohem" onPress={async () => {
            const ok = await setLeaderboardOptIn(true, { shareName, country });
            if (ok) setState((s) => ({ ...s, leaderboardOptIn: true }));
            else setMsg({ t: 'Nuk u ruajt. Kontrollo internetin.', tone: 'error' });
          }} />
        </Card>
        {msg && <><Gap h={S.sm} /><Notice tone={msg.tone}>{msg.t}</Notice></>}
      </Screen>
    );
  }

  return (
    <Screen header={<Header title="Renditja" />}>
      <Small>Sipas ajeteve të lexuara sot. Rifillon çdo ditë në orën 00:00 UTC.</Small>
      <Gap h={S.md} />
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Chip label="Miqtë" selected={scope === 'friends'} onPress={() => setScope('friends')} />
        <Chip label="Rajoni" selected={scope === 'region'} onPress={() => setScope('region')} />
        <Chip label="Bota" selected={scope === 'global'} onPress={() => setScope('global')} />
      </View>
      <Gap />
      {loading ? <ActivityIndicator color={C.text} /> : rows === null ? (
        <Notice>Renditja nuk u ngarkua. Kontrollo internetin.</Notice>
      ) : rows.length === 0 ? (
        <Card><Body muted>{scope === 'friends' ? 'Fto miqtë që të lexoni së bashku.' : 'Askush nuk ka lexuar ende sot. Bëhu i pari!'}</Body></Card>
      ) : (
        <View style={{ gap: S.sm }}>
          {rows.map((r) => (
            <View key={r.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: r.is_me ? C.accent : C.border, backgroundColor: r.is_me ? C.glow : C.surface }}>
              <Text style={{ width: 36, color: r.rank <= 3 ? C.accent : C.muted, fontFamily: F.displayBold, fontSize: 18, textAlign: 'center' }}>{r.rank}</Text>
              <View style={{ flex: 1 }}>
                <Body style={{ fontFamily: F.sansBold }} numberOfLines={1}>{r.is_me ? 'Ti' : r.display_name || 'Lexues'}</Body>
                <Small>{r.country ?? ''} · {fmtTime(r.seconds)}</Small>
              </View>
              <Text style={{ color: C.text, fontFamily: F.display, fontSize: 20 }}>{r.verses}</Text>
            </View>
          ))}
        </View>
      )}

      <Gap h={S.xl} />
      <Card style={{ gap: S.md }}>
        <Body style={{ fontFamily: F.sansBold }}>Miqtë</Body>
        <Button title="Fto një mik" kind="secondary" onPress={async () => {
          const link = await createInvite();
          if (link) Share.share({ message: `Lexojmë Kur'an së bashku në Iman? ${link}` });
          else setMsg({ t: 'Ftesa nuk u krijua. Kontrollo internetin.', tone: 'error' });
        }} />
        <Field placeholder="Kodi i ftesës" value={code} onChangeText={setCode} autoCapitalize="none" />
        <Button title="Prano ftesën" kind="ghost" disabled={code.trim().length < 6} onPress={async () => {
          const ok = await acceptInvite(code.trim().split('/').pop() ?? '');
          setMsg(ok ? { t: 'Tani jeni miq. Shiko renditjen e miqve.', tone: 'success' } : { t: 'Kodi nuk vlen ose është përdorur.', tone: 'error' });
          if (ok) { setCode(''); load(); }
        }} />
        {msg && <Notice tone={msg.tone}>{msg.t}</Notice>}
      </Card>

      <Gap />
      <Button title="Largohu nga renditja" kind="danger" onPress={async () => {
        await setLeaderboardOptIn(false, { shareName: false, country: null });
        setState((s) => ({ ...s, leaderboardOptIn: false }));
      }} />
    </Screen>
  );
}
