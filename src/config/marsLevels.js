// Mars: connect-the-dots puzzle. User drags from dot 1 → 2 → 3 → … → N.
// Movement is 8-directional (king moves). Path may not cross itself.
//
// Each level defines:
//   - grid: { rows, cols }
//   - dots: ordered array of { r, c } — index 0 is "1", index 1 is "2", …
// 10 levels with increasing dots and grid size.

export const MARS_LEVELS = [
  // Level 1 — 4 dots, 4×4
  {
    level: 1,
    grid: { rows: 4, cols: 4 },
    dots: [
      { r: 0, c: 0 }, { r: 0, c: 3 },
      { r: 3, c: 3 }, { r: 3, c: 0 },
    ],
  },
  // Level 2 — 5 dots, 4×4
  {
    level: 2,
    grid: { rows: 4, cols: 4 },
    dots: [
      { r: 0, c: 1 }, { r: 1, c: 3 }, { r: 3, c: 3 },
      { r: 3, c: 0 }, { r: 1, c: 0 },
    ],
  },
  // Level 3 — 6 dots, 5×5
  {
    level: 3,
    grid: { rows: 5, cols: 5 },
    dots: [
      { r: 0, c: 0 }, { r: 0, c: 4 }, { r: 2, c: 4 },
      { r: 4, c: 4 }, { r: 4, c: 0 }, { r: 2, c: 0 },
    ],
  },
  // Level 4 — 7 dots, 5×5 (zigzag)
  {
    level: 4,
    grid: { rows: 5, cols: 5 },
    dots: [
      { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 2, c: 2 },
      { r: 1, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 2 }, { r: 3, c: 0 },
    ],
  },
  // Level 5 — 8 dots, 6×6
  {
    level: 5,
    grid: { rows: 6, cols: 6 },
    dots: [
      { r: 0, c: 0 }, { r: 0, c: 5 }, { r: 2, c: 5 },
      { r: 2, c: 0 }, { r: 5, c: 0 }, { r: 5, c: 5 },
      { r: 3, c: 3 }, { r: 4, c: 1 },
    ],
  },
  // Level 6 — 9 dots, 6×6
  {
    level: 6,
    grid: { rows: 6, cols: 6 },
    dots: [
      { r: 0, c: 1 }, { r: 1, c: 4 }, { r: 0, c: 5 },
      { r: 3, c: 5 }, { r: 5, c: 5 }, { r: 5, c: 2 },
      { r: 5, c: 0 }, { r: 3, c: 0 }, { r: 2, c: 2 },
    ],
  },
  // Level 7 — 10 dots, 7×7
  {
    level: 7,
    grid: { rows: 7, cols: 7 },
    dots: [
      { r: 0, c: 0 }, { r: 0, c: 6 }, { r: 2, c: 4 },
      { r: 3, c: 6 }, { r: 6, c: 6 }, { r: 4, c: 3 },
      { r: 6, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 1 }, { r: 1, c: 3 },
    ],
  },
  // Level 8 — 11 dots, 7×7
  {
    level: 8,
    grid: { rows: 7, cols: 7 },
    dots: [
      { r: 0, c: 3 }, { r: 1, c: 6 }, { r: 4, c: 6 },
      { r: 6, c: 5 }, { r: 6, c: 2 }, { r: 4, c: 0 },
      { r: 1, c: 0 }, { r: 2, c: 2 }, { r: 3, c: 4 },
      { r: 5, c: 3 }, { r: 5, c: 5 },
    ],
  },
  // Level 9 — 12 dots, 8×8
  {
    level: 9,
    grid: { rows: 8, cols: 8 },
    dots: [
      { r: 0, c: 0 }, { r: 0, c: 7 }, { r: 2, c: 5 },
      { r: 3, c: 7 }, { r: 5, c: 7 }, { r: 7, c: 7 },
      { r: 7, c: 4 }, { r: 7, c: 0 }, { r: 5, c: 0 },
      { r: 4, c: 3 }, { r: 3, c: 1 }, { r: 1, c: 3 },
    ],
  },
  // Level 10 — 14 dots, 8×8 (zigzag)
  {
    level: 10,
    grid: { rows: 8, cols: 8 },
    dots: [
      { r: 0, c: 0 }, { r: 0, c: 7 }, { r: 1, c: 5 },
      { r: 2, c: 7 }, { r: 3, c: 5 }, { r: 4, c: 7 },
      { r: 5, c: 5 }, { r: 6, c: 7 }, { r: 7, c: 5 },
      { r: 7, c: 0 }, { r: 5, c: 0 }, { r: 3, c: 0 },
      { r: 1, c: 0 }, { r: 2, c: 3 },
    ],
  },
];

// Visual themes — Mars-native + Jupiter shared themes.
// Rotate every 2 levels: 0,1 → theme0; 2,3 → theme1; …
export const MARS_THEMES = [
  {
    id: 'space',
    name: 'Space',
    bg: ['#050510', '#0f0f2a', '#050510'],
    cellBg: 'rgba(124, 58, 237, 0.06)',
    cellBorder: 'rgba(124, 58, 237, 0.18)',
    pathColor: '#A78BFA',
    pathGlow: '#7C3AED',
    dotColor: '#A78BFA',
    dotInner: '#fff',
    numberColor: '#fff',
  },
  {
    id: 'lava',
    name: 'Lava',
    bg: ['#1a0500', '#3a0d00', '#1a0500'],
    cellBg: 'rgba(251, 146, 60, 0.06)',
    cellBorder: 'rgba(251, 146, 60, 0.22)',
    pathColor: '#FB923C',
    pathGlow: '#F97316',
    dotColor: '#FBBF24',
    dotInner: '#1a0500',
    numberColor: '#1a0500',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bg: ['#001a2a', '#003855', '#001a2a'],
    cellBg: 'rgba(56, 189, 248, 0.06)',
    cellBorder: 'rgba(56, 189, 248, 0.2)',
    pathColor: '#38BDF8',
    pathGlow: '#0EA5E9',
    dotColor: '#7DD3FC',
    dotInner: '#001a2a',
    numberColor: '#001a2a',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: ['#022c22', '#053f30', '#022c22'],
    cellBg: 'rgba(52, 211, 153, 0.07)',
    cellBorder: 'rgba(52, 211, 153, 0.22)',
    pathColor: '#34D399',
    pathGlow: '#10B981',
    dotColor: '#A7F3D0',
    dotInner: '#022c22',
    numberColor: '#022c22',
  },
  {
    id: 'candy',
    name: 'Candy',
    bg: ['#2a0820', '#4a0d36', '#2a0820'],
    cellBg: 'rgba(244, 114, 182, 0.07)',
    cellBorder: 'rgba(244, 114, 182, 0.22)',
    pathColor: '#F472B6',
    pathGlow: '#EC4899',
    dotColor: '#FBCFE8',
    dotInner: '#2a0820',
    numberColor: '#2a0820',
  },
  // ── Jupiter shared themes ───────────────────────────────────────────────
  {
    id: 'neon',
    name: 'Neon',
    bg: ['#000008', '#04001c', '#080038'],
    cellBg: 'rgba(52, 211, 153, 0.05)',
    cellBorder: 'rgba(52, 211, 153, 0.22)',
    pathColor: '#34D399',
    pathGlow: '#10B981',
    dotColor: '#34D399',
    dotInner: '#000008',
    numberColor: '#000008',
  },
  {
    id: 'bubble',
    name: 'Bubble',
    bg: ['#0a0a1f', '#1a0a3a', '#0a0a1f'],
    cellBg: 'rgba(125, 211, 252, 0.06)',
    cellBorder: 'rgba(196, 181, 253, 0.25)',
    pathColor: '#7DD3FC',
    pathGlow: '#C4B5FD',
    dotColor: '#FDE047',
    dotInner: '#0a0a1f',
    numberColor: '#0a0a1f',
  },
  {
    id: 'ice',
    name: 'Ice',
    bg: ['#001828', '#003245', '#001828'],
    cellBg: 'rgba(165, 243, 252, 0.06)',
    cellBorder: 'rgba(103, 232, 249, 0.25)',
    pathColor: '#67E8F9',
    pathGlow: '#22D3EE',
    dotColor: '#A5F3FC',
    dotInner: '#001828',
    numberColor: '#001828',
  },
  {
    id: 'lava-jupiter',
    name: 'Lava',
    bg: ['#1a0a00', '#3a1500', '#1a0a00'],
    cellBg: 'rgba(252, 211, 77, 0.06)',
    cellBorder: 'rgba(252, 211, 77, 0.25)',
    pathColor: '#FACC15',
    pathGlow: '#FB923C',
    dotColor: '#FDE047',
    dotInner: '#1a0a00',
    numberColor: '#1a0a00',
  },
];

export const themeForLevel = (level) =>
  MARS_THEMES[Math.floor((level - 1) / 2) % MARS_THEMES.length];

// ── Bank: 10 puzzles per level, increasing difficulty ────────────────────
// User must clear 5 puzzles to advance the level. Puzzles are picked at
// random (no-repeat within a session) from the bank.
import { generateBank } from '../utils/marsBankGenerator';

export const PUZZLES_PER_LEVEL = 10;
export const PUZZLES_TO_ADVANCE = 5;

const _bankCache = new Map();

export const getMarsBank = (level) => {
  if (_bankCache.has(level)) return _bankCache.get(level);
  const cfg = MARS_LEVELS.find(l => l.level === level);
  if (!cfg) return [];
  const bank = generateBank({
    level,
    rows: cfg.grid.rows,
    cols: cfg.grid.cols,
    dotCount: cfg.dots.length,
    size: PUZZLES_PER_LEVEL,
  });
  // Fallback: ensure the original hand-designed puzzle is always at index 0
  // so we never end up with an empty bank.
  if (bank.length === 0) {
    bank.push({ dots: cfg.dots });
  }
  _bankCache.set(level, bank);
  return bank;
};
