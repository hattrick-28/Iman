#!/usr/bin/env node
// Loads the assistant's library into Supabase: Quran (Arabic + Albanian) and hadith
// (Arabic + English) with grades. Only translation rows are embedded (Arabic rows are
// stored for display), which keeps the embedding cost down.
//
// 1. Get the data (public domain datasets, but each text keeps its translator's rights):
//    git clone --depth 1 --filter=blob:none --sparse https://github.com/fawazahmed0/quran-api.git
//    (cd quran-api && git sparse-checkout set --no-cone /info.json /editions/ara-quranacademy.json /editions/sqi-sherifahmeti.json)
//    git clone --depth 1 --filter=blob:none --sparse https://github.com/fawazahmed0/hadith-api.git
//    (cd hadith-api && git sparse-checkout set --no-cone $(for c in bukhari muslim abudawud tirmidhi nasai ibnmajah; do echo /editions/eng-$c.json /editions/ara-$c.json; done))
// 2. Run (service role key: Supabase → Project Settings → API keys; never put it in the app):
//    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... VOYAGE_API_KEY=... \
//      node --experimental-strip-types scripts/ingest-corpus.mjs ./quran-api ./hadith-api [--only quran|hadith] [--from N]
import { readFileSync } from 'node:fs';

import { gradeHadith } from '../supabase/functions/_shared/logic.ts';

const [quranDir, hadithDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const from = process.argv.includes('--from') ? Number(process.argv[process.argv.indexOf('--from') + 1]) : 0;
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY } = process.env;
const VOYAGE_MODEL = process.env.VOYAGE_MODEL ?? 'voyage-3.5';
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VOYAGE_API_KEY || !quranDir) {
  console.error('Missing env or paths. See the header of this file.');
  process.exit(1);
}

const COLLECTIONS = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'];
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function quranRows() {
  const ar = read(`${quranDir}/editions/ara-quranacademy.json`).quran;
  const sq = read(`${quranDir}/editions/sqi-sherifahmeti.json`).quran;
  const rows = [];
  ar.forEach((v, i) => {
    const ref = `${v.chapter}:${v.verse}`;
    const key = i + 1;
    rows.push({ source: 'quran', ref, collection: 'quran', ayah_from: key, ayah_to: key, lang: 'ar', translator: '', body: v.text, licence: 'Tanzil / Quran Academy Uthmani text, unmodified, credited', embed: false });
    rows.push({ source: 'quran', ref, collection: 'quran', ayah_from: key, ayah_to: key, lang: 'sq', translator: 'Sherif Ahmeti', body: sq[i].text, licence: 'Sherif Ahmeti translation via Tanzil; confirm rights holder permission', embed: true });
  });
  return rows;
}

function hadithRows() {
  const rows = [];
  for (const c of COLLECTIONS) {
    const en = read(`${hadithDir}/editions/eng-${c}.json`).hadiths;
    const arList = read(`${hadithDir}/editions/ara-${c}.json`).hadiths;
    const ar = new Map(arList.map((h) => [h.hadithnumber, h]));
    for (const h of en) {
      const text = (h.text ?? '').trim();
      if (!text) continue;
      const { grade, by } = gradeHadith(c, h.grades);
      const ref = `${c}:${h.hadithnumber}`;
      const base = { source: 'hadith', ref, collection: c, ayah_from: null, ayah_to: null, grade, graded_by: by };
      rows.push({ ...base, lang: 'en', translator: 'English (sunnah.com sources)', body: text, licence: 'fawazahmed0/hadith-api (Unlicense); translation rights per publisher', embed: grade === 'sahih' || grade === 'hasan' });
      const a = ar.get(h.hadithnumber);
      if (a?.text?.trim()) rows.push({ ...base, lang: 'ar', translator: '', body: a.text.trim(), licence: 'fawazahmed0/hadith-api (Unlicense)', embed: false });
    }
  }
  return rows;
}

async function embed(texts) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${VOYAGE_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: 'document', output_dimension: 1024, truncation: true }),
    });
    if (res.ok) return (await res.json()).data.map((d) => d.embedding);
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
    throw new Error(`voyage ${res.status}: ${await res.text()}`);
  }
  throw new Error('voyage: too many retries');
}

async function upsert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/corpus_passages?on_conflict=ref,lang,translator`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 400)}`);
}

const rows = [...(only === 'hadith' ? [] : quranRows()), ...(only === 'quran' || !hadithDir ? [] : hadithRows())];
const graded = rows.filter((r) => r.source === 'hadith' && r.lang === 'en');
console.log(`rows: ${rows.length} (to embed: ${rows.filter((r) => r.embed).length})`);
if (graded.length) {
  const by = {};
  for (const r of graded) by[r.grade] = (by[r.grade] ?? 0) + 1;
  console.log('hadith grades:', by, '(only sahih and hasan are ever used as evidence)');
}

const BATCH = 64;
for (let i = from; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const toEmbed = batch.filter((r) => r.embed);
  const vectors = toEmbed.length ? await embed(toEmbed.map((r) => r.body)) : [];
  let v = 0;
  const payload = batch.map(({ embed: e, ...r }) => ({ ...r, grade: r.grade ?? null, graded_by: r.graded_by ?? null, embedding: e ? JSON.stringify(vectors[v++]) : null }));
  await upsert(payload);
  if ((i / BATCH) % 20 === 0) console.log(`… ${Math.min(i + BATCH, rows.length)} / ${rows.length}  (resume with --from ${i})`);
}
console.log('done');
