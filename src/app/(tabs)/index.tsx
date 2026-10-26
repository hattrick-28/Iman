import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IconChat, IconFlame, IconGift, IconTrophy } from '@/components/icons';
import { Body, Button, Card, Chip, Gap, H2, Kicker, Progress, Screen, Small } from '@/components/ui';
import { fmtNum, fmtTime } from '@/lib/format';
import { communityStats } from '@/lib/remote';
import { ayahOfTheDay, chapterOf, juzOf, label, refOf, translation } from '@/lib/quran';
import { goalProgress, setPosition, streakNow, totals, useStore } from '@/lib/store';
import { localDate } from '@/lib/streak';
import { C, F, R, S } from '@/lib/theme';

const UNIT: Record<string, string> = { verses: 'ajete', pages: 'faqe', minutes: 'minuta' };
const WEEKDAYS = ['H', 'M', 'M', 'E', 'P', 'Sh', 'D']; // e hënë … e diel

export default function Home() {
  const s = useStore((x) => x);
  const [range, setRange] = useState<'today' | 'week' | 'all'>('today');
  const [community, setCommunity] = useState<{ reading_now: number; verses_today: number } | null>(null);

  useFocusEffect(useCallback(() => { communityStats().then(setCommunity); }, []));

  const today = localDate();
  const day = s.days[today];
  const unit = day?.goalUnit ?? s.prefs.goalUnit;
  const amount = day?.goalAmount ?? s.prefs.goalAmount;
  const g = goalProgress(day, unit, amount);
  const streak = streakNow(s);
  const t = totals(s, range);
  const pos = s.positions.daily;
  const ch = chapterOf(pos);
  const { ayah } = refOf(pos);
  const aotd = ayahOfTheDay();
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Sabah hajr' : hour < 18 ? 'Selam alejkum' : 'Mbrëmje e bekuar';

  // Monday-first week strip
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const week = WEEKDAYS.map((d, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const iso = localDate(dt);
    return { d, iso, met: !!s.days[iso]?.met, isToday: iso === today, future: iso > today };
  });

  return (
    <Screen>
      <Gap h={S.md} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Small>{greet},</Small>
          <Text style={{ color: C.text, fontFamily: F.display, fontSize: 26 }} numberOfLines={1}>{s.prefs.name || 'mik i Kur\'anit'}</Text>
        </View>
        <Pressable accessibilityLabel={`Seria: ${streak.current} ditë`} onPress={() => router.push('/stats')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.surface }}>
          <IconFlame size={20} color={streak.current > 0 ? C.accent : C.muted} />
          <Text style={{ color: C.text, fontFamily: F.sansBold, fontSize: 17 }}>{streak.current}</Text>
        </Pressable>
      </View>

      <Gap h={S.lg} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, padding: 6 }}>
        {week.map((w) => (
          <View key={w.iso} accessibilityLabel={`${w.iso}${w.met ? ', synimi u arrit' : ''}`}
            style={{
              width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
              backgroundColor: w.met ? C.accent : 'transparent', borderWidth: w.isToday && !w.met ? 1.5 : 0, borderColor: C.text,
              opacity: w.future ? 0.4 : 1,
            }}>
            <Text style={{ color: w.met ? C.onAccent : C.text, fontFamily: F.sansBold, fontSize: 13 }}>{w.d}</Text>
          </View>
        ))}
      </View>

      {streak.atRisk && (
        <>
          <Gap h={S.md} />
          <Card style={{ borderColor: C.accent }}>
            <Body>Seria jote është në rrezik. Lexo sot që ta ruash: një ditë e humbur u fal.</Body>
          </Card>
        </>
      )}

      <Gap h={S.lg} />
      <Card glow>
        <Kicker>Synimi i sotëm</Kicker>
        <Gap h={S.sm} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 44 }}>{g.done}</Text>
          <Text style={{ color: C.muted, fontFamily: F.sansMedium, fontSize: 17 }}>/ {amount} {UNIT[unit]}</Text>
        </View>
        <Gap h={S.sm} />
        <Progress ratio={g.ratio} />
        <Gap h={S.md} />
        <Pressable onPress={() => router.push('/surahs?for=daily')} accessibilityHint="Ndrysho ku vazhdon leximi">
          <Body>{ch.n}. {ch.name} · ajeti {ayah}/{ch.count}</Body>
          <Small>Xhuzi {juzOf(pos)} nga 30 · prek për të ndryshuar vendin</Small>
        </Pressable>
        <Gap h={S.lg} />
        <Button title={g.ratio >= 1 ? 'Vazhdo leximin' : 'Lexo Kur\'anin'} onPress={() => router.push('/read/daily')} />
        {!day && <Small style={{ textAlign: 'center', marginTop: S.sm, color: C.text }}>Nuk ke lexuar ende sot. Prek për të filluar.</Small>}
      </Card>

      <Gap h={S.xl} />
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Chip label="Sot" selected={range === 'today'} onPress={() => setRange('today')} />
        <Chip label="Java" selected={range === 'week'} onPress={() => setRange('week')} />
        <Chip label="Gjithsej" selected={range === 'all'} onPress={() => setRange('all')} />
      </View>
      <Gap h={S.md} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        <Stat label="Ajete" value={String(t.verses)} />
        <Stat label="Koha" value={fmtTime(t.seconds)} />
        <Stat label="Faqe" value={String(t.pages)} />
        {s.prefs.showHasanat ? <Stat label="Hasenat" value={fmtNum(t.hasanat)} /> : <Stat label="Seria më e gjatë" value={`${streak.longest} ditë`} />}
      </View>

      <Gap h={S.xl} />
      <Card glow onPress={() => { setPosition('free', aotd); router.push('/read/free'); }}>
        <Kicker>Ajeti i ditës</Kicker>
        <Gap h={S.sm} />
        <Body style={{ fontSize: 18, lineHeight: 27 }}>{translation(s.prefs.translation, aotd)}</Body>
        <Gap h={S.sm} />
        <Small style={{ color: C.accent }}>{label(aotd)}</Small>
      </Card>

      <Gap h={S.md} />
      <Card onPress={() => router.push('/(tabs)/pyet')}>
        <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' }}><IconChat color={C.accent} /></View>
          <View style={{ flex: 1 }}>
            <H2 style={{ fontSize: 20 }}>Pyet Imanin</H2>
            <Small>Përgjigje nga Kur’ani dhe Suneti, me referenca.</Small>
          </View>
        </View>
      </Card>
      <Gap h={S.md} />
      <Card onPress={() => router.push('/challenges')}>
        <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' }}><IconTrophy color={C.accent} /></View>
          <View style={{ flex: 1 }}>
            <H2 style={{ fontSize: 20 }}>Sfidat</H2>
            <Small>Sa larg mund të shkosh?</Small>
          </View>
        </View>
      </Card>
      <Gap h={S.md} />
      <Card onPress={() => router.push('/donate')}>
        <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' }}><IconGift color={C.accent} /></View>
          <View style={{ flex: 1 }}>
            <H2 style={{ fontSize: 20 }}>Dhuro</H2>
            <Small>Për dikë në nevojë, ose për ekipin e Imanit.</Small>
          </View>
        </View>
      </Card>

      {community && (community.reading_now > 0 || community.verses_today > 0) ? (
        <>
          <Gap h={S.md} />
          <View style={{ flexDirection: 'row', gap: S.md }}>
            <Stat label="Po lexojnë tani" value={String(community.reading_now)} />
            <Stat label="Ajete sot në Iman" value={fmtNum(community.verses_today)} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: '45%', backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg }}>
      <Small>{label}</Small>
      <Text style={{ color: C.text, fontFamily: F.display, fontSize: 26, marginTop: 4 }}>{value}</Text>
    </View>
  );
}
