import { useState } from 'react';
import { Text, View } from 'react-native';

import { IconFlame } from '@/components/icons';
import { Body, Button, Card, confirm, Gap, H2, Header, Kicker, Notice, Screen, Small } from '@/components/ui';
import { fmtNum, fmtTime } from '@/lib/format';
import { pauseStreak, streakNow, totals, useStore } from '@/lib/store';
import { localDate } from '@/lib/streak';
import { C, F, R, S } from '@/lib/theme';

const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];

export default function Stats() {
  const s = useStore((x) => x);
  const streak = streakNow(s);
  const all = totals(s, 'all');
  const [offset, setOffset] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const today = localDate();
  const activePause = s.pauses.find((p) => p.from <= today && p.until >= today);

  const base = new Date();
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (month.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => localDate(new Date(month.getFullYear(), month.getMonth(), i + 1)))];

  return (
    <Screen header={<Header title="Seria dhe historia" />}>
      <Card glow>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <IconFlame size={40} color={C.accent} />
          <View>
            <Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 44, lineHeight: 48 }}>{streak.current} ditë</Text>
            <Small>Seria më e gjatë: {streak.longest} ditë · synimi: {s.prefs.streakGoal} ditë</Small>
          </View>
        </View>
        <Gap h={S.md} />
        <Body muted>
          {streak.metToday ? 'Synimi i sotëm u arrit. Elhamdulil-lah.' : 'Arrije synimin sot që seria të vazhdojë.'}{' '}
          Ke {streak.freezes} {streak.freezes === 1 ? 'ditë' : 'ditë'} të falura: nëse humb një ditë, seria nuk prishet. Çdo javë fiton një (deri në 2).
        </Body>
      </Card>

      <Gap />
      <Kicker>Pushim</Kicker>
      <Gap h={S.sm} />
      {activePause ? (
        <Notice>Seria është në pushim deri më {new Date(activePause.until).toLocaleDateString('sq')}. Ditët e pushimit nuk e prishin.</Notice>
      ) : (
        <Card>
          <Body muted>Udhëton ose je i sëmurë? Pusho serinë dhe ajo nuk prishet.</Body>
          <Gap h={S.md} />
          <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
            {[3, 7, 14].map((d) => (
              <Button key={d} title={`${d} ditë`} kind="secondary" style={{ minHeight: 44 }}
                onPress={() => confirm(`Pusho serinë për ${d} ditë?`, 'Ditët e pushimit nuk e prishin dhe nuk e rritin serinë.', () => {
                  const p = pauseStreak(d);
                  setMsg(`Seria u pushua deri më ${new Date(p.until).toLocaleDateString('sq')}.`);
                }, 'Pusho')} />
            ))}
          </View>
        </Card>
      )}
      {msg && <><Gap h={S.sm} /><Notice tone="success">{msg}</Notice></>}

      <Gap />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button title="‹" kind="ghost" style={{ minHeight: 40, paddingHorizontal: 16 }} onPress={() => setOffset(offset - 1)} />
        <H2 style={{ fontSize: 20 }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</H2>
        <Button title="›" kind="ghost" style={{ minHeight: 40, paddingHorizontal: 16 }} disabled={offset >= 0} onPress={() => setOffset(offset + 1)} />
      </View>
      <Gap h={S.sm} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['H', 'M', 'M', 'E', 'P', 'Sh', 'D'].map((d, i) => (
          <Text key={i} style={{ width: `${100 / 7}%`, textAlign: 'center', color: C.muted, fontFamily: F.sansMedium, fontSize: 12, marginBottom: 6 }}>{d}</Text>
        ))}
        {cells.map((iso, i) => {
          const d = iso ? s.days[iso] : undefined;
          const paused = iso ? s.pauses.some((p) => p.from <= iso && p.until >= iso) : false;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              {iso && (
                <View accessibilityLabel={`${iso}: ${d?.met ? 'synimi u arrit' : d ? 'lexim i pjesshëm' : 'pa lexim'}`}
                  style={{
                    flex: 1, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: d?.met ? C.accent : d ? C.glow : C.surface,
                    borderWidth: iso === today ? 1.5 : paused ? 1 : 0, borderColor: iso === today ? C.text : C.link, borderStyle: paused ? 'dashed' : 'solid',
                  }}>
                  <Text style={{ color: d?.met ? C.onAccent : C.text, fontFamily: F.sansMedium, fontSize: 13 }}>{Number(iso.slice(8))}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Small style={{ marginTop: S.sm }}>Ngjyrë e artë: synimi u arrit · blu: lexim i pjesshëm · vijë me pika: pushim</Small>

      <Gap />
      <Kicker>Gjithsej</Kicker>
      <Gap h={S.sm} />
      <Card>
        <Body>{fmtNum(all.verses)} ajete · {all.pages} faqe · {fmtTime(all.seconds)}</Body>
      </Card>
    </Screen>
  );
}
