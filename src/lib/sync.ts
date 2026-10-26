// Sends offline readings and settings to Supabase. Safe to call often: the server ignores
// a reading it has already counted (unique client_id), so retries never double count.
import { joinChallengeRemote } from './remote';
import { getState, markSynced, setState } from './store';
import { supabase } from './supabase';

let running = false;

export async function syncNow(): Promise<{ sent: number; failed: number }> {
  if (running) return { sent: 0, failed: 0 };
  running = true;
  let sent = 0;
  let failed = 0;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { sent, failed };

    const s = getState();
    await supabase
      .from('preferences')
      .update({
        goal_unit: s.prefs.goalUnit,
        goal_amount: s.prefs.goalAmount,
        streak_goal: s.prefs.streakGoal,
        translations: [s.prefs.translation],
        show_translation: s.prefs.showTranslation,
        show_transliteration: s.prefs.showTranslit,
        show_hasanat: s.prefs.showHasanat,
        reading_levels: s.prefs.readingLevels,
        font_size: s.prefs.arabicSize,
      })
      .eq('user_id', data.session.user.id);

    for (const id of Object.keys(s.challenges)) await joinChallengeRemote(id);

    const pending = s.sessions.filter((x) => !x.synced).slice(0, 100);
    const done: string[] = [];
    for (const x of pending) {
      const { error } = await supabase.rpc('log_reading', {
        p_client_id: x.clientId,
        p_position_kind: x.kind,
        p_challenge_id: x.challengeId,
        p_start_ayah: x.start,
        p_end_ayah: x.end,
        p_started_at: x.startedAt,
        p_ended_at: x.endedAt,
        p_tz: x.tz,
      });
      if (!error) {
        done.push(x.clientId);
        sent++;
      } else if (['22023', '42501', '23503', 'P0001'].includes(error.code ?? '')) {
        done.push(x.clientId); // rejected for good (too old, bad range, not allowed): don't block the queue
        failed++;
      } else {
        failed++;
        break; // offline or server down: try later
      }
    }
    if (done.length) markSynced(done);

    const { data: ent } = await supabase.from('entitlements').select('status, expires_at').maybeSingle();
    if (ent) {
      const active = ['trial', 'active', 'grace', 'lifetime'].includes(ent.status) && (!ent.expires_at || Date.parse(ent.expires_at) > Date.now());
      setState((st) => (st.premium === active ? st : { ...st, premium: active || st.premium }));
    }
  } catch {
    // offline: the outbox stays and is retried next time
  } finally {
    running = false;
  }
  return { sent, failed };
}
