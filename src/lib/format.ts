export function fmtTime(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} orë ${m % 60} min`;
}

export function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Albanian grouping (1 000 000). Done by hand: Intl locale data for 'sq' is missing on some devices.
export const fmtNum = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

// Reading levels: each level needs a few more minutes than the last (2, 4, 6, … minutes).
export function levelFromMinutes(total: number) {
  let level = 1;
  let need = 2;
  let left = total;
  while (left >= need) {
    left -= need;
    level++;
    need += 2;
  }
  return { level, into: left, need };
}
