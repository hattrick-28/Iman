import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Mark } from '@/components/icons';
import { Body, Button, Chip, Display, Field, Gap, H2, Kicker, Notice, Screen, Small } from '@/components/ui';
import { enableReminder } from '@/lib/notifications';
import { arabic, keyOf } from '@/lib/quran';
import { setPrefs, useStore, type GoalUnit } from '@/lib/store';
import { C, F, S } from '@/lib/theme';

const GOALS: Record<GoalUnit, number[]> = { verses: [5, 10, 20, 50], pages: [1, 2, 5, 20], minutes: [5, 10, 15, 30] };
const UNIT_LABEL: Record<GoalUnit, string> = { verses: 'ajete', pages: 'faqe', minutes: 'minuta' };
const TIMES = [{ h: 6, m: 0, l: '06:00 · pas sabahut' }, { h: 13, m: 0, l: '13:00 · drekë' }, { h: 20, m: 0, l: '20:00 · mbrëmje' }, { h: 22, m: 0, l: '22:00 · para gjumit' }];

export default function Onboarding() {
  const prefs = useStore((s) => s.prefs);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(prefs.name);
  const [unit, setUnit] = useState<GoalUnit>(prefs.goalUnit);
  const [amount, setAmount] = useState(prefs.goalAmount);
  const [time, setTime] = useState(2);
  const [note, setNote] = useState<string | null>(null);

  const next = () => setStep((s) => s + 1);

  async function finishReminder(on: boolean) {
    const t = TIMES[time];
    if (on) {
      const ok = await enableReminder(t.h, t.m);
      setPrefs({ remindersOn: ok, reminderHour: t.h, reminderMinute: t.m });
      if (!ok && Platform.OS !== 'web') setNote('Lejet për njoftime u refuzuan. Mund t\'i aktivizosh më vonë te Profili.');
    }
    next();
  }

  function done(withAccount: boolean) {
    setPrefs({ onboarded: true, name: name.trim(), goalUnit: unit, goalAmount: amount });
    router.replace(withAccount ? '/auth?from=onboarding' : '/');
  }

  return (
    <Screen>
      <Gap h={S.xl} />
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: S.xl }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 3, backgroundColor: i <= step ? C.accent : C.border }} />
        ))}
      </View>

      {step === 0 && (
        <View style={{ gap: S.lg }}>
          <Mark size={56} />
          <Kicker>Kur’an · Sunnet · Përkujtime ditore</Kicker>
          <Display style={{ fontSize: 72, lineHeight: 74 }}>Iman</Display>
          <Text style={{ color: C.text, fontFamily: F.caption, fontSize: 18, letterSpacing: 2 }}>PËR ZEMRËN QË KËRKON ALLAHUN</Text>
          <Body muted>Lexo pak Kur’an çdo ditë, ruaj serinë dhe pyet Imanin kur ke nevojë për udhëzim nga Kur’ani dhe Suneti.</Body>
          <Text style={{ color: C.text, fontFamily: F.arabic, fontSize: 28, lineHeight: 56, textAlign: 'right', writingDirection: 'rtl', marginTop: S.md }}>
            {arabic(keyOf(13, 28)).split(' ').slice(-5).join(' ')}
          </Text>
          <Small style={{ textAlign: 'right' }}>Er-Ra’d 13:28</Small>
          <Gap />
          <Button title="Fillo" onPress={next} />
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: S.lg }}>
          <Kicker>Hapi 1 nga 4</Kicker>
          <H2>Si të thërrasim?</H2>
          <Field placeholder="Emri yt" value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} returnKeyType="next" onSubmitEditing={next} />
          <Small>Mund ta lësh bosh. Emri shfaqet vetëm për ty, përveç nëse zgjedh renditjen.</Small>
          <Button title="Vazhdo" onPress={next} />
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: S.lg }}>
          <Kicker>Hapi 2 nga 4</Kicker>
          <H2>Synimi yt ditor</H2>
          <Body muted>Fillo me pak. Një synim i vogël që e mban çdo ditë vlen më shumë se një i madh që e lë.</Body>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            {(['verses', 'pages', 'minutes'] as GoalUnit[]).map((u) => (
              <Chip key={u} label={UNIT_LABEL[u]} selected={unit === u} onPress={() => { setUnit(u); setAmount(GOALS[u][1]); }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {GOALS[unit].map((a) => (
              <Chip key={a} label={`${a} ${UNIT_LABEL[unit]}`} selected={amount === a} onPress={() => setAmount(a)} />
            ))}
          </View>
          <Button title="Vazhdo" onPress={next} />
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: S.lg }}>
          <Kicker>Hapi 3 nga 4</Kicker>
          <H2>Kur të të kujtojmë?</H2>
          <Body muted>Një njoftim i butë në kohën që zgjedh ti. Funksionon edhe pa internet.</Body>
          <View style={{ gap: S.sm }}>
            {TIMES.map((t, i) => <Chip key={t.l} label={t.l} selected={time === i} onPress={() => setTime(i)} />)}
          </View>
          <Button title="Po, më kujto" onPress={() => finishReminder(true)} />
          <Button title="Jo tani" kind="ghost" onPress={() => finishReminder(false)} />
        </View>
      )}

      {step === 4 && (
        <View style={{ gap: S.lg }}>
          <Kicker>Hapi 4 nga 4</Kicker>
          <H2>Ruaje përparimin</H2>
          {note ? <Notice>{note}</Notice> : null}
          <Body muted>
            Me një llogari, seria dhe leximi yt ruhen edhe nëse ndërron telefon, dhe mund të pyesësh Imanin. Pa llogari, gjithçka ruhet vetëm në këtë telefon.
          </Body>
          <Button title="Krijo llogari ose hyr" onPress={() => done(true)} />
          <Button title="Vazhdo pa llogari" kind="ghost" onPress={() => done(false)} />
        </View>
      )}
    </Screen>
  );
}
