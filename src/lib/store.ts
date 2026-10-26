// App state: saved on the device (works offline), synced to Supabase when signed in.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { hasanatOf, lettersBetween, pagesBetween, TOTAL_AYAHS, type TranslationId } from './quran';
import { computeStreak, localDate, streakStatus, type Pause } from './streak';

export type GoalUnit = 'verses' | 'pages' | 'minutes';
export type Kind = 'daily' | 'free' | 'challenge';

export type Prefs = {
  onboarded: boolean;
  name: string;
  goalUnit: GoalUnit;
  goalAmount: number;
  streakGoal: number;
  translation: TranslationId;
  showTranslation: boolean;
  showTranslit: boolean;
  showHasanat: boolean;
  readingLevels: boolean;
  arabicSize: number;
  remindersOn: boolean;
  reminderHour: number;
  reminderMinute: number;
  haptics: boolean;
};

export type Day = { verses: number; pages: number; seconds: number; hasanat: number; goalUnit: GoalUnit; goalAmount: number; met: boolean };
export type Session = {
  clientId: string; kind: Kind; challengeId: string | null; start: number; end: number;
  startedAt: string; endedAt: string; tz: string; synced: boolean;
};
export type Note = { id: string; key: number; body: string; at: string };
export type Bookmark = { key: number; at: string };
export type ChallengeProgress = { progress: number; joinedAt: string; completedAt: string | null };

export type State = {
  prefs: Prefs;
  positions: { daily: number; free: number; challenges: Record<string, number> };
  days: Record<string, Day>;
  sessions: Session[];
  pauses: Pause[];
  favourites: number[]; // surah numbers
  bookmarks: Bookmark[];
  notes: Note[];
  challenges: Record<string, ChallengeProgress>;
  premium: boolean;
  leaderboardOptIn: boolean;
};

const DEFAULT: State = {
  prefs: {
    onboarded: false, name: '', goalUnit: 'verses', goalAmount: 10, streakGoal: 7,
    translation: 'sq_ahmeti', showTranslation: true, showTranslit: false, showHasanat: false,
    readingLevels: true, arabicSize: 28, remindersOn: false, reminderHour: 20, reminderMinute: 0, haptics: true,
  },
  positions: { daily: 1, free: 1, challenges: {} },
  days: {}, sessions: [], pauses: [], favourites: [], bookmarks: [], notes: [], challenges: {},
  premium: false, leaderboardOptIn: false,
};

const KEY = 'iman.state.v1';
let state: State = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, 250);
}

export function setState(fn: (s: State) => State) {
  state = fn(state);
  emit();
}
export const getState = () => state;

export async function loadState(): Promise<State> {
  if (loaded) return state;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      state = { ...DEFAULT, ...saved, prefs: { ...DEFAULT.prefs, ...saved.prefs }, positions: { ...DEFAULT.positions, ...saved.positions } };
    }
  } catch {
    state = DEFAULT;
  }
  loaded = true;
  listeners.forEach((l) => l());
  return state;
}

export async function resetAll() {
  state = DEFAULT;
  await AsyncStorage.removeItem(KEY).catch(() => {});
  listeners.forEach((l) => l());
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
    () => select(state),
  );
}

export const setPrefs = (p: Partial<Prefs>) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...p } }));

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------
export function goalMet(d: Pick<Day, 'verses' | 'pages' | 'seconds'>, unit: GoalUnit, amount: number) {
  if (unit === 'verses') return d.verses >= amount;
  if (unit === 'pages') return d.pages >= amount;
  return d.seconds >= amount * 60;
}

export function goalProgress(d: Day | undefined, unit: GoalUnit, amount: number): { done: number; ratio: number } {
  const done = !d ? 0 : unit === 'verses' ? d.verses : unit === 'pages' ? Math.floor(d.pages) : Math.floor(d.seconds / 60);
  return { done, ratio: Math.min(1, done / amount) };
}

/** One "I'm Done". Mirrors log_reading() on the server; the server recomputes everything on sync. */
export function logReading(kind: Kind, start: number, end: number, startedAt: Date, endedAt: Date, challengeId: string | null = null) {
  const verses = end - start + 1;
  const seconds = Math.max(0, Math.min(86400, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)));
  const pages = pagesBetween(start, end);
  const hasanat = lettersBetween(start, end) * 10;
  const today = localDate(endedAt);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const session: Session = {
    clientId: randomUUID(), kind, challengeId, start, end,
    startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), tz, synced: false,
  };
  setState((s) => {
    const prev = s.days[today];
    const unit = prev?.goalUnit ?? s.prefs.goalUnit;
    const amount = prev?.goalAmount ?? s.prefs.goalAmount;
    const d = {
      verses: (prev?.verses ?? 0) + verses,
      pages: Math.round(((prev?.pages ?? 0) + pages) * 100) / 100,
      seconds: (prev?.seconds ?? 0) + seconds,
      hasanat: (prev?.hasanat ?? 0) + hasanat,
    };
    const next = Math.min(end + 1, TOTAL_AYAHS);
    const positions =
      kind === 'challenge' && challengeId
        ? { ...s.positions, challenges: { ...s.positions.challenges, [challengeId]: next } }
        : { ...s.positions, [kind]: next };
    const challenges = { ...s.challenges };
    if (kind === 'challenge' && challengeId && challenges[challengeId]) {
      const c = challenges[challengeId];
      challenges[challengeId] = { ...c, progress: c.progress + verses };
    }
    return {
      ...s,
      positions,
      challenges,
      days: { ...s.days, [today]: { ...d, goalUnit: unit, goalAmount: amount, met: goalMet(d, unit, amount) } },
      sessions: [...s.sessions, session].slice(-2000),
    };
  });
  return { verses, seconds, pages, hasanat, session };
}

export function setPosition(kind: 'daily' | 'free', key: number) {
  setState((s) => ({ ...s, positions: { ...s.positions, [kind]: key } }));
}

export function markSynced(ids: string[]) {
  const set = new Set(ids);
  setState((s) => ({ ...s, sessions: s.sessions.map((x) => (set.has(x.clientId) ? { ...x, synced: true } : x)) }));
}

export function streakNow(s: State = state) {
  const met = Object.entries(s.days).filter(([, d]) => d.met).map(([k]) => k);
  return streakStatus(computeStreak(met, s.pauses), localDate(), s.pauses);
}

export function pauseStreak(days: number) {
  const from = localDate();
  const until = localDate(new Date(Date.now() + (days - 1) * 86400000));
  setState((s) => ({ ...s, pauses: [...s.pauses, { from, until }] }));
  return { from, until };
}

export function totals(s: State, range: 'today' | 'week' | 'all') {
  const today = localDate();
  const weekAgo = localDate(new Date(Date.now() - 6 * 86400000));
  let verses = 0, pages = 0, seconds = 0, hasanat = 0;
  for (const [date, d] of Object.entries(s.days)) {
    if (range === 'today' && date !== today) continue;
    if (range === 'week' && date < weekAgo) continue;
    verses += d.verses; pages += d.pages; seconds += d.seconds; hasanat += d.hasanat;
  }
  return { verses, pages: Math.round(pages * 10) / 10, seconds, hasanat };
}

// ---------------------------------------------------------------------------
// Saved content
// ---------------------------------------------------------------------------
export const toggleFavourite = (surah: number) =>
  setState((s) => ({ ...s, favourites: s.favourites.includes(surah) ? s.favourites.filter((x) => x !== surah) : [...s.favourites, surah] }));

export const toggleBookmark = (key: number) =>
  setState((s) => ({
    ...s,
    bookmarks: s.bookmarks.some((b) => b.key === key)
      ? s.bookmarks.filter((b) => b.key !== key)
      : [...s.bookmarks, { key, at: new Date().toISOString() }],
  }));

export function canAddNote(s: State = state) {
  return s.premium || s.notes.length < 3;
}
export function saveNote(key: number, body: string, id?: string) {
  const text = body.trim();
  setState((s) => {
    if (id) return { ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, body: text, at: new Date().toISOString() } : n)) };
    return { ...s, notes: [...s.notes, { id: randomUUID(), key, body: text, at: new Date().toISOString() }] };
  });
}
export const deleteNote = (id: string) => setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));

export function joinChallenge(id: string) {
  setState((s) =>
    s.challenges[id] ? s : { ...s, challenges: { ...s.challenges, [id]: { progress: 0, joinedAt: new Date().toISOString(), completedAt: null } } },
  );
}

export function resetStats() {
  setState((s) => ({
    ...s, days: {}, sessions: [], pauses: [],
    positions: { daily: 1, free: 1, challenges: {} },
    challenges: Object.fromEntries(Object.entries(s.challenges).map(([k, v]) => [k, { ...v, progress: 0, completedAt: null }])),
  }));
}

export { hasanatOf };
