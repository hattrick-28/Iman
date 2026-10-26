import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconHeart } from '@/components/icons';
import { Sheet } from '@/components/sheet';
import { Field, Header, Small, tap } from '@/components/ui';
import { chapters, keyOf, type Chapter } from '@/lib/quran';
import { setPosition, toggleFavourite, useStore } from '@/lib/store';
import { C, F, MAX_W, R, S } from '@/lib/theme';

export default function Surahs() {
  const params = useLocalSearchParams<{ for?: string }>();
  const target = params.for === 'daily' ? 'daily' : 'free';
  const favourites = useStore((s) => s.favourites);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Chapter | null>(null);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/[-'’ ]/g, '');
    if (!n) return chapters;
    return chapters.filter((c) => String(c.n) === n || c.name.toLowerCase().replace(/[-'’ ]/g, '').includes(n) || c.en.toLowerCase().includes(n));
  }, [q]);

  function open(ch: Chapter, ayah: number) {
    setPosition(target, keyOf(ch.n, ayah));
    setPicked(null);
    router.replace(`/read/${target}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Header title={target === 'daily' ? 'Vendi i leximit ditor' : 'Suret'} />
      <View style={{ paddingHorizontal: S.lg, paddingBottom: S.sm, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
        <Field placeholder="Kërko suren (emër ose numër)" value={q} onChangeText={setQ} autoCorrect={false} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(c) => String(c.n)}
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xxxl, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.border }} />}
        renderItem={({ item: c }) => {
          const fav = favourites.includes(c.n);
          return (
            <Pressable onPress={() => { tap(); setPicked(c); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: S.md }, pressed && { opacity: 0.7 }]}>
              <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.accent, fontFamily: F.sansBold }}>{c.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontFamily: F.sansBold, fontSize: 16 }}>{c.name}</Text>
                <Small>{c.en} · {c.count} ajete · {c.place === 'Mecca' ? 'Mekkase' : 'Medinase'}</Small>
              </View>
              <Text style={{ color: C.text, fontFamily: F.arabic, fontSize: 20 }}>{c.ar.replace('سُوْرَةُ ', '')}</Text>
              <Pressable accessibilityLabel={fav ? 'Hiq nga të preferuarat' : 'Shto te të preferuarat'} hitSlop={10} onPress={() => { tap(); toggleFavourite(c.n); }}>
                <IconHeart size={20} color={fav ? C.accent : C.muted} filled={fav} />
              </Pressable>
            </Pressable>
          );
        }}
      />
      <Modal visible={!!picked} transparent animationType="slide" onRequestClose={() => setPicked(null)}>
        {picked && (
          <Sheet title={`${picked.n}. ${picked.name} · zgjidh ajetin`} onClose={() => setPicked(null)}>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Array.from({ length: picked.count }, (_, i) => i + 1).map((a) => (
                <Pressable key={a} onPress={() => open(picked, a)} accessibilityLabel={`Ajeti ${a}`}
                  style={{ width: 52, height: 44, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
                  <Text style={{ color: C.text, fontFamily: F.sansMedium }}>{a}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Sheet>
        )}
      </Modal>
    </SafeAreaView>
  );
}
