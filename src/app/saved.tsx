import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Chip, confirm, Gap, Header, Screen, Small } from '@/components/ui';
import { chapters, keyOf, label, translation } from '@/lib/quran';
import { deleteNote, setPosition, toggleBookmark, toggleFavourite, useStore } from '@/lib/store';
import { C, F, S } from '@/lib/theme';

export default function Saved() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(params.tab === 'bm' ? 'bm' : params.tab === 'notes' ? 'notes' : 'fav');
  const s = useStore((x) => x);
  const read = (k: number) => { setPosition('free', k); router.push('/read/free'); };

  return (
    <Screen header={<Header title="Të ruajturat" />}>
      <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
        <Chip label={`Suret (${s.favourites.length})`} selected={tab === 'fav'} onPress={() => setTab('fav')} />
        <Chip label={`Ajetet (${s.bookmarks.length})`} selected={tab === 'bm'} onPress={() => setTab('bm')} />
        <Chip label={`Shënimet (${s.notes.length})`} selected={tab === 'notes'} onPress={() => setTab('notes')} />
      </View>
      <Gap />

      {tab === 'fav' && (s.favourites.length === 0 ? <Empty text="Shto suret që i lexon shpesh duke prekur zemrën te lista e sureve." action={() => router.push('/surahs')} /> : (
        <View style={{ gap: S.sm }}>
          {s.favourites.map((n) => {
            const c = chapters[n - 1];
            return (
              <Card key={n} onPress={() => read(keyOf(n, 1))} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontFamily: F.sansBold }}>{c.n}. {c.name}</Body>
                  <Small>{c.en} · {c.count} ajete</Small>
                </View>
                <Button title="Hiq" kind="ghost" style={{ minHeight: 36, paddingHorizontal: 14 }} onPress={() => toggleFavourite(n)} />
              </Card>
            );
          })}
        </View>
      ))}

      {tab === 'bm' && (s.bookmarks.length === 0 ? <Empty text="Shëno ajetet që do t'i rikthehesh me shenjën në kartën e ajetit." /> : (
        <View style={{ gap: S.sm }}>
          {[...s.bookmarks].reverse().map((b) => (
            <Card key={b.key} onPress={() => read(b.key)}>
              <Text style={{ color: C.accent, fontFamily: F.sansBold, fontSize: 13 }}>{label(b.key)}</Text>
              <Body numberOfLines={3} style={{ marginTop: 4 }}>{translation(s.prefs.translation, b.key)}</Body>
              <Pressable onPress={() => toggleBookmark(b.key)} style={{ alignSelf: 'flex-end', marginTop: S.sm }}><Small style={{ color: C.danger }}>Hiq</Small></Pressable>
            </Card>
          ))}
        </View>
      ))}

      {tab === 'notes' && (s.notes.length === 0 ? <Empty text="Shkruaj një shënim personal për një ajet me ikonën e lapsit te leximi." /> : (
        <View style={{ gap: S.sm }}>
          {[...s.notes].reverse().map((n) => (
            <Card key={n.id} onPress={() => read(n.key)}>
              <Text style={{ color: C.accent, fontFamily: F.sansBold, fontSize: 13 }}>{label(n.key)}</Text>
              <Body style={{ marginTop: 4 }}>{n.body}</Body>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: S.sm }}>
                <Small>{new Date(n.at).toLocaleDateString('sq')}</Small>
                <Pressable onPress={() => confirm('Fshi shënimin?', 'Ky veprim nuk kthehet.', () => deleteNote(n.id))}><Small style={{ color: C.danger }}>Fshi</Small></Pressable>
              </View>
            </Card>
          ))}
          {!s.premium && <Small>Versioni falas ruan deri në 3 shënime.</Small>}
        </View>
      ))}
    </Screen>
  );
}

function Empty({ text, action }: { text: string; action?: () => void }) {
  return (
    <Card>
      <Body muted>{text}</Body>
      {action && <><Gap h={S.md} /><Button title="Shiko suret" kind="secondary" onPress={action} /></>}
    </Card>
  );
}
