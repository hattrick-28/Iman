import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import type { PurchasesStoreProduct } from 'react-native-purchases';

import { IconClose } from '@/components/icons';
import { Body, Button, Card, Chip, Field, Gap, H2, Kicker, Notice, Screen, Small } from '@/components/ui';
import { CONFIG } from '@/lib/config';
import { buyTip, purchasesAvailable, tipProducts } from '@/lib/purchases';
import { S } from '@/lib/theme';

export default function Donate() {
  const [amount, setAmount] = useState<number | 'custom'>(20);
  const [custom, setCustom] = useState('');
  const [tips, setTips] = useState<PurchasesStoreProduct[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; tone: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => { tipProducts().then(setTips); }, []);

  const value = amount === 'custom' ? Number(custom.replace(',', '.')) : amount;
  const validCustom = Number.isFinite(value) && value >= 1 && value <= 10000;

  async function giveToNeedy() {
    if (!CONFIG.donationsEnabled || !validCustom) return;
    // Donations are collected on the website, outside the app (App Store rule 3.2.2(iv)).
    await WebBrowser.openBrowserAsync(`${CONFIG.donationUrl}?shuma=${Math.round(value * 100) / 100}`);
  }

  async function tip(p: PurchasesStoreProduct) {
    setBusy(p.identifier);
    const r = await buyTip(p);
    setBusy(null);
    if (r === 'ok') setMsg({ t: 'Allahu të shpërbleftë! Mbështetja jote e mban Imanin gjallë.', tone: 'success' });
    else if (r === 'error') setMsg({ t: 'Pagesa nuk u krye. Nuk të është tërhequr asgjë.', tone: 'error' });
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ alignItems: 'flex-end', paddingTop: S.sm }}>
        <Button title="" kind="ghost" icon={<IconClose size={20} />} style={{ minHeight: 40, width: 48, paddingHorizontal: 0 }} onPress={() => router.back()} />
      </View>
      <Kicker>Sadaka</Kicker>
      <Gap h={S.sm} />
      <H2 style={{ fontSize: 34, lineHeight: 38 }}>Dhuro</H2>
      <Gap h={S.sm} />
      <Body muted>“Shembulli i atyre që shpenzojnë pasurinë e tyre në rrugën e Allahut është si shembulli i një kokrre që mbin shtatë kallinj…”</Body>
      <Small style={{ marginTop: 4 }}>El-Bekare 2:261</Small>

      <Gap h={S.xl} />
      <Card glow>
        <Kicker>Për dikë në nevojë</Kicker>
        <Gap h={S.sm} />
        <Body muted>Dhurimi shkon te familje dhe njerëz në nevojë përmes një organizate bamirësie të regjistruar, me raportim të hapur.</Body>
        <Gap />
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {CONFIG.donationAmounts.map((a) => <Chip key={a} label={`${a} €`} selected={amount === a} onPress={() => setAmount(a)} />)}
          <Chip label="Shumë tjetër" selected={amount === 'custom'} onPress={() => setAmount('custom')} />
        </View>
        {amount === 'custom' && (
          <>
            <Gap h={S.md} />
            <Field placeholder="Shuma në €" value={custom} onChangeText={setCustom} keyboardType="decimal-pad" maxLength={7} />
            {custom !== '' && !validCustom && <Small style={{ marginTop: 4 }}>Shkruaj një shumë nga 1 deri në 10 000 €.</Small>}
          </>
        )}
        <Gap />
        {CONFIG.donationsEnabled ? (
          <>
            <Button title={`Dhuro ${validCustom ? `${value} €` : ''}`} kind="accent" disabled={!validCustom} onPress={giveToNeedy} />
            <Small style={{ marginTop: S.sm }}>Pagesa bëhet në faqen tonë të sigurt, jashtë aplikacionit.</Small>
          </>
        ) : (
          <Notice>Së shpejti. Po përgatisim bashkëpunimin me një organizatë bamirësie të regjistruar, që çdo euro të arrijë te nevojtarët me transparencë.</Notice>
        )}
      </Card>

      <Gap h={S.xl} />
      <Card>
        <Kicker>Për ekipin e Imanit · opsionale</Kicker>
        <Gap h={S.sm} />
        <Body muted>Imani mbetet falas për të gjithë. Nëse do, mund të mbështetësh punën e ekipit me një dhuratë një-herëshe.</Body>
        <Small style={{ marginTop: S.sm }}>Kjo është mbështetje për aplikacionin, jo zekat as sadaka për nevojtarë. Dyqani i aplikacioneve mban një pjesë si komision.</Small>
        <Gap />
        {purchasesAvailable() && tips.length > 0 ? (
          <View style={{ gap: S.sm }}>
            {CONFIG.teamTipProducts.map((t) => {
              const p = tips.find((x) => x.identifier === t.id);
              return p ? <Button key={t.id} title={p.priceString} kind="secondary" loading={busy === t.id} onPress={() => tip(p)} /> : null;
            })}
          </View>
        ) : (
          <Notice>{Platform.OS === 'web' ? 'Mbështetja për ekipin bëhet nga aplikacioni Iman në iPhone ose Android.' : 'Mbështetja për ekipin hapet së shpejti.'}</Notice>
        )}
      </Card>
      {msg && <><Gap h={S.md} /><Notice tone={msg.tone}>{msg.t}</Notice></>}
    </Screen>
  );
}
