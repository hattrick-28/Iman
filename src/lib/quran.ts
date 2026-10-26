// Bundled Quran content. Built by scripts/build-content.py.
// Arabic: Uthmani text (Quran Academy, from Tanzil). Translations keep their translators' rights.
import meta from '@/assets/quran/meta.json';

export type Chapter = { n: number; name: string; ar: string; en: string; count: number; place: string };
export type TranslationId = 'sq_ahmeti' | 'sq_nahi';

export const TOTAL_AYAHS = 6236;
export const chapters = meta.chapters as Chapter[];

export const TRANSLATIONS: { id: TranslationId; label: string; credit: string }[] = [
  { id: 'sq_ahmeti', label: 'Shqip · Sherif Ahmeti', credit: 'Përkthimi: Sherif Ahmeti' },
  { id: 'sq_nahi', label: 'Shqip · Hassan Nahi', credit: 'Përkthimi: Hassan Nahi' },
];

// First ayah_key of each surah (1-based keys, 1..6236).
const starts: number[] = [];
{
  let k = 1;
  for (const c of chapters) {
    starts.push(k);
    k += c.count;
  }
}

export function keyOf(surah: number, ayah: number): number {
  return starts[surah - 1] + ayah - 1;
}

export function refOf(key: number): { surah: number; ayah: number } {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= key) lo = mid;
    else hi = mid - 1;
  }
  return { surah: lo + 1, ayah: key - starts[lo] + 1 };
}

export const chapterOf = (key: number) => chapters[refOf(key).surah - 1];
export const pageOf = (key: number) => (meta.page as number[])[key - 1];
export const juzOf = (key: number) => (meta.juz as number[])[key - 1];
export const lettersOf = (key: number) => (meta.letters as number[])[key - 1];
export const hasanatOf = (key: number) => lettersOf(key) * 10;

export function label(key: number): string {
  const { surah, ayah } = refOf(key);
  return `${chapters[surah - 1].name} ${surah}:${ayah}`;
}

// Large texts load on first use (Metro evaluates inline requires lazily).
let ar: string[] | null = null;
let translit: string[] | null = null;
const tr: Partial<Record<TranslationId, string[]>> = {};

export function arabic(key: number): string {
  ar ??= require('@/assets/quran/ar.json') as string[];
  return ar[key - 1];
}

export function transliteration(key: number): string {
  translit ??= require('@/assets/quran/translit.json') as string[];
  return translit[key - 1];
}

export function translation(id: TranslationId, key: number): string {
  if (!tr[id]) {
    tr[id] = (id === 'sq_nahi' ? require('@/assets/quran/sq_nahi.json') : require('@/assets/quran/sq_ahmeti.json')) as string[];
  }
  return tr[id]![key - 1];
}

// Pages read, as a share of each mushaf page (matches ayah_meta.page_share on the server).
const perPage: Record<number, number> = {};
for (const p of meta.page as number[]) perPage[p] = (perPage[p] ?? 0) + 1;
export function pagesBetween(from: number, to: number): number {
  let s = 0;
  for (let k = from; k <= to; k++) s += 1 / perPage[pageOf(k)];
  return Math.round(s * 100) / 100;
}

export function lettersBetween(from: number, to: number): number {
  let s = 0;
  for (let k = from; k <= to; k++) s += lettersOf(k);
  return s;
}

// Ayah of the day: the same verse for everyone on a given date.
const DAILY_POOL = [
  [13, 28], [2, 286], [94, 5], [65, 3], [2, 152], [3, 139], [39, 53], [2, 186], [29, 69], [16, 97],
  [3, 159], [93, 3], [94, 6], [20, 25], [40, 60], [57, 4], [8, 46], [2, 153], [3, 173], [12, 87],
  [42, 30], [17, 82], [33, 41], [49, 13], [24, 22], [31, 18], [25, 63], [7, 56], [11, 115], [28, 77],
] as const;
export function ayahOfTheDay(d = new Date()): number {
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const [s, a] = DAILY_POOL[day % DAILY_POOL.length];
  return keyOf(s, a);
}

// Search Albanian translation text (simple, accent-insensitive).
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`-]/g, '');
export function search(q: string, id: TranslationId, limit = 50): number[] {
  const needle = fold(q.trim());
  if (needle.length < 2) return [];
  const out: number[] = [];
  translation(id, 1);
  const list = tr[id]!;
  for (let i = 0; i < list.length && out.length < limit; i++) if (fold(list[i]).includes(needle)) out.push(i + 1);
  return out;
}
