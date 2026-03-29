import { Audio } from 'expo-av';

// Preload tất cả âm thanh một lần khi app khởi động
const soundObjects = {};
let isLoaded = false;
let isMuted = false;

const SOUNDS = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  timeout: require('../../assets/sounds/timeout.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  newRecord: require('../../assets/sounds/newRecord.wav'),
  countdown: require('../../assets/sounds/countdown.wav'),
};

export async function loadSounds() {
  if (isLoaded) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    await Promise.all(
      Object.entries(SOUNDS).map(async ([key, source]) => {
        const { sound } = await Audio.Sound.createAsync(source, {
          volume: 0.8,
          shouldPlay: false,
        });
        soundObjects[key] = sound;
      })
    );
    isLoaded = true;
  } catch (e) {
    // Âm thanh không bắt buộc - app vẫn chạy nếu lỗi
    console.warn('Sound load failed:', e);
  }
}

export async function playSound(name) {
  if (isMuted || !soundObjects[name]) return;
  try {
    await soundObjects[name].setPositionAsync(0);
    await soundObjects[name].playAsync();
  } catch (e) {
    // Bỏ qua lỗi phát âm thanh
  }
}

export function setMuted(muted) {
  isMuted = muted;
}

export function getMuted() {
  return isMuted;
}

const _autoUnload = (sound) => {
  sound.setOnPlaybackStatusUpdate(async (s) => {
    if (s.didJustFinish) await sound.unloadAsync();
  });
};

export async function playGameOver() {
  if (isMuted) return;
  // Layer 1 — low deep howl (wrong.wav slowed to 42%)
  try {
    const { sound: s1 } = await Audio.Sound.createAsync(
      require('../../assets/sounds/wrong.wav'),
      { shouldPlay: true, rate: 0.42, shouldCorrectPitch: false, volume: 1.0 }
    );
    _autoUnload(s1);
  } catch (e) {}
  // Layer 2 — thin wailing overtone (timeout.wav slowed to 55%), slight delay
  setTimeout(async () => {
    if (isMuted) return;
    try {
      const { sound: s2 } = await Audio.Sound.createAsync(
        require('../../assets/sounds/timeout.wav'),
        { shouldPlay: true, rate: 0.55, shouldCorrectPitch: false, volume: 0.65 }
      );
      _autoUnload(s2);
    } catch (e) {}
  }, 180);
}

export async function unloadSounds() {
  await Promise.all(
    Object.values(soundObjects).map(sound => sound.unloadAsync())
  );
  isLoaded = false;
}