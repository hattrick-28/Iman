// Streak rules, identical to recompute_streak() / streak_status() in the database:
// a day counts when its goal is met (local time); one freeze is banked per week (max 2),
// a missed day uses one; paused days neither break nor extend a streak.

export type Pause = { from: string; until: string }; // ISO dates, inclusive
export type StreakState = { current: number; longest: number; lastMet: string | null; freezes: number };
export type StreakStatus = { current: number; longest: number; freezes: number; metToday: boolean; atRisk: boolean };

const DAY = 86400000;
export const toDay = (iso: string) => Math.round(Date.parse(iso + 'T00:00:00Z') / DAY);
export const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

// Monday-based week number, like Postgres date_trunc('week').
const weekOf = (day: number) => Math.floor((day + 3) / 7);

export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function pausedDays(pauses: Pause[], d1: number, d2: number): number {
  let n = 0;
  for (const p of pauses) {
    const a = Math.max(toDay(p.from), d1);
    const b = Math.min(toDay(p.until), d2);
    if (b >= a) n += b - a + 1;
  }
  return n;
}

export function computeStreak(metDates: string[], pauses: Pause[]): StreakState {
  const days = [...new Set(metDates)].map(toDay).sort((a, b) => a - b);
  let cur = 0;
  let best = 0;
  let last: number | null = null;
  let fz = 1;
  for (const d of days) {
    if (last === null) cur = 1;
    else {
      fz = Math.min(2, fz + (weekOf(d) - weekOf(last)));
      const missed = d - last - 1 - pausedDays(pauses, last + 1, d - 1);
      if (missed <= 0) cur += 1;
      else if (missed <= fz) {
        fz -= missed;
        cur += 1;
      } else cur = 1;
    }
    best = Math.max(best, cur);
    last = d;
  }
  return { current: cur, longest: best, lastMet: last === null ? null : fromDay(last), freezes: fz };
}

export function streakStatus(s: StreakState, today: string, pauses: Pause[]): StreakStatus {
  if (!s.lastMet) return { current: 0, longest: 0, freezes: 1, metToday: false, atRisk: false };
  const t = toDay(today);
  const l = toDay(s.lastMet);
  const fz = Math.min(2, s.freezes + (weekOf(t) - weekOf(l)));
  const missed = Math.max(0, t - l - 1 - pausedDays(pauses, l + 1, t - 1));
  if (l >= t - 1 || missed <= fz) {
    return { current: s.current, longest: s.longest, freezes: fz - missed, metToday: l === t, atRisk: missed > 0 };
  }
  return { current: 0, longest: s.longest, freezes: fz, metToday: false, atRisk: false };
}
