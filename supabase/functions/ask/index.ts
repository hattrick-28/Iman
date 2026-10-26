// "Pyet Imanin": answers only from retrieved Quran verses and sahih/hasan hadith.
// Secrets (supabase secrets set ...): ANTHROPIC_API_KEY, VOYAGE_API_KEY
// Optional: ASSISTANT_MODEL, TRIAGE_MODEL, VOYAGE_MODEL
import { createClient } from 'npm:@supabase/supabase-js@2';

import { COLLECTION_SQ, CRISIS_PREFIX, finalizeCitations, OUT_OF_SCOPE, parseTriage, type Triage } from '../_shared/logic.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const VOYAGE_KEY = Deno.env.get('VOYAGE_API_KEY') ?? '';
const ANSWER_MODEL = Deno.env.get('ASSISTANT_MODEL') ?? 'claude-sonnet-5-5';
const TRIAGE_MODEL = Deno.env.get('TRIAGE_MODEL') ?? 'claude-haiku-5-5';
const VOYAGE_MODEL = Deno.env.get('VOYAGE_MODEL') ?? 'voyage-3.5';
const FREE_LIMIT = 3;
const PREMIUM_LIMIT = 50;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const TRIAGE_SYSTEM = `You route questions for an Islamic guidance app used mostly by Albanian speakers.
Return ONLY JSON: {"category": "...", "queries": ["...", "...", "..."]}
category:
- "crisis": the person may be in danger (self-harm, suicide, abuse, violence, medical emergency).
- "ruling": asks for a specific fiqh ruling on their own case (divorce, inheritance, finance, validity of worship, medical/halal decisions).
- "out_of_scope": not about faith, ethics, life guidance or Islam (e.g. coding, homework, sports, attacking a group).
- "normal": everything else.
queries: up to 3 short search queries for finding relevant Quran verses and hadith: one in Albanian, one in English, one in Arabic. Use key concepts, not the full question.`;

const ANSWER_SYSTEM = `You are "Iman", a gentle Islamic guidance assistant inside a Quran app for Albanian-speaking Muslims.

Strict rules:
1. Base every religious statement ONLY on the PASSAGES given in the user turn. After each sentence that relies on a passage, cite it like [P3]. Cite only passage numbers that exist.
2. Never quote the Quran or hadith word for word from memory. Briefly paraphrase the meaning and cite; the app shows the exact text from its database.
3. If the passages do not address the question, say clearly that you did not find a relevant source in Iman's library, and suggest asking a trusted imam or scholar. Do not fill the gap from memory.
4. No fatwas. For rulings on someone's specific situation, present what the passages say, note that scholars may differ in details, and recommend a qualified local scholar.
5. Never declare anyone a disbeliever, never insult other faiths, sects or groups, never promise anyone Paradise or Hell, and never mention hasanat counts or rewards earned.
6. If the person may be in danger, begin with warmth and urge them to contact emergency services (112) or a trusted person or doctor now; then offer hope from the passages.
7. Reply in the user's language (Albanian by default) in a warm, humble tone. Keep it under 220 words, in short paragraphs, plain text, no headings or lists unless needed. Say "Allahu" and add ﷺ after mentioning the Prophet.`;

async function claude(model: string, system: string, messages: { role: 'user' | 'assistant'; content: string }[], maxTokens: number) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, system, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  return { text, usage: data.usage as { input_tokens: number; output_tokens: number } };
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${VOYAGE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: 'query', output_dimension: 1024 }),
  });
  if (!res.ok) throw new Error(`voyage ${res.status}`);
  const data = await res.json();
  return (data.data as { embedding: number[] }[]).map((d) => d.embedding);
}

type Row = { id: string; source: 'quran' | 'hadith'; ref: string; collection: string; grade: string | null; graded_by: string | null; lang: string; translator: string; body: string; ayah_from: number | null };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!ANTHROPIC_KEY || !VOYAGE_KEY) return json({ error: 'not_configured' }, 503);

  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) return json({ error: 'auth' }, 401);
  const uid = u.user.id;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { message?: string; thread_id?: string | null };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const message = (body.message ?? '').trim();
  if (!message || message.length > 1500) return json({ error: 'bad_message' }, 400);

  const { data: allowed } = await admin.rpc('take_chat_quota', { uid });
  if (!allowed) return json({ error: 'limit' }, 429);

  try {
    // Thread
    let threadId = body.thread_id ?? null;
    if (threadId) {
      const { data: t } = await admin.from('chat_threads').select('id').eq('id', threadId).eq('user_id', uid).maybeSingle();
      if (!t) threadId = null;
    }
    if (!threadId) {
      const { data: t, error } = await admin.from('chat_threads').insert({ user_id: uid, title: message.slice(0, 80) }).select('id').single();
      if (error) throw error;
      threadId = t.id;
    }
    const { data: history } = await admin.from('chat_messages').select('role, content').eq('thread_id', threadId).order('created_at', { ascending: false }).limit(6);
    const past = (history ?? []).reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Triage
    let triage: Triage = { category: 'normal', queries: [message] };
    try {
      const t = await claude(TRIAGE_MODEL, TRIAGE_SYSTEM, [{ role: 'user', content: message }], 300);
      triage = parseTriage(t.text, message);
    } catch { /* keep default */ }

    let answer = '';
    let citations: unknown[] = [];
    let citedIds: string[] = [];
    let usage = { input_tokens: 0, output_tokens: 0 };
    const safety = triage.category === 'normal' ? null : triage.category === 'ruling' ? 'refer_scholar' : triage.category;

    if (triage.category === 'out_of_scope') {
      answer = OUT_OF_SCOPE;
    } else {
      // Retrieve: Quran + sahih/hasan hadith, by meaning and by words
      const queries = [...new Set([message, ...triage.queries])].slice(0, 4);
      const vectors = await embed(queries);
      const best = new Map<string, { row: Row; score: number }>();
      for (let i = 0; i < queries.length; i++) {
        const { data } = await admin.rpc('match_passages', { p_embedding: vectors[i], p_query: queries[i], p_langs: ['sq', 'en'], p_k: 8 });
        for (const r of (data ?? []) as (Row & { score: number })[]) {
          const k = `${r.source}:${r.ref}`;
          if (!best.has(k) || best.get(k)!.score < r.score) best.set(k, { row: r, score: r.score });
        }
      }
      const top = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 10);
      const refs = top.map((t) => t.row.ref);
      const { data: all } = refs.length
        ? await admin.from('corpus_passages').select('id, source, ref, collection, grade, graded_by, lang, translator, body, ayah_from').in('ref', refs)
        : { data: [] as Row[] };
      const passages = top.map(({ row }) => {
        const same = (all as Row[]).filter((r) => r.ref === row.ref && r.source === row.source);
        const tr = same.find((r) => r.lang === 'sq') ?? same.find((r) => r.lang === 'en') ?? row;
        const ar = same.find((r) => r.lang === 'ar');
        return { main: tr, arabic: ar?.body ?? null };
      });

      const block = passages.length
        ? passages.map((p, i) => {
            const r = p.main;
            const head = r.source === 'quran' ? `Quran ${r.ref}` : `${COLLECTION_SQ[r.collection] ?? r.collection} ${r.ref.split(':')[1]} (grade: ${r.grade}, ${r.graded_by ?? ''})`;
            return `[P${i + 1}] ${head}\n${r.body}`;
          }).join('\n\n')
        : '(no relevant passages found)';

      const userTurn = `PASSAGES:\n${block}\n\n${triage.category === 'crisis' ? 'NOTE: the person may be in danger.\n' : ''}${triage.category === 'ruling' ? 'NOTE: this asks for a specific ruling; do not issue a fatwa.\n' : ''}QUESTION:\n${message}`;
      const out = await claude(ANSWER_MODEL, ANSWER_SYSTEM, [...past, { role: 'user', content: userTurn }], 900);
      usage = out.usage;
      const fin = finalizeCitations(out.text, passages.length);
      answer = fin.text;
      if (triage.category === 'crisis' && !answer.includes('112')) answer = `${CRISIS_PREFIX}\n\n${answer}`;

      citations = fin.used.map((n, i) => {
        const p = passages[n - 1];
        const r = p.main;
        return {
          n: i + 1, id: r.id, source: r.source, ref: r.ref,
          label: r.source === 'quran' ? `Kur'ani ${r.ref}` : `${COLLECTION_SQ[r.collection] ?? r.collection} ${r.ref.split(':')[1]}`,
          collection: r.collection, grade: r.grade, graded_by: r.graded_by,
          arabic: p.arabic, translation: r.body, translator: r.translator || null, ayah_key: r.ayah_from,
        };
      });
      citedIds = fin.used.map((n) => passages[n - 1].main.id);
    }

    await admin.from('chat_messages').insert({ thread_id: threadId, user_id: uid, role: 'user', content: message });
    const { data: saved, error: saveErr } = await admin.from('chat_messages').insert({
      thread_id: threadId, user_id: uid, role: 'assistant', content: answer, citations: citedIds, safety,
      model: ANSWER_MODEL, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens,
    }).select('id').single();
    if (saveErr) throw saveErr;
    await admin.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);

    const { data: premium } = await admin.rpc('is_premium', { uid });
    const { data: usageRow } = await admin.from('chat_usage').select('messages').eq('user_id', uid).eq('utc_date', new Date().toISOString().slice(0, 10)).maybeSingle();
    const remaining = Math.max(0, (premium ? PREMIUM_LIMIT : FREE_LIMIT) - (usageRow?.messages ?? 0));

    return json({ thread_id: threadId, message_id: saved.id, answer, citations, safety, remaining });
  } catch (e) {
    console.error('ask failed', e instanceof Error ? e.message : e);
    return json({ error: 'server' }, 500);
  }
});
