import * as SQLite from 'expo-sqlite';

let db;

export const defaultState = {
  player: {
    name: '',
    onboarded: false,
    level: 1,
    xp: 0,
    coins: 0,
    strength: 1,
    endurance: 1,
    discipline: 1,
    streak: 0,
    startWeight: 123,
    currentWeight: 123,
    goalWeight: 88,
    waterGoal: 3,
  },
  completed: {},
  rewardedTasks: {},
  randomQuest: {},
  weightHistory: [],
  exerciseHistory: {},
  unlockedAchievements: {},
  claimedBosses: {},
  rewardedDays: {},
  stats: {
    totalTasks: 0,
    workouts: 0,
    bosses: 0,
  },
  shopRewards: [],
  purchases: [],
  settings: {
    notificationsEnabled: false,
  },
  lastCompletedDay: null,
};

async function openDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('system_ascension.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }
  return db;
}

function mergeState(parsed = {}) {
  return {
    ...defaultState,
    ...parsed,
    player: { ...defaultState.player, ...(parsed.player || {}) },
    stats: { ...defaultState.stats, ...(parsed.stats || {}) },
    settings: { ...defaultState.settings, ...(parsed.settings || {}) },
    completed: parsed.completed || {},
    rewardedTasks: parsed.rewardedTasks || {},
    randomQuest: parsed.randomQuest || {},
    weightHistory: Array.isArray(parsed.weightHistory) ? parsed.weightHistory : [],
    exerciseHistory: parsed.exerciseHistory || {},
    unlockedAchievements: parsed.unlockedAchievements || {},
    claimedBosses: parsed.claimedBosses || {},
    rewardedDays: parsed.rewardedDays || {},
    shopRewards: Array.isArray(parsed.shopRewards) ? parsed.shopRewards : [],
    purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
  };
}

export async function loadState() {
  const database = await openDb();
  const row = await database.getFirstAsync('SELECT value FROM app_state WHERE key = ?', 'main');
  if (!row?.value) return defaultState;
  try {
    return mergeState(JSON.parse(row.value));
  } catch {
    return defaultState;
  }
}

export async function persistState(next) {
  const database = await openDb();
  await database.runAsync(
    'INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    'main',
    JSON.stringify(next)
  );
}

export async function resetState() {
  const database = await openDb();
  await database.runAsync('DELETE FROM app_state WHERE key = ?', 'main');
}
