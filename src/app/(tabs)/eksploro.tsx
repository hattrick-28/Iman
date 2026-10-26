import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { IconBook, IconGift, IconSearch, IconTrophy, IconUsers } from '@/components/icons';
import { Gap, H2, Kicker, Row, Screen, Small, tap } from '@/components/ui';
import { TOPICS } from '@/lib/topics';
import { C, F, R, S } from '@/lib/theme';

export default function Eksploro() {
  return (
    <Screen>
      <Gap h={S.md} />
      <H2 style={{ fontSize: 30, lineHeight: 34 }}>Eksploro</H2>
      <Gap />
      <View style={{ gap: S.sm }}>
        <Row title="Kërko në Kur'an" subtitle="Ajete sipas fjalës, në shqip" icon={<IconSearch color={C.accent} size={20} />} onPress={() => router.push('/search')} />
        <Row title="Të gjitha suret" subtitle="114 sure, me ajetin që zgjedh" icon={<IconBook color={C.accent} size={20} />} onPress={() => router.push('/surahs')} />
        <Row title="Sfidat" subtitle="Nivelet dhe sfidat e përbashkëta" icon={<IconTrophy color={C.accent} size={20} />} onPress={() => router.push('/challenges')} />
        <Row title="Renditja" subtitle="Me miqtë, në rajon dhe në botë" icon={<IconUsers color={C.accent} size={20} />} onPress={() => router.push('/leaderboard')} />
        <Row title="Dhuro" subtitle="Për dikë në nevojë ose për ekipin" icon={<IconGift color={C.accent} size={20} />} onPress={() => router.push('/donate')} />
      </View>

      <Gap h={S.xl} />
      <Kicker>Tema nga Kur’ani</Kicker>
      <Gap h={S.sm} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        {TOPICS.map((t, i) => (
          <Pressable key={t.id} onPress={() => { tap(); router.push(`/topic/${t.id}`); }}
            style={({ pressed }) => [{
              flexBasis: '47%', flexGrow: 1, minHeight: 110, borderRadius: R.lg, padding: S.lg, justifyContent: 'flex-end',
              backgroundColor: [C.glow, C.raised, C.surface][i % 3], borderWidth: 1, borderColor: C.border,
            }, pressed && { opacity: 0.85 }]}>
            <Text style={{ color: C.text, fontFamily: F.display, fontSize: 20, textTransform: 'uppercase' }}>{t.title}</Text>
            <Small>{t.subtitle}</Small>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
