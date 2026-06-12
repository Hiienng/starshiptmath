import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCoin } from './itemStorage';

const STREAK_KEY       = 'streak_days_v1';
const LAST_PLAYED_KEY  = 'streak_last_played_v1';
const DAILY_DONE_KEY   = 'daily_challenge_done_v1';
const DAILY_BONUS_KEY  = 'daily_bonus_count_v1';  // rewarded ad bonus, max 3/day

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10); // "2026-04-07"

// ── Streak ────────────────────────────────────────────────────────────────────

export const getStreak = async () => {
  try {
    const val = await AsyncStorage.getItem(STREAK_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
};

/**
 * Call this every time user completes a game.
 * Returns { streak, milestoneReached, coinsAwarded }
 */
export const recordPlay = async () => {
  try {
    const today    = todayStr();
    const last     = await AsyncStorage.getItem(LAST_PLAYED_KEY);
    const streakVal = await AsyncStorage.getItem(STREAK_KEY);
    let streak = streakVal ? parseInt(streakVal, 10) : 0;

    if (last === today) {
      // Already played today — no change
      return { streak, milestoneReached: false, coinsAwarded: 0 };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    if (last === yStr) {
      streak += 1; // consecutive day
    } else {
      streak = 1;  // streak reset
    }

    await AsyncStorage.setItem(STREAK_KEY, String(streak));
    await AsyncStorage.setItem(LAST_PLAYED_KEY, today);

    // Milestone reward every 7 days
    const milestone = streak % 7 === 0;
    let coinsAwarded = 0;
    if (milestone) {
      coinsAwarded = 5;
      await addCoin(5);
    }

    return { streak, milestoneReached: milestone, coinsAwarded };
  } catch {
    return { streak: 0, milestoneReached: false, coinsAwarded: 0 };
  }
};

/** Returns true if user hasn't played yet today (streak at risk) */
export const isStreakAtRisk = async () => {
  try {
    const last = await AsyncStorage.getItem(LAST_PLAYED_KEY);
    if (!last) return false;
    return last !== todayStr();
  } catch { return false; }
};

// ── Daily Challenge ───────────────────────────────────────────────────────────

export const isDailyChallengeCompleted = async () => {
  try {
    const val = await AsyncStorage.getItem(DAILY_DONE_KEY);
    return val === todayStr();
  } catch { return false; }
};

export const completeDailyChallenge = async () => {
  try {
    const already = await isDailyChallengeCompleted();
    if (already) return { alreadyDone: true, coinsAwarded: 0 };
    await AsyncStorage.setItem(DAILY_DONE_KEY, todayStr());
    await addCoin(3);
    return { alreadyDone: false, coinsAwarded: 3 };
  } catch { return { alreadyDone: true, coinsAwarded: 0 }; }
};

/**
 * Generate today's daily challenge difficulty using date as seed.
 * Returns a difficulty key: 'easy' | 'medium' | 'hard' | 'expert' | 'universe'
 */
export const getDailyChallengeDifficulty = () => {
  const today = todayStr().replace(/-/g, '');
  const seed  = parseInt(today, 10);
  const difficulties = ['easy', 'medium', 'hard', 'expert'];
  return difficulties[seed % difficulties.length];
};

// ── Daily Bonus (rewarded ad, max 3/day) ─────────────────────────────────────

export const getDailyBonusCount = async () => {
  try {
    const data = await AsyncStorage.getItem(DAILY_BONUS_KEY);
    if (!data) return 0;
    const { date, count } = JSON.parse(data);
    if (date !== todayStr()) return 0;
    return count;
  } catch { return 0; }
};

export const recordDailyBonus = async () => {
  try {
    const current = await getDailyBonusCount();
    if (current >= 3) return { ok: false, count: current };
    const next = current + 1;
    await AsyncStorage.setItem(DAILY_BONUS_KEY, JSON.stringify({ date: todayStr(), count: next }));
    return { ok: true, count: next };
  } catch { return { ok: false, count: 0 }; }
};
