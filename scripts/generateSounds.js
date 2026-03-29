/**
 * Script tạo file âm thanh WAV đơn giản cho StarshipMath
 * Chạy: node scripts/generateSounds.js
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const OUTPUT_DIR = path.join(__dirname, '../assets/sounds');

function generateWav(filename, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);       // PCM
  buffer.writeUInt16LE(1, 22);       // Mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byteRate
  buffer.writeUInt16LE(2, 32);       // blockAlign
  buffer.writeUInt16LE(16, 34);      // bitsPerSample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
  console.log(`✓ Generated: ${filename}`);
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

function envelope(t, duration, attack = 0.01, release = 0.1) {
  if (t < attack) return t / attack;
  if (t > duration - release) return (duration - t) / release;
  return 1;
}

// 1. correct.wav - Arpeggio vui nhộn C5-E5-G5
function makeCorrect() {
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const noteDuration = 0.12;
  const totalDuration = noteDuration * notes.length + 0.08;
  const numSamples = Math.floor(SAMPLE_RATE * totalDuration);
  const samples = new Float32Array(numSamples);

  notes.forEach((freq, i) => {
    const start = Math.floor(i * noteDuration * SAMPLE_RATE);
    const end = Math.floor((i * noteDuration + noteDuration) * SAMPLE_RATE);
    for (let j = start; j < end && j < numSamples; j++) {
      const t = (j - start) / SAMPLE_RATE;
      const env = envelope(t, noteDuration, 0.005, 0.04);
      // Thêm harmonic cho âm thanh cute hơn
      samples[j] += (sine(freq, t) * 0.6 + sine(freq * 2, t) * 0.25 + sine(freq * 3, t) * 0.1) * env * 0.5;
    }
  });

  generateWav('correct.wav', samples);
}

// 2. wrong.wav - Tiếng "boing" xuống
function makeWrong() {
  const duration = 0.3;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Glide xuống từ 300Hz -> 120Hz
    const freq = 300 - 600 * t;
    const env = envelope(t, duration, 0.005, 0.15);
    samples[i] = (sine(freq, t) * 0.7 + sine(freq * 1.5, t) * 0.2) * env * 0.6;
  }

  generateWav('wrong.wav', samples);
}

// 3. timeout.wav - 3 tiếng beep nhanh
function makeTimeout() {
  const beepDuration = 0.08;
  const gap = 0.05;
  const totalDuration = (beepDuration + gap) * 3;
  const numSamples = Math.floor(SAMPLE_RATE * totalDuration);
  const samples = new Float32Array(numSamples);

  for (let b = 0; b < 3; b++) {
    const start = Math.floor(b * (beepDuration + gap) * SAMPLE_RATE);
    const end = Math.floor((b * (beepDuration + gap) + beepDuration) * SAMPLE_RATE);
    const freq = 440 - b * 60; // Xuống dần
    for (let j = start; j < end && j < numSamples; j++) {
      const t = (j - start) / SAMPLE_RATE;
      const env = envelope(t, beepDuration, 0.005, 0.03);
      samples[j] = sine(freq, t) * env * 0.5;
    }
  }

  generateWav('timeout.wav', samples);
}

// 4. tap.wav - Click nhẹ nhàng
function makeTap() {
  const duration = 0.06;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 40);
    // Click = sine ngắn + noise nhỏ
    samples[i] = (sine(800, t) * 0.5 + (Math.random() * 2 - 1) * 0.1) * env * 0.4;
  }

  generateWav('tap.wav', samples);
}

// 5. complete.wav - Fanfare chiến thắng
function makeComplete() {
  // C5-E5-G5-C6 arpeggio rồi chord
  const arpNotes = [523.25, 659.25, 783.99, 1046.5];
  const noteDuration = 0.1;
  const chordDuration = 0.4;
  const totalDuration = noteDuration * arpNotes.length + chordDuration;
  const numSamples = Math.floor(SAMPLE_RATE * totalDuration);
  const samples = new Float32Array(numSamples);

  // Arpeggio
  arpNotes.forEach((freq, i) => {
    const start = Math.floor(i * noteDuration * SAMPLE_RATE);
    const end = Math.floor((i * noteDuration + noteDuration) * SAMPLE_RATE);
    for (let j = start; j < end && j < numSamples; j++) {
      const t = (j - start) / SAMPLE_RATE;
      const env = envelope(t, noteDuration, 0.005, 0.03);
      samples[j] += (sine(freq, t) * 0.6 + sine(freq * 2, t) * 0.2) * env * 0.4;
    }
  });

  // Chord cuối C major
  const chordStart = Math.floor(arpNotes.length * noteDuration * SAMPLE_RATE);
  const chordNotes = [523.25, 659.25, 783.99, 1046.5];
  for (let j = chordStart; j < numSamples; j++) {
    const t = (j - chordStart) / SAMPLE_RATE;
    const env = envelope(t, chordDuration, 0.01, 0.2);
    let val = 0;
    chordNotes.forEach(freq => {
      val += (sine(freq, t) * 0.5 + sine(freq * 2, t) * 0.15) * (1 / chordNotes.length);
    });
    samples[j] += val * env * 0.5;
  }

  generateWav('complete.wav', samples);
}

// 6. newRecord.wav - Chuỗi âm sao rơi vui nhộn
function makeNewRecord() {
  const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
  const noteDuration = 0.08;
  const totalDuration = noteDuration * notes.length + 0.2;
  const numSamples = Math.floor(SAMPLE_RATE * totalDuration);
  const samples = new Float32Array(numSamples);

  notes.forEach((freq, i) => {
    const start = Math.floor(i * noteDuration * SAMPLE_RATE);
    const end = Math.floor((i * noteDuration + noteDuration + 0.05) * SAMPLE_RATE);
    for (let j = start; j < end && j < numSamples; j++) {
      const t = (j - start) / SAMPLE_RATE;
      const env = envelope(t, noteDuration + 0.05, 0.005, 0.08);
      samples[j] += (sine(freq, t) * 0.5 + sine(freq * 2, t) * 0.3 + sine(freq * 3, t) * 0.1) * env * 0.35;
    }
  });

  generateWav('newRecord.wav', samples);
}

// 7. countdown.wav - Tiếng tick khi đếm ngược
function makeCountdown() {
  const duration = 0.08;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, duration, 0.003, 0.04);
    samples[i] = sine(1200, t) * env * 0.35;
  }

  generateWav('countdown.wav', samples);
}

// Run
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUTPUT_DIR}`);
}

makeCorrect();
makeWrong();
makeTimeout();
makeTap();
makeComplete();
makeNewRecord();
makeCountdown();

console.log('\n✅ Tất cả file âm thanh đã được tạo trong assets/sounds/');