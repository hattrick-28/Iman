import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { IconStar } from '@/components/icons';
import { Body, Button, Card, Gap, H2, Header, Kicker, Progress, Screen, Small } from '@/components/ui';
import { GROUP_CHALLENGES, LEVEL_CHALLENGES, LEVELS } from '@/lib/challenges';
import { fmtNum } from '@/lib/format';
import { joinChallenge, totals, useStore } from '@/lib/store';
import { C, F, S } from '@/lib/theme';

export default function Challenges() {
  const s = useStore((x) => x);
  const all = totals(s, 'all');
  const value = (unit: 'verses' | 'minutes') => (unit === 'verses' ? all.verses : Math.floor(all.seconds / 60));

  return (
    <Screen header={<Header title="Sfidat" />}>
      <Body muted>Nivelet fitohen nga i gjithë leximi yt. Çdo nivel hapet kur mbaron të mëparshmin.</Body>
      <Gap />
      {LEVELS.map((lv, i) => {
        const items = LEVEL_CHALLENGES.filter((c) => c.level === lv.level);
        const prevDone = i === 0 || LEVEL_CHALLENGES.filter((c) => c.level === lv.level - 1).every((c) => value(c.unit) >= c.target);
        const allDone = items.every((c) => value(c.unit) >= c.target);
        return (
          <Card key={lv.level} glow={prevDone && !allDone} style={{ marginBottom: S.md, opacity: prevDone ? 1 : 0.55 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: allDone ? C.accent : C.raised, alignItems: 'center', justifyContent: 'center' }}>
                {allDone ? <IconStar color={C.onAccent} /> : <Text style={{ color: C.accent, fontFamily: F.displayBold, fontSize: 20 }}>{lv.level}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <H2 style={{ fontSize: 22 }}>{lv.name}</H2>
                <Small>{prevDone ? lv.subtitle : 'Mbyll nivelin e mëparshëm për ta hapur'}</Small>
              </View>
            </View>
            <Gap h={S.md} />
            {items.map((c) => {
              const v = Math.min(value(c.unit), c.target);
              return (
                <View key={c.id} style={{ marginTop: S.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Body style={{ fontSize: 15 }}>{c.title}</Body>
                    <Small>{fmtNum(v)}/{fmtNum(c.target)}</Small>
                  </View>
                  <Gap h={6} />
                  <Progress ratio={v / c.target} height={6} />
                </View>
              );
            })}
          </Card>
        );
      })}

      <Gap />
      <Kicker>Sfida të përbashkëta</Kicker>
      <Gap h={S.sm} />
      {GROUP_CHALLENGES.map((c) => {
        const joined = s.challenges[c.id];
        return (
          <Card key={c.id}>
            <H2 style={{ fontSize: 22 }}>{c.title}</H2>
            <Gap h={S.sm} />
            <Body muted>{c.description}</Body>
            <Gap h={S.md} />
            {joined && <><Progress ratio={joined.progress / c.target} /><Small style={{ marginTop: 6 }}>{fmtNum(joined.progress)} / {fmtNum(c.target)} ajete</Small><Gap h={S.md} /></>}
            <Button title={joined ? 'Vazhdo' : 'Bashkohu'} kind={joined ? 'primary' : 'accent'}
              onPress={() => { if (!joined) joinChallenge(c.id); router.push(`/read/challenge?id=${c.id}`); }} />
          </Card>
        );
      })}
    </Screen>
  );
}
