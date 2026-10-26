// Server-only features. Each returns null/false when offline or signed out.
import { CONFIG } from './config';
import { supabase } from './supabase';

export async function joinChallengeRemote(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return; // level challenges are local only
  await supabase.rpc('join_challenge', { p_challenge: id });
}

export type BoardRow = { rank: number; user_id: string; display_name: string; country: string | null; verses: number; seconds: number; is_me: boolean };

export async function leaderboard(scope: 'friends' | 'global' | 'region'): Promise<BoardRow[] | null> {
  const { data, error } = await supabase.rpc('leaderboard', { p_scope: scope });
  return error ? null : (data as BoardRow[]);
}

export async function setLeaderboardOptIn(on: boolean, opts: { shareName: boolean; country: string | null }) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  if (!on) return !(await supabase.from('leaderboard_optins').delete().eq('user_id', data.user.id)).error;
  const { error } = await supabase
    .from('leaderboard_optins')
    .upsert({ user_id: data.user.id, share_name: opts.shareName, share_photo: false, country: opts.country });
  return !error;
}

export async function createInvite(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase.from('invites').insert({ inviter_id: u.user.id }).select('code').single();
  return error ? null : `${CONFIG.websiteUrl}/fto/${data.code}`;
}

export async function acceptInvite(code: string) {
  const { error } = await supabase.rpc('accept_invite', { p_code: code.trim() });
  return !error;
}

export async function communityStats(): Promise<{ reading_now: number; verses_today: number } | null> {
  const { data, error } = await supabase.rpc('community_stats');
  return error ? null : (data as { reading_now: number; verses_today: number });
}

export async function heartbeat() {
  await supabase.rpc('heartbeat');
}

export async function deleteAccount(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  const res = await fetch(`${CONFIG.supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: CONFIG.supabaseKey },
  }).catch(() => null);
  return !!res && res.ok;
}

// ---------------------------------------------------------------------------
// Assistant
// ---------------------------------------------------------------------------
export type Citation = {
  n: number;
  id: string;
  source: 'quran' | 'hadith';
  ref: string;
  label: string;
  collection: string;
  grade: string | null;
  graded_by: string | null;
  arabic: string | null;
  translation: string | null;
  translator: string | null;
  ayah_key: number | null;
};
export type AskResult = {
  thread_id: string;
  message_id: string;
  answer: string;
  citations: Citation[];
  safety: 'crisis' | 'refer_scholar' | 'out_of_scope' | null;
  remaining: number;
};

export async function ask(message: string, threadId: string | null): Promise<AskResult | { error: string }> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { error: 'signin' };
  try {
    const res = await fetch(`${CONFIG.supabaseUrl}/functions/v1/ask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: CONFIG.supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, thread_id: threadId, lang: 'sq' }),
    });
    if (res.status === 429) return { error: 'limit' };
    if (!res.ok) return { error: 'server' };
    return (await res.json()) as AskResult;
  } catch {
    return { error: 'offline' };
  }
}

export async function reportAnswer(messageId: string, reason: string, detail: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { error } = await supabase.from('chat_reports').insert({ message_id: messageId, user_id: data.user.id, reason, detail });
  return !error;
}
