export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function yesterdayKey() {
  return dateKey(addDays(new Date(), -1));
}

export function xpToLevel(level) {
  return 100 + (level - 1) * 35;
}

export function rankFor(level) {
  if (level >= 50) return 'S';
  if (level >= 35) return 'A';
  if (level >= 20) return 'B';
  if (level >= 10) return 'C';
  if (level >= 5) return 'D';
  return 'E';
}

export function weekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(d, diffToMonday);
  return dateKey(monday);
}

export function weekDates(date = new Date()) {
  const monday = parseDateKey(weekKey(date));
  return Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
}

export function monthCalendar(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const first = new Date(y, m, 1, 12);
  const last = new Date(y, m + 1, 0, 12);
  const mondayIndex = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < mondayIndex; i += 1) cells.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    const current = new Date(y, m, day, 12);
    cells.push({ day, key: dateKey(current), date: current });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function dayTaskCount(completedForDay = {}) {
  return Object.values(completedForDay).filter(Boolean).length;
}

export function applyXp(player, amount) {
  let level = player.level;
  let xp = Math.max(0, player.xp + amount);
  while (xp >= xpToLevel(level)) {
    xp -= xpToLevel(level);
    level += 1;
  }
  return { ...player, xp, level };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
