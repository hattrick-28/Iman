import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Field, Header, Small } from '@/components/ui';
import { label, search, translation } from '@/lib/quran';
import { setPosition, useStore } from '@/lib/store';
import { C, F, MAX_W, S } from '@/lib/theme';

export default function Search() {
  const tr = useStore((s) => s.prefs.translation);
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const results = useMemo(() => search(dq, tr, 60), [dq, tr]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Header title="Kërko në Kur'an" />
      <View style={{ paddingHorizontal: S.lg, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
        <Field placeholder="p.sh. durim, prindërit, mëshirë" value={q} onChangeText={setQ} autoFocus autoCorrect={false} returnKeyType="search" />
        <Small style={{ marginTop: 6 }}>
          {dq.trim().length < 2 ? 'Shkruaj të paktën 2 shkronja.' : results.length === 0 ? 'Nuk u gjet asnjë ajet.' : `${results.length}${results.length === 60 ? '+' : ''} ajete`}
        </Small>
      </View>
      <FlatList
        data={results}
        keyExtractor={(k) => String(k)}
        contentContainerStyle={{ padding: S.lg, gap: S.md, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}
        renderItem={({ item: k }) => (
          <Pressable onPress={() => { setPosition('free', k); router.push('/read/free'); }}
            style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: S.lg }}>
            <Text style={{ color: C.accent, fontFamily: F.sansBold, fontSize: 13, marginBottom: 6 }}>{label(k)}</Text>
            <Body numberOfLines={4}>{translation(tr, k)}</Body>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
