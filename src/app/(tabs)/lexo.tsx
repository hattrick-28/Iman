import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { IconBookmark, IconHeart, IconNote, IconSearch } from '@/components/icons';
import { Body, Button, Card, Gap, H2, Kicker, Progress, Row, Screen, Small } from '@/components/ui';
import { GROUP_CHALLENGES } from '@/lib/challenges';
import { fmtNum } from '@/lib/format';
import { chapterOf, refOf } from '@/lib/quran';
import { joinChallenge, useStore } from '@/lib/store';
import { C, F, S } from '@/lib/theme';

export default function Lexo() {
  const s = useStore((x) => x);
  const pos = s.positions.free;
  const ch = chapterOf(pos);
  const { ayah } = refOf(pos);

  return (
    <Screen>
      <Gap h={S.md} />
      <H2 style={{ fontSize: 30, lineHeight: 34 }}>Lexo</H2>
      <Gap h={S.sm} />
      <Body muted>Ky është lexim i lirë. Vendi i leximit ditor nuk ndryshon.</Body>
      <Gap />
      <Card glow>
        <Kicker>Vazhdo nga</Kicker>
        <Gap h={S.sm} />
        <Text style={{ color: C.text, fontFamily: F.display, fontSize: 26 }}>{ch.n}. {ch.name}</Text>
        <Small>{ch.en} · ajeti {ayah} nga {ch.count}</Small>
        <Gap />
        <Button title="Lexo" onPress={() => router.push('/read/free')} />
        <Gap h={S.sm} />
        <Button title="Zgjidh suren dhe ajetin" kind="ghost" onPress={() => router.push('/surahs?for=free')} />
      </Card>

      <Gap />
      <View style={{ gap: S.sm }}>
        <Row title="Kërko në Kur'an" subtitle="Në përkthimin shqip" icon={<IconSearch color={C.accent} size={20} />} onPress={() => router.push('/search')} />
        <Row title="Suret e preferuara" subtitle={`${s.favourites.length}`} icon={<IconHeart color={C.accent} size={20} />} onPress={() => router.push('/saved?tab=fav')} />
        <Row title="Ajetet e shënuara" subtitle={`${s.bookmarks.length}`} icon={<IconBookmark color={C.accent} size={20} />} onPress={() => router.push('/saved?tab=bm')} />
        <Row title="Shënimet e mia" subtitle={`${s.notes.length}`} icon={<IconNote color={C.accent} size={20} />} onPress={() => router.push('/saved?tab=notes')} />
      </View>

      <Gap h={S.xl} />
      <Kicker>Sfida të përbashkëta</Kicker>
      <Gap h={S.sm} />
      {GROUP_CHALLENGES.map((c) => {
        const joined = s.challenges[c.id];
        const done = joined?.progress ?? 0;
        return (
          <Card key={c.id}>
            <H2 style={{ fontSize: 22 }}>{c.title}</H2>
            <Gap h={S.sm} />
            <Body muted>{c.description}</Body>
            <Gap h={S.md} />
            {joined ? (
              <>
                <Progress ratio={done / c.target} />
                <Small style={{ marginTop: 6 }}>{fmtNum(done)} / {fmtNum(c.target)} ajete · {Math.round((done / c.target) * 100)}%</Small>
                <Gap h={S.md} />
                <Button title="Vazhdo sfidën" onPress={() => router.push(`/read/challenge?id=${c.id}`)} />
              </>
            ) : (
              <Button title="Bashkohu" kind="accent" onPress={() => { joinChallenge(c.id); router.push(`/read/challenge?id=${c.id}`); }} />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
