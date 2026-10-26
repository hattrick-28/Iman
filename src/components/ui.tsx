import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getState } from '@/lib/store';
import { C, F, MAX_W, R, S } from '@/lib/theme';

import { IconBack, IconChevron } from './icons';

export function tap() {
  if (Platform.OS !== 'web' && getState().prefs.haptics) Haptics.selectionAsync().catch(() => {});
}

export function Screen({ children, scroll = true, header, padded = true, edges }: {
  children: ReactNode; scroll?: boolean; header?: ReactNode; padded?: boolean; edges?: ('top' | 'bottom')[];
}) {
  const inner = <View style={[styles.inner, padded && styles.padded]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={edges ?? ['top']}>
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Header({ title, back = true, right }: { title?: string; back?: boolean; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {back && (
          <Pressable accessibilityRole="button" accessibilityLabel="Kthehu" hitSlop={12} style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <IconBack size={22} />
          </Pressable>
        )}
      </View>
      {title ? <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text> : <View />}
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export const Display = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.display, style]}>{children}</Text>
);
export const H2 = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.h2, style]}>{children}</Text>
);
export const Kicker = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.kicker, style]}>{children}</Text>
);
export const Body = ({ children, style, muted, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; numberOfLines?: number }) => (
  <Text numberOfLines={numberOfLines} style={[styles.body, muted && { color: C.muted }, style]}>{children}</Text>
);
export const Small = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[styles.small, style]}>{children}</Text>
);

export function Card({ children, style, onPress, glow }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; glow?: boolean }) {
  const s = [styles.card, glow && styles.cardGlow, style];
  if (!onPress) return <View style={s}>{children}</View>;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, loading, style, icon }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; icon?: ReactNode;
}) {
  const bg = { primary: C.primary, accent: C.accent, secondary: C.raised, ghost: 'transparent', danger: 'transparent' }[kind];
  const fg = { primary: C.onPrimary, accent: C.onAccent, secondary: C.text, ghost: C.text, danger: C.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [
        styles.button, { backgroundColor: bg },
        (kind === 'ghost' || kind === 'secondary') && { borderWidth: 1, borderColor: C.border },
        kind === 'danger' && { borderWidth: 1, borderColor: C.danger },
        (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={styles.buttonRow}>
          {icon}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { tap(); onPress(); }}
      style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && { color: C.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function Progress({ ratio, color = C.accent, height = 8 }: { ratio: number; color?: string; height?: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Row({ title, subtitle, onPress, right, icon, danger }: {
  title: string; subtitle?: string; onPress?: () => void; right?: ReactNode; icon?: ReactNode; danger?: boolean;
}) {
  const content = (
    <>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: C.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <IconChevron /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      {content}
    </Pressable>
  );
}

export function ToggleRow({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row title={title} subtitle={subtitle}
      right={<Switch value={value} onValueChange={(v) => { tap(); onChange(v); }} trackColor={{ true: C.accent, false: C.border }} thumbColor={C.text} />} />
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: S.xs }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={C.input} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function confirm(title: string, message: string, ok: () => void, okLabel = 'Fshi') {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) ok();
    return;
  }
  Alert.alert(title, message, [{ text: 'Anulo', style: 'cancel' }, { text: okLabel, style: 'destructive', onPress: ok }]);
}

export const Gap = ({ h = S.lg }: { h?: number }) => <View style={{ height: h }} />;

export const Notice = ({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) => (
  <View style={[styles.notice, tone === 'error' && { borderColor: C.danger }, tone === 'success' && { borderColor: C.success }]}>
    <Text style={[styles.body, { fontSize: 14 }, tone === 'error' && { color: C.danger }, tone === 'success' && { color: C.success }]}>{children}</Text>
  </View>
);

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingBottom: S.xxxl },
  inner: { width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  padded: { paddingHorizontal: S.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingVertical: S.sm, minHeight: 52 },
  headerSide: { width: 64 },
  headerTitle: { flex: 1, textAlign: 'center', color: C.text, fontFamily: F.sansBold, fontSize: 17 },
  backBtn: { width: 44, height: 36, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  display: { color: C.text, fontFamily: F.displayBold, fontSize: 40, lineHeight: 44, textTransform: 'uppercase' },
  h2: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 28, textTransform: 'uppercase', letterSpacing: 0.3 },
  kicker: { color: C.accent, fontFamily: F.caption, fontSize: 14, letterSpacing: 2.5, textTransform: 'uppercase' },
  body: { color: C.text, fontFamily: F.sans, fontSize: 16, lineHeight: 24 },
  small: { color: C.muted, fontFamily: F.sans, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  cardGlow: { backgroundColor: C.glow, borderColor: '#2B4A78' },
  button: { minHeight: 52, borderRadius: R.pill, paddingHorizontal: S.xl, alignItems: 'center', justifyContent: 'center' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  buttonText: { fontFamily: F.sansBold, fontSize: 16 },
  chip: { paddingHorizontal: S.lg, paddingVertical: 10, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.text, fontFamily: F.sansMedium, fontSize: 15 },
  track: { width: '100%', backgroundColor: C.raised, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 14, paddingHorizontal: S.lg, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: C.text, fontFamily: F.sansMedium, fontSize: 16 },
  rowSub: { color: C.muted, fontFamily: F.sans, fontSize: 13, marginTop: 2 },
  fieldLabel: { color: C.muted, fontFamily: F.sansMedium, fontSize: 13 },
  input: { minHeight: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.input, color: C.text, backgroundColor: C.bg, paddingHorizontal: S.lg, fontFamily: F.sans, fontSize: 16 },
  notice: { borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.md, backgroundColor: C.surface },
});
