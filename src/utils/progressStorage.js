import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOTAL_STAGES } from './decimalGenerator';

const KEY = 'decimal_stage_progress';
const SNAPSHOT_KEY = 'decimal_stage_snapshot'; // mid-game state for resume-on-exit

// Returns Set of unlocked stageIds; stage 1 always unlocked
export const getUnlockedStages = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [1];
    if (!arr.includes(1)) arr.push(1);
    return new Set(arr);
  } catch {
    return new Set([1]);
  }
};

export const unlockNextStage = async (completedStageId) => {
  try {
    const unlocked = await getUnlockedStages();
    const next = completedStageId + 1;
    if (next <= TOTAL_STAGES && !unlocked.has(next)) {
      unlocked.add(next);
      await AsyncStorage.setItem(KEY, JSON.stringify([...unlocked]));
    }
  } catch {}
};

export const getHighestUnlockedStage = async () => {
  const unlocked = await getUnlockedStages();
  return Math.max(...unlocked);
};

// ── Mid-game snapshot (resume on voluntary exit) ──────────────────────────────

export const saveStageSnapshot = async (snapshot) => {
  try {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {}
};

export const loadStageSnapshot = async (stageId) => {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    return snap.stageId === stageId ? snap : null;
  } catch { return null; }
};

export const clearStageSnapshot = async () => {
  try { await AsyncStorage.removeItem(SNAPSHOT_KEY); } catch {}
};
