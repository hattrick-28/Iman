import type { ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { C, F, MAX_W, R, S } from '@/lib/theme';

import { Body, Button } from './ui';

export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Mbyll" />
      <View style={{ backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, padding: S.lg, paddingBottom: Platform.OS === 'ios' ? 40 : S.xl, gap: S.md, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Body style={{ fontFamily: F.sansBold }}>{title}</Body>
          <Button title="Mbyll" kind="ghost" style={{ minHeight: 36, paddingHorizontal: 14 }} onPress={onClose} />
        </View>
        {children}
      </View>
    </View>
  );
}

