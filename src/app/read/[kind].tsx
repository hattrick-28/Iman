import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sheet } from '@/components/sheet';
import { IconBack, IconBookmark, IconNext, IconNote, IconSettings, IconShare } from '@/components/icons';
import { Body, Button, Card, Gap, H2, Kicker, Notice, Progress, Small, tap, ToggleRow } from '@/components/ui';
import { GROUP_CHALLENGES } from '@/lib/challenges';
import { fmtClock, fmtNum, levelFromMinutes } from '@/lib/format';
import { arabic, chapterOf, hasanatOf, juzOf, label, refOf, TOTAL_AYAHS, translation, TRANSLATIONS, transliteration } from '@/lib/quran';
import {
  canAddNote, getState, goalProgress, joinChallenge, logReading, saveNote, setPrefs, streakNow, toggleBookmark, totals, useStore,
} from '@/lib/store';
import { localDate } from '@/lib/streak';
import { syncNow } from '@/lib/sync';
import { C, F, MAX_W, R, S } from '@/lib/theme';

type Summary = { verses: number; seconds: number; hasanat: number; goalDone: boolean; streak: number };

export default function Reader() {
  const { kind: rawKind, id } = useLocalSearchParams<{ kind: string; id?: string }>();
  const kind = rawKind === 'free' || rawKind === 'challenge' ? rawKind : 'daily';
  const challenge = kind === 'challenge' ? GROUP_CHALLENGES.find((c) => c.id === id) ?? null : null;
  const s = useStore((x) => x);
  const prefs = s.prefs;

  const startKey = useMemo(() => {
    if (kind === 'challenge' && challenge) return s.positions.challenges[challenge.id] ?? 1;
    return kind === 'free' ? s.positions.free : s.positions.daily;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [key, setKey] = useState(startKey);
  useEffect(() => {
    if (challenge && !s.challenges[challenge.id]) joinChallenge(challenge.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [maxKey, setMaxKey] = useState(startKey);
  const startedAt = useRef(new Date());
  const [elapsed, setElapsed] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const logged = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Leaving without "Mbarova" still saves what was read (verses passed with "next").
  const maxRef = useRef(startKey);
  maxRef.current = maxKey;
  useEffect(() => () => {
    if (!logged.current && maxRef.current > startKey) finish(maxRef.current - 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(lastKey: number, showSummary: boolean) {
    if (logged.current) return;
    logged.current = true;
    const end = Math.max(startKey, Math.min(lastKey, TOTAL_AYAHS));
    const r = logReading(kind, startKey, end, startedAt.current, new Date(), challenge?.id ?? null);
    syncNow();
    if (showSummary) {
      const st = streakNow();
      const d = !!getState().days[localDate()]?.met;
      setSummary({ verses: r.verses, seconds: r.seconds, hasanat: r.hasanat, goalDone: d, streak: st.current });
    }
  }

  const go = (k: number) => {
    tap();
    const n = Math.max(1, Math.min(TOTAL_AYAHS, k));
    setKey(n);
    if (n > maxKey) setMaxKey(n);
  };

  const ch = chapterOf(key);
  const { ayah } = refOf(key);
  const bookmarked = s.bookmarks.some((b) => b.key === key);
  const translationOnly = !!challenge?.translationOnly;
  const read = Math.max(0, maxKey - startKey);

  // Top progress: today's goal, or the challenge.
  const today = s.days[localDate()];
  const unit = today?.goalUnit ?? prefs.goalUnit;
  const amount = today?.goalAmount ?? prefs.goalAmount;
  let ratio: number;
  let progressLabel: string;
  if (challenge) {
    const done = (s.challenges[challenge.id]?.progress ?? 0) + read;
    ratio = done / challenge.target;
    progressLabel = `${fmtNum(done)} / ${fmtNum(challenge.target)} ajete`;
  } else {
    const base = goalProgress(today, unit, amount).done;
    const live = unit === 'verses' ? read : unit === 'minutes' ? Math.floor(elapsed / 60) : 0;
    ratio = (base + live) / amount;
    progressLabel = `${base + live} / ${amount} ${unit === 'verses' ? 'ajete' : unit === 'pages' ? 'faqe' : 'minuta'} sot`;
  }

  const allMinutes = Math.floor((totals(s, 'all').seconds + elapsed) / 60);
  const lvl = levelFromMinutes(allMinutes);

  if (summary) return <SummaryView summary={summary} showHasanat={prefs.showHasanat} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingVertical: S.sm }}>
          <Pressable accessibilityLabel="Kthehu" onPress={() => router.back()} style={pill}><IconBack size={20} /></Pressable>
          <View style={{ height: 40, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg }}>
            <Text style={pillText} numberOfLines={1}>{read} ajete</Text>
            <Text style={[pillText, { color: C.muted }]}>|</Text>
            <Text style={pillText}>{fmtClock(elapsed)}</Text>
          </View>
          <Pressable accessibilityLabel="Cilësimet e leximit" onPress={() => setShowSettings(true)} style={pill}><IconSettings size={20} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xl }}>
          {challenge ? (
            <Card style={{ marginTop: S.sm }}>
              <Kicker>Sfidë</Kicker>
              <Body style={{ fontFamily: F.sansBold, marginTop: 4 }}>{challenge.title}</Body>
            </Card>
          ) : prefs.readingLevels ? (
            <Card glow style={{ marginTop: S.sm, flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.accent, fontFamily: F.displayBold, fontSize: 22 }}>{lvl.level}</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Body style={{ fontFamily: F.sansBold }}>Niveli {lvl.level}</Body>
                <Progress ratio={lvl.into / lvl.need} height={6} />
                <Small>{lvl.need - lvl.into} min deri te niveli {lvl.level + 1}</Small>
              </View>
            </Card>
          ) : null}

          <Gap h={S.lg} />
          <Progress ratio={ratio} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Small>{progressLabel}</Small>
            <Small>Xhuzi {juzOf(key)}</Small>
          </View>

          <Gap h={S.lg} />
          <View style={{ backgroundColor: '#F7F5F0', borderRadius: R.lg, padding: S.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#0B0D17', fontFamily: F.sansBold, fontSize: 17 }}>{ch.n}. {ch.name}</Text>
                <Text style={{ color: '#4A5260', fontFamily: F.sans, fontSize: 14 }}>Ajeti {ayah}/{ch.count}</Text>
              </View>
              <Pressable accessibilityLabel={bookmarked ? 'Hiq shënuesin' : 'Shëno ajetin'} hitSlop={10} onPress={() => { tap(); toggleBookmark(key); }}>
                <IconBookmark color="#0B0D17" filled={bookmarked} />
              </Pressable>
            </View>
            {!translationOnly && (
              <Text style={{ color: '#0B0D17', fontFamily: F.arabic, fontSize: prefs.arabicSize, lineHeight: prefs.arabicSize * 2.05, textAlign: 'right', writingDirection: 'rtl', marginTop: S.lg }}>
                {arabic(key)} <Text style={{ color: '#8A6A50' }}>﴿{ayah.toLocaleString('ar-EG')}﴾</Text>
              </Text>
            )}
            {(translationOnly || prefs.showTranslation) && (
              <Text style={{ color: '#1A1F2B', fontFamily: F.sans, fontSize: translationOnly ? 19 : 16, lineHeight: translationOnly ? 29 : 24, marginTop: S.lg }}>
                {translation(prefs.translation, key)}
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: S.lg }}>
              <Pressable accessibilityLabel="Ndaje ajetin" hitSlop={10} onPress={() => Share.share({ message: `${translation(prefs.translation, key)}\n\n(${label(key)}) · Iman` })}>
                <IconShare color="#0B0D17" size={22} />
              </Pressable>
              <Pressable accessibilityLabel="Shënim personal" hitSlop={10} onPress={() => {
                const existing = s.notes.find((n) => n.key === key);
                setNoteText(existing?.body ?? '');
                setNoteOpen(true);
              }}>
                <IconNote color="#0B0D17" size={22} />
              </Pressable>
            </View>
          </View>

          {!translationOnly && prefs.showTranslit && (
            <Text style={{ color: C.text, fontFamily: F.sans, fontSize: 17, lineHeight: 26, marginTop: S.lg }}>{transliteration(key)}</Text>
          )}
          <Small style={{ marginTop: S.md }}>{TRANSLATIONS.find((t) => t.id === prefs.translation)?.credit}</Small>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: S.md }}>
          <Pressable accessibilityLabel="Ajeti i mëparshëm" onPress={() => go(key - 1)} style={navBtn}><IconBack /></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { tap(); finish(key, true); }}
            style={[navBtn, { flex: 1.4, backgroundColor: C.surface }]}>
            <Text style={{ color: C.text, fontFamily: F.sansBold, fontSize: 16 }}>Mbarova</Text>
          </Pressable>
          <Pressable accessibilityLabel="Ajeti tjetër" onPress={() => go(key + 1)} style={[navBtn, { backgroundColor: C.primary }]}>
            {prefs.showHasanat && <Text style={{ position: 'absolute', top: -22, color: C.text, fontFamily: F.sansBold, fontSize: 14 }}>+{fmtNum(hasanatOf(key))}</Text>}
            <IconNext color={C.onPrimary} />
          </Pressable>
        </View>
      </View>

      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <Sheet onClose={() => setShowSettings(false)} title="Leximi">
          <ToggleRow title="Përkthimi" value={prefs.showTranslation} onChange={(v) => setPrefs({ showTranslation: v })} />
          <ToggleRow title="Transliterimi" value={prefs.showTranslit} onChange={(v) => setPrefs({ showTranslit: v })} />
          <ToggleRow title="Nivelet e leximit" value={prefs.readingLevels} onChange={(v) => setPrefs({ readingLevels: v })} />
          <ToggleRow title="Shfaq hasenatet" subtitle="Numri i shkronjave × 10. Fshehur si parazgjedhje." value={prefs.showHasanat} onChange={(v) => setPrefs({ showHasanat: v })} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Body style={{ flex: 1 }}>Madhësia e shkrimit arab</Body>
            <Button title="−" kind="secondary" style={{ minHeight: 40, paddingHorizontal: 18 }} onPress={() => setPrefs({ arabicSize: Math.max(20, prefs.arabicSize - 2) })} />
            <Text style={{ color: C.text, fontFamily: F.sansBold, width: 28, textAlign: 'center' }}>{prefs.arabicSize}</Text>
            <Button title="+" kind="secondary" style={{ minHeight: 40, paddingHorizontal: 18 }} onPress={() => setPrefs({ arabicSize: Math.min(44, prefs.arabicSize + 2) })} />
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
            {TRANSLATIONS.map((t) => (
              <Button key={t.id} title={t.label} kind={prefs.translation === t.id ? 'primary' : 'secondary'} style={{ minHeight: 40 }} onPress={() => setPrefs({ translation: t.id })} />
            ))}
          </View>
        </Sheet>
      </Modal>

      <Modal visible={noteOpen} transparent animationType="slide" onRequestClose={() => setNoteOpen(false)}>
        <Sheet onClose={() => setNoteOpen(false)} title={`Shënim · ${label(key)}`}>
          {!canAddNote() && !s.notes.some((n) => n.key === key) ? (
            <>
              <Notice>Me versionin falas mund të ruash 3 shënime. Me Premium, pa kufi.</Notice>
              <Button title="Shiko Premium" onPress={() => { setNoteOpen(false); router.push('/premium'); }} />
            </>
          ) : (
            <>
              <TextInput multiline value={noteText} onChangeText={setNoteText} placeholder="Çfarë të mësoi ky ajet?" placeholderTextColor={C.input}
                style={{ minHeight: 140, color: C.text, fontFamily: F.sans, fontSize: 16, borderWidth: 1, borderColor: C.input, borderRadius: R.md, padding: S.md, textAlignVertical: 'top' }} />
              <Button title="Ruaj" disabled={!noteText.trim()} onPress={() => {
                const existing = s.notes.find((n) => n.key === key);
                saveNote(key, noteText, existing?.id);
                setNoteOpen(false);
              }} />
            </>
          )}
        </Sheet>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryView({ summary, showHasanat }: { summary: Summary; showHasanat: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, padding: S.lg, justifyContent: 'center', width: '100%', maxWidth: MAX_W, alignSelf: 'center', gap: S.lg }}>
        <Kicker>Elhamdulil-lah</Kicker>
        <H2 style={{ fontSize: 34, lineHeight: 38 }}>{summary.goalDone ? 'Synimi i sotëm u arrit' : 'Leximi u ruajt'}</H2>
        <Card glow>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Big label="Ajete" value={String(summary.verses)} />
            <Big label="Koha" value={fmtClock(summary.seconds)} />
            {showHasanat ? <Big label="Hasenat" value={fmtNum(summary.hasanat)} /> : <Big label="Seria" value={`${summary.streak} ditë`} />}
          </View>
        </Card>
        {showHasanat && <Small>Shpërblimin e di vetëm Allahu. Numri është vetëm një kujtesë: çdo shkronjë, dhjetë të mira.</Small>}
        <Button title="Kthehu në fillim" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

const Big = ({ label, value }: { label: string; value: string }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{ color: C.text, fontFamily: F.displayBold, fontSize: 30 }}>{value}</Text>
    <Small>{label}</Small>
  </View>
);

const pill = { width: 52, height: 40, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center' as const, justifyContent: 'center' as const };
const pillText = { color: C.text, fontFamily: F.sansBold, fontSize: 14 };
const navBtn = { flex: 1, height: 56, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center' as const, justifyContent: 'center' as const };
