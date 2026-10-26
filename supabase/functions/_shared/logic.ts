// Pure logic shared by the "ask" Edge Function and the corpus import script.
// No Deno or Node APIs here, so it can be unit-tested anywhere.

export type Grade = 'sahih' | 'hasan' | 'daif' | 'mawdu' | 'ungraded';

/** Conservative reading of a grade string: fabricated > weak > hasan > sahih. */
export function normalizeGrade(raw: string | null | undefined): Grade {
  const g = (raw ?? '').toLowerCase().replace(/[`'’ʿ]/g, '');
  if (!g.trim()) return 'ungraded';
  if (/(mawdu|maudu|mawdoo|fabricat|batil|baatil|no basis)/.test(g)) return 'mawdu';
  if (/(daif|da if|weak|munkar|shadh|matruk)/.test(g)) return 'daif';
  if (/hasan/.test(g)) return 'hasan';
  if (/sahih|saheeh|authentic/.test(g)) return 'sahih';
  return 'ungraded';
}

export const SAHIH_COLLECTIONS: Record<string, string> = { bukhari: 'Sahih al-Bukhari', muslim: 'Sahih Muslim' };

/** Pick the grade for a hadith: whole-collection sahih for Bukhari/Muslim, otherwise Al-Albani, else the first grader. */
export function gradeHadith(collection: string, grades: { name: string; grade: string }[] | undefined): { grade: Grade; by: string | null } {
  if (SAHIH_COLLECTIONS[collection]) return { grade: 'sahih', by: SAHIH_COLLECTIONS[collection] };
  const list = grades ?? [];
  const albani = list.find((g) => /albani/i.test(g.name));
  const pick = albani ?? list[0];
  if (!pick) return { grade: 'ungraded', by: null };
  return { grade: normalizeGrade(pick.grade), by: pick.name };
}

export const COLLECTION_SQ: Record<string, string> = {
  bukhari: 'Buhariu', muslim: 'Muslimi', abudawud: 'Ebu Davudi', tirmidhi: 'Tirmidhiu',
  nasai: 'Nesaiu', ibnmajah: 'Ibn Maxhe', malik: 'Muvatta e Malikut', nawawi: '40 hadithet e Neveviut', qudsi: 'Hadithe kudsije',
};

export type Triage = { category: 'normal' | 'crisis' | 'ruling' | 'out_of_scope'; queries: string[] };

/** Parse the triage model's JSON, tolerating code fences and stray text. Never throws. */
export function parseTriage(text: string, fallbackQuery: string): Triage {
  const m = /\{[\s\S]*\}/.exec(text);
  try {
    const j = JSON.parse(m ? m[0] : text) as Partial<Triage>;
    const cats = ['normal', 'crisis', 'ruling', 'out_of_scope'] as const;
    const category = cats.includes(j.category as (typeof cats)[number]) ? (j.category as Triage['category']) : 'normal';
    const queries = Array.isArray(j.queries) ? j.queries.filter((q) => typeof q === 'string' && q.trim()).map((q) => q.trim().slice(0, 300)).slice(0, 3) : [];
    return { category, queries: queries.length ? queries : [fallbackQuery] };
  } catch {
    return { category: 'normal', queries: [fallbackQuery] };
  }
}

/**
 * Keep only citations to passages that were actually retrieved, renumber them 1..n in order
 * of first use, and drop any marker that points nowhere. The model never gets to invent a source.
 */
export function finalizeCitations(answer: string, available: number): { text: string; used: number[] } {
  const used: number[] = [];
  const text = answer
    .replace(/\[(?:P)?(\d+)(?:\s*,\s*(?:P)?(\d+))*\]/g, (whole) => {
      const nums = [...whole.matchAll(/(\d+)/g)].map((x) => Number(x[1]));
      const out: string[] = [];
      for (const n of nums) {
        if (n < 1 || n > available) continue;
        let i = used.indexOf(n);
        if (i === -1) { used.push(n); i = used.length - 1; }
        out.push(`[${i + 1}]`);
      }
      return out.join('');
    })
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return { text, used };
}

export const CRISIS_PREFIX =
  'Më vjen shumë keq që po kalon këtë. Nëse je në rrezik tani, të lutem telefono menjëherë 112 ose fol me dikë që i beson, një mjek ose një hoxhë. Nuk je vetëm.';

export const OUT_OF_SCOPE =
  'Imani përgjigjet vetëm për pyetje që lidhen me fenë, jetën dhe shqetësimet e tua në dritën e Kur\'anit dhe Sunetit. Më trego si mund të të ndihmoj nga ky këndvështrim.';
