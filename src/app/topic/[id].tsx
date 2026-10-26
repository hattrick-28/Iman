import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Body, Card, Gap, Header, Screen, Small } from '@/components/ui';
import { arabic, keyOf, label, translation } from '@/lib/quran';
import { setPosition, useStore } from '@/lib/store';
import { TOPICS } from '@/lib/topics';
import { C, F, S } from '@/lib/theme';

export default function Topic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = TOPICS.find((t) => t.id === id);
  const tr = useStore((s) => s.prefs.translation);
  if (!topic) return <Screen header={<Header title="Tema" />}><Body>Tema nuk u gjet.</Body></Screen>;
  const keys = [...new Set(topic.refs.map(([s, a]) => keyOf(s, a)))];

  return (
    <Screen header={<Header title={topic.title} />}>
      <Small>{topic.subtitle}</Small>
      <Gap />
      <View style={{ gap: S.md }}>
        {keys.map((k) => (
          <Card key={k} onPress={() => { setPosition('free', k); router.push('/read/free'); }}>
            <Text style={{ color: C.text, fontFamily: F.arabic, fontSize: 22, lineHeight: 46, textAlign: 'right', writingDirection: 'rtl' }}>{arabic(k)}</Text>
            <Gap h={S.sm} />
            <Body>{translation(tr, k)}</Body>
            <Gap h={S.sm} />
            <Small style={{ color: C.accent }}>{label(k)}</Small>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
