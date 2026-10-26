import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSend } from '@/components/icons';
import { Sheet } from '@/components/sheet';
import { Body, Button, Card, Gap, H2, Kicker, Notice, Small, tap } from '@/components/ui';
import { CONFIG } from '@/lib/config';
import { ask, reportAnswer, type AskResult, type Citation } from '@/lib/remote';
import { chapterOf } from '@/lib/quran';
import { setPosition } from '@/lib/store';
import { useSession } from '@/lib/supabase';
import { C, F, MAX_W, R, S } from '@/lib/theme';

type Msg = { role: 'user'; text: string } | { role: 'assistant'; result: AskResult } | { role: 'error'; text: string };

const EXAMPLES = [
  'Ndihem i shqetësuar për të ardhmen. Çfarë më mëson Islami?',
  'Si ta forcoj durimin kur gjërat shkojnë keq?',
  'Si duhet të sillem me prindërit kur nuk pajtohemi?',
  'Çfarë thotë Kur\'ani për faljen e të tjerëve?',
];

const citeLabel = (c: Citation) => (c.ayah_key ? `${chapterOf(c.ayah_key).name} ${c.ref}` : c.label);

const GRADE: Record<string, string> = { sahih: 'sahih', hasan: 'hasen', daif: 'i dobët', mawdu: 'i trilluar', ungraded: 'pa vlerësim' };

export default function Pyet() {
  const { session, ready } = useSession();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [open, setOpen] = useState<Citation | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const scroll = useRef<ScrollViewInstance>(null);

  async function send(q?: string) {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    tap();
    setText('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    const r = await ask(question, threadId);
    setBusy(false);
    if ('error' in r) {
      const err = {
        signin: 'Hyr në llogari për të pyetur Imanin.',
        limit: `Ke arritur kufirin e sotëm (${CONFIG.freeQuestionsPerDay} pyetje). Me Premium mund të pyesësh shumë më tepër.`,
        offline: 'Nuk ka lidhje me internetin. Provo përsëri.',
        server: 'Imani nuk u përgjigj dot tani. Provo pas pak.',
      }[r.error] ?? 'Diçka nuk shkoi.';
      setMessages((m) => [...m, { role: 'error', text: err }]);
      if (r.error === 'limit') setRemaining(0);
    } else {
      setThreadId(r.thread_id);
      setRemaining(r.remaining);
      setMessages((m) => [...m, { role: 'assistant', result: r }]);
    }
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
  }

  if (ready && !session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: S.lg, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
          <Intro />
          <Gap />
          <Card><Body muted>Për të pyetur Imanin të duhet një llogari falas. Kështu ruajmë bisedat e tua dhe kufirin ditor.</Body><Gap h={S.md} /><Button title="Krijo llogari ose hyr" onPress={() => router.push('/auth')} /></Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingVertical: S.sm, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
          <H2 style={{ fontSize: 22 }}>Pyet Imanin</H2>
          {messages.length > 0 && <Button title="Bisedë e re" kind="ghost" style={{ minHeight: 36, paddingHorizontal: 14 }} onPress={() => { setMessages([]); setThreadId(null); }} />}
        </View>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: S.lg, gap: S.md, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          {messages.length === 0 && (
            <>
              <Intro />
              <Gap h={S.sm} />
              {EXAMPLES.map((e) => (
                <Pressable key={e} onPress={() => send(e)} style={{ borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.md, backgroundColor: C.surface }}>
                  <Body style={{ fontSize: 15 }}>{e}</Body>
                </Pressable>
              ))}
            </>
          )}
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: C.primary, borderRadius: 18, borderBottomRightRadius: 6, padding: S.md }}>
                <Text style={{ color: C.onPrimary, fontFamily: F.sans, fontSize: 16, lineHeight: 22 }}>{m.text}</Text>
              </View>
            ) : m.role === 'error' ? (
              <Notice key={i} tone="error">{m.text}</Notice>
            ) : (
              <View key={i} style={{ alignSelf: 'flex-start', maxWidth: '94%', gap: S.sm }}>
                {m.result.safety === 'crisis' && (
                  <Notice tone="error">Nëse je në rrezik tani, telefono 112 ose shko te mjeku më i afërt. Nuk je vetëm.</Notice>
                )}
                <View style={{ backgroundColor: C.raised, borderRadius: 18, borderBottomLeftRadius: 6, padding: S.md }}>
                  <AnswerText text={m.result.answer} citations={m.result.citations} onCite={setOpen} />
                  {m.result.citations.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: S.md }}>
                      {m.result.citations.map((c) => (
                        <Pressable key={c.id} onPress={() => setOpen(c)} accessibilityLabel={`Burimi ${c.n}: ${citeLabel(c)}`}
                          style={{ borderWidth: 1, borderColor: '#2F4256', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Text style={{ color: C.link, fontFamily: F.sansBold, fontSize: 12 }}>
                            {c.n}. {citeLabel(c)}{c.grade && c.source === 'hadith' ? ` · ${GRADE[c.grade] ?? c.grade}` : ''}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {m.result.safety === 'refer_scholar' && (
                    <Small style={{ marginTop: S.sm }}>Për rastin tënd konkret, pyet një hoxhë ose dijetar që e njeh situatën.</Small>
                  )}
                </View>
                <Pressable onPress={() => setReport(m.result.message_id)} disabled={reported.has(m.result.message_id)}>
                  <Small style={{ color: reported.has(m.result.message_id) ? C.success : C.muted }}>
                    {reported.has(m.result.message_id) ? 'Faleminderit, e shqyrtojmë.' : 'Raporto një gabim në përgjigje'}
                  </Small>
                </Pressable>
              </View>
            ),
          )}
          {busy && <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center' }}><ActivityIndicator color={C.accent} /><Small>Imani po kërkon në Kur’an dhe Sunet…</Small></View>}
        </ScrollView>

        <View style={{ padding: S.md, borderTopWidth: 1, borderTopColor: C.border, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
          {remaining !== null && remaining <= 1 && (
            <Pressable onPress={() => router.push('/premium')}><Small style={{ marginBottom: 6 }}>{remaining === 0 ? 'Pyetjet e sotme mbaruan.' : 'Të ka mbetur 1 pyetje sot.'} <Small style={{ color: C.accent }}>Premium →</Small></Small></Pressable>
          )}
          <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-end' }}>
            <TextInput value={text} onChangeText={setText} placeholder="Shkruaj pyetjen ose shqetësimin tënd…" placeholderTextColor={C.input} multiline maxLength={1500}
              style={{ flex: 1, minHeight: 48, maxHeight: 140, color: C.text, fontFamily: F.sans, fontSize: 16, borderWidth: 1, borderColor: C.input, borderRadius: 22, paddingHorizontal: S.lg, paddingVertical: 12 }} />
            <Pressable accessibilityLabel="Dërgo" onPress={() => send()} disabled={!text.trim() || busy}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() && !busy ? C.primary : C.raised, alignItems: 'center', justifyContent: 'center' }}>
              <IconSend color={text.trim() && !busy ? C.onPrimary : C.muted} size={20} />
            </Pressable>
          </View>
          <Small style={{ marginTop: 6, textAlign: 'center' }}>Imani mund të gabojë dhe nuk jep fetva. Kontrollo burimet.</Small>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        {open && (
          <Sheet title={`${open.n}. ${citeLabel(open)}`} onClose={() => setOpen(null)}>
            <ScrollView style={{ maxHeight: 420 }}>
              {open.arabic ? <Text style={{ color: C.text, fontFamily: F.arabic, fontSize: 22, lineHeight: 46, textAlign: 'right', writingDirection: 'rtl' }}>{open.arabic}</Text> : null}
              {open.translation ? <><Gap h={S.md} /><Body>{open.translation}</Body></> : null}
              <Gap h={S.md} />
              {open.source === 'hadith' ? (
                <Small>Vlerësimi: {GRADE[open.grade ?? 'ungraded'] ?? open.grade}{open.graded_by ? ` (${open.graded_by})` : ''}{open.translator ? ` · Përkthimi: ${open.translator}` : ''}</Small>
              ) : open.translator ? <Small>Përkthimi: {open.translator}</Small> : null}
            </ScrollView>
            {open.ayah_key ? <Button title="Lexo në Kur'an" onPress={() => { setPosition('free', open.ayah_key!); setOpen(null); router.push('/read/free'); }} /> : null}
          </Sheet>
        )}
      </Modal>

      <Modal visible={!!report} transparent animationType="slide" onRequestClose={() => setReport(null)}>
        <Sheet title="Çfarë nuk shkon?" onClose={() => setReport(null)}>
          {[['wrong_reference', 'Referenca është e gabuar'], ['weak_hadith', 'Hadithi është i dobët'], ['wrong_ruling', 'Përgjigja është e pasaktë'], ['unhelpful', 'Nuk më ndihmoi']].map(([k, l]) => (
            <Button key={k} title={l} kind="secondary" onPress={async () => {
              const id = report!;
              setReport(null);
              if (await reportAnswer(id, k, '')) setReported((s) => new Set(s).add(id));
            }} />
          ))}
        </Sheet>
      </Modal>
    </SafeAreaView>
  );
}

function Intro() {
  return (
    <Card glow>
      <Kicker>Pyet Imanin</Kicker>
      <Gap h={S.sm} />
      <Body>Trego çfarë të shqetëson ose çfarë do të dish. Imani përgjigjet vetëm nga Kur’ani dhe hadithet e sakta, me referencë për çdo gjë.</Body>
      <Gap h={S.sm} />
      <Small>Për çështje fikhu të veçanta, Imani të tregon tekstet dhe të këshillon të pyesësh një hoxhë.</Small>
    </Card>
  );
}

// Renders "[1]" markers as tappable references.
function AnswerText({ text, citations, onCite }: { text: string; citations: Citation[]; onCite: (c: Citation) => void }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <Text style={{ color: C.text, fontFamily: F.sans, fontSize: 16, lineHeight: 24 }}>
      {parts.map((p, i) => {
        const m = /^\[(\d+)\]$/.exec(p);
        const c = m ? citations.find((x) => x.n === Number(m[1])) : undefined;
        if (m && c) return <Text key={i} onPress={() => onCite(c)} style={{ color: C.link, fontFamily: F.sansBold }}>[{c.n}]</Text>;
        if (m) return null; // a marker without a verified source is dropped
        return <Text key={i}>{p}</Text>;
      })}
    </Text>
  );
}
