import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { IconClose, IconStar } from '@/components/icons';
import { Body, Button, Card, Gap, H2, Kicker, Notice, Screen, Small } from '@/components/ui';
import { CONFIG } from '@/lib/config';
import { buyPremium, premiumPackage, purchasesAvailable, restore } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { C, F, S } from '@/lib/theme';

const BENEFITS = [
  ['Pyet Imanin pa u ndalur', `Deri në 50 pyetje në ditë, në vend të ${CONFIG.freeQuestionsPerDay}.`],
  ['Shënime pa kufi', 'Ruaj sa reflektime të duash për ajetet.'],
  ['Mbaje Kur\'anin falas për të gjithë', 'Leximi, seria dhe përkujtimet mbeten falas përgjithmonë. Premium e mban gjallë.'],
];

export default function Premium() {
  const premium = useStore((s) => s.premium);
  const [price, setPrice] = useState<string>(`${CONFIG.premiumPriceLabel}`);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [msg, setMsg] = useState<{ t: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const available = purchasesAvailable();

  useEffect(() => {
    premiumPackage().then((p) => p && setPrice(p.product.priceString));
  }, []);

  async function buy() {
    setBusy('buy');
    const r = await buyPremium();
    setBusy(null);
    if (r === 'ok') setMsg({ t: 'Mirë se erdhe në Premium. Allahu të shpërbleftë!', tone: 'success' });
    else if (r === 'error') setMsg({ t: 'Blerja nuk u krye. Nuk të është tërhequr asnjë pagesë.', tone: 'error' });
    else if (r === 'unavailable') setMsg({ t: 'Abonimi nuk është i disponueshëm tani. Provo më vonë.', tone: 'error' });
  }

  async function doRestore() {
    setBusy('restore');
    const r = await restore();
    setBusy(null);
    setMsg(r === 'ok' ? { t: 'Premium u rikthye.', tone: 'success' } : { t: 'Nuk u gjet asnjë abonim aktiv për këtë llogari të dyqanit.', tone: 'info' });
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ alignItems: 'flex-end', paddingTop: S.sm }}>
        <Button title="" kind="ghost" icon={<IconClose size={20} />} style={{ minHeight: 40, width: 48, paddingHorizontal: 0 }} onPress={() => router.back()} />
      </View>
      <Kicker>Iman Premium</Kicker>
      <Gap h={S.sm} />
      <H2 style={{ fontSize: 34, lineHeight: 38 }}>Më shumë kohë me Kur’anin dhe Sunetin</H2>
      <Gap />
      {BENEFITS.map(([t, d]) => (
        <View key={t} style={{ flexDirection: 'row', gap: S.md, marginBottom: S.lg }}>
          <IconStar color={C.accent} size={22} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontFamily: F.sansBold }}>{t}</Body>
            <Small>{d}</Small>
          </View>
        </View>
      ))}

      {premium ? (
        <Notice tone="success">Premium është aktiv. Faleminderit që e mbështet Imanin.</Notice>
      ) : (
        <Card glow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 40 }}>{price}</Text>
            <Small>/ muaj</Small>
          </View>
          <Small>Anulo kurdo.</Small>
          <Gap />
          {available ? (
            <Button title="Abonohu" kind="accent" onPress={buy} loading={busy === 'buy'} />
          ) : (
            <Notice>{Platform.OS === 'web' ? 'Abonimi bëhet nga aplikacioni Iman në iPhone ose Android.' : 'Abonimet do të hapen së shpejti.'}</Notice>
          )}
        </Card>
      )}

      {msg && <><Gap h={S.md} /><Notice tone={msg.tone}>{msg.t}</Notice></>}
      <Gap h={S.md} />
      {available && <Button title="Rikthe blerjet" kind="ghost" onPress={doRestore} loading={busy === 'restore'} />}
      <Gap />
      <Small>
        Iman Premium është abonim mujor me rinovim automatik për {price} në muaj. Pagesa tërhiqet nga llogaria jote e
        {Platform.OS === 'ios' ? ' Apple ID' : ' Google Play'} kur konfirmon blerjen. Abonimi rinovohet automatikisht përveç nëse anulohet të paktën 24 orë para
        fundit të periudhës. Mund ta menaxhosh dhe anulosh te cilësimet e llogarisë së dyqanit.
      </Small>
      <View style={{ flexDirection: 'row', gap: S.lg, marginTop: S.sm }}>
        <Button title="Kushtet" kind="ghost" style={{ minHeight: 36 }} onPress={() => WebBrowser.openBrowserAsync(CONFIG.termsUrl)} />
        <Button title="Privatësia" kind="ghost" style={{ minHeight: 36 }} onPress={() => WebBrowser.openBrowserAsync(CONFIG.privacyUrl)} />
      </View>
    </Screen>
  );
}
