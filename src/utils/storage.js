import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  HIGH_SCORES: 'high_scores',
  SETTINGS: 'settings',
};

// Lưu high score
export const saveHighScore = async (difficulty, score, accuracy) => {
  try {
    const existing = await getHighScores();
    const newRecord = {
      score,
      accuracy,
      date: new Date().toISOString(),
    };

    // Chỉ lưu nếu điểm cao hơn
    if (!existing[difficulty] || score > existing[difficulty].score) {
      existing[difficulty] = newRecord;
      await AsyncStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(existing));
      return true; // Kỷ lục mới!
    }
    return false;
  } catch (error) {
    console.error('Error saving high score:', error);
    return false;
  }
};

// Lấy tất cả high scores
export const getHighScores = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.HIGH_SCORES);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting high scores:', error);
    return {};
  }
};

// Lấy high score theo độ khó
export const getHighScoreByDifficulty = async (difficulty) => {
  try {
    const scores = await getHighScores();
    return scores[difficulty] || null;
  } catch (error) {
    console.error('Error getting high score:', error);
    return null;
  }
};

// Xóa tất cả high scores
export const clearHighScores = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.HIGH_SCORES);
    return true;
  } catch (error) {
    console.error('Error clearing high scores:', error);
    return false;
  }
};

// Lưu settings
export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

// Lấy settings
export const getSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : {
      soundEnabled: true,
      vibrationEnabled: true,
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return {
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }
};

export default {
  saveHighScore,
  getHighScores,
  getHighScoreByDifficulty,
  clearHighScores,
  saveSettings,
  getSettings,
};
