// Jupiter mode — 10 levels
// Each tile has a bucket: 'good' (+, ×) or 'bad' (−, ÷)
// All tiles in a single spawn row share the SAME bucket — so the user never
// faces "+10 vs −5" at the same time. The choice is which good or which bad.

const G = (label, value, extra = {}) => ({ label, value, bucket: 'good', ...extra });
const B = (label, value, extra = {}) => ({ label, value, bucket: 'bad',  ...extra });

export const JUPITER_LEVELS = [
  {
    level: 1,
    title: 'Level 1',
    cols: 2,
    duration: 30000,
    fallDuration: 6500,
    spawnInterval: 2600,
    // bucket weights — bad tiles appear ~50% of the time
    bucketWeights: { good: 1, bad: 1 },
    pools: [
      [
        G('+5',  5),
        G('+10', 10),
        G('×2',  2, { isMultiplier: true }),
        B('−3',  -3),
        B('−5',  -5),
        B('÷2',  2, { isDivisor: true }),
      ],
      [
        G('+8',  8),
        G('+12', 12),
        G('×2',  2, { isMultiplier: true }),
        B('−4',  -4),
        B('−6',  -6),
        B('÷2',  2, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 30,
    startsAt: 5,
  },
  {
    level: 2,
    title: 'Level 2',
    cols: 2,
    duration: 60000,
    fallDuration: 6000,    // slightly faster than L1 (7s → 6s)
    spawnInterval: 2200,
    bucketWeights: { good: 1, bad: 1.2 },
    pools: [
      [
        G('+10', 10),
        G('+15', 15),
        G('×2',  2, { isMultiplier: true }),
        G('×3',  3, { isMultiplier: true }),
        B('−8',  -8),
        B('−12', -12),
        B('÷2',  2, { isDivisor: true }),
        B('÷3',  3, { isDivisor: true }),
      ],
      [
        G('+12', 12),
        G('+18', 18),
        G('×2',  2, { isMultiplier: true }),
        G('×3',  3, { isMultiplier: true }),
        B('−10', -10),
        B('−15', -15),
        B('÷2',  2, { isDivisor: true }),
        B('÷3',  3, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 200,
    startsAt: 8,
  },
  {
    level: 3,
    title: 'Level 3',
    cols: 2,
    duration: 120000,
    fallDuration: 5000,
    spawnInterval: 1900,
    bucketWeights: { good: 1, bad: 1.3 },
    pools: [
      [
        G('+20', 20),
        G('×2',  2, { isMultiplier: true }),
        G('×3',  3, { isMultiplier: true }),
        B('−15', -15),
        B('÷2',  2, { isDivisor: true }),
        B('÷3',  3, { isDivisor: true }),
      ],
      [
        G('+25', 25),
        G('×2',  2, { isMultiplier: true }),
        G('×3',  3, { isMultiplier: true }),
        B('−18', -18),
        B('÷2',  2, { isDivisor: true }),
        B('÷3',  3, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 500,
    startsAt: 10,
  },
  {
    level: 4,
    title: 'Level 4',
    cols: 3,
    duration: 240000,
    fallDuration: 6500,        // very slow — easing into 3 cols
    spawnInterval: 2400,
    bucketWeights: { good: 1.3, bad: 1 },
    pools: [
      [
        G('+15', 15), G('×2', 2, { isMultiplier: true }),
        B('−10', -10), B('÷2', 2, { isDivisor: true }),
      ],
      [
        G('+20', 20), G('×2', 2, { isMultiplier: true }),
        B('−12', -12), B('÷2', 2, { isDivisor: true }),
      ],
      [
        G('+18', 18), G('×2', 2, { isMultiplier: true }),
        B('−15', -15), B('÷2', 2, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 300,
    startsAt: 10,
  },
  {
    level: 5,
    title: 'Level 5',
    cols: 3,
    duration: 360000,
    fallDuration: 5500,
    spawnInterval: 2000,
    bucketWeights: { good: 1.1, bad: 1 },
    pools: [
      [
        G('+20', 20), G('×2', 2, { isMultiplier: true }), G('×3', 3, { isMultiplier: true }),
        B('−15', -15), B('÷2', 2, { isDivisor: true }), B('÷3', 3, { isDivisor: true }),
      ],
      [
        G('+25', 25), G('×2', 2, { isMultiplier: true }), G('×3', 3, { isMultiplier: true }),
        B('−18', -18), B('÷2', 2, { isDivisor: true }), B('÷3', 3, { isDivisor: true }),
      ],
      [
        G('+22', 22), G('×3', 3, { isMultiplier: true }),
        B('−20', -20), B('÷2', 2, { isDivisor: true }), B('÷3', 3, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 500,
    startsAt: 10,
  },
  {
    level: 6,
    title: 'Level 6',
    cols: 3,
    duration: 360000,
    fallDuration: 5000,
    spawnInterval: 1700,
    bucketWeights: { good: 1, bad: 1.4 },
    pools: [
      [
        G('+25', 25), G('×2', 2, { isMultiplier: true }), G('×3', 3, { isMultiplier: true }),
        B('−20', -20), B('÷2', 2, { isDivisor: true }), B('÷3', 3, { isDivisor: true }),
      ],
      [
        G('+30', 30), G('×3', 3, { isMultiplier: true }), G('×4', 4, { isMultiplier: true }),
        B('−25', -25), B('÷2', 2, { isDivisor: true }), B('÷3', 3, { isDivisor: true }),
      ],
      [
        G('+35', 35), G('×2', 2, { isMultiplier: true }), G('×3', 3, { isMultiplier: true }),
        B('−30', -30), B('÷2', 2, { isDivisor: true }), B('÷3', 3, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 800,
    startsAt: 10,
  },
  {
    level: 7,
    title: 'Level 7',
    cols: 3,
    duration: 360000,
    fallDuration: 4500,
    spawnInterval: 1500,
    bucketWeights: { good: 1, bad: 1.5 },
    pools: [
      [
        G('+30', 30), G('×3', 3, { isMultiplier: true }), G('×4', 4, { isMultiplier: true }),
        B('−25', -25), B('÷2', 2, { isDivisor: true }), B('÷3', 3, { isDivisor: true }),
      ],
      [
        G('+40', 40), G('×3', 3, { isMultiplier: true }), G('×4', 4, { isMultiplier: true }),
        B('−30', -30), B('÷3', 3, { isDivisor: true }), B('÷4', 4, { isDivisor: true }),
      ],
      [
        G('+35', 35), G('×3', 3, { isMultiplier: true }), G('×5', 5, { isMultiplier: true }),
        B('−35', -35), B('÷2', 2, { isDivisor: true }), B('÷4', 4, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 1500,
    startsAt: 12,
  },
  {
    level: 8,
    title: 'Level 8',
    cols: 3,
    duration: 360000,
    fallDuration: 4100,
    spawnInterval: 1300,
    bucketWeights: { good: 1, bad: 1.5 },
    pools: [
      [
        G('+40', 40), G('×4', 4, { isMultiplier: true }), G('×5', 5, { isMultiplier: true }),
        B('−35', -35), B('÷3', 3, { isDivisor: true }), B('÷4', 4, { isDivisor: true }),
      ],
      [
        G('+50', 50), G('×4', 4, { isMultiplier: true }), G('×5', 5, { isMultiplier: true }),
        B('−45', -45), B('÷3', 3, { isDivisor: true }), B('÷5', 5, { isDivisor: true }),
      ],
      [
        G('+45', 45), G('×3', 3, { isMultiplier: true }), G('×6', 6, { isMultiplier: true }),
        B('−40', -40), B('÷4', 4, { isDivisor: true }), B('÷5', 5, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 3000,
    startsAt: 15,
  },
  {
    level: 9,
    title: 'Level 9',
    cols: 3,
    duration: 360000,
    fallDuration: 3800,
    spawnInterval: 1100,
    bucketWeights: { good: 1, bad: 1.6 },
    pools: [
      [
        G('+60', 60), G('×5', 5, { isMultiplier: true }), G('×6', 6, { isMultiplier: true }),
        B('−50', -50), B('÷4', 4, { isDivisor: true }), B('÷5', 5, { isDivisor: true }),
      ],
      [
        G('+70', 70), G('×5', 5, { isMultiplier: true }), G('×7', 7, { isMultiplier: true }),
        B('−60', -60), B('÷4', 4, { isDivisor: true }), B('÷5', 5, { isDivisor: true }),
      ],
      [
        G('+50', 50), G('×6', 6, { isMultiplier: true }), G('×8', 8, { isMultiplier: true }),
        B('−55', -55), B('÷3', 3, { isDivisor: true }), B('÷6', 6, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 8000,
    startsAt: 20,
  },
  {
    level: 10,
    title: 'Level 10',
    cols: 3,
    duration: 360000,
    fallDuration: 3500,
    spawnInterval: 950,
    bucketWeights: { good: 1, bad: 1.7 },
    pools: [
      [
        G('+80', 80), G('×6', 6, { isMultiplier: true }), G('×8', 8, { isMultiplier: true }),
        B('−70', -70), B('÷4', 4, { isDivisor: true }), B('÷6', 6, { isDivisor: true }),
      ],
      [
        G('+100', 100), G('×7', 7, { isMultiplier: true }), G('×8', 8, { isMultiplier: true }),
        B('−80', -80), B('÷5', 5, { isDivisor: true }), B('÷6', 6, { isDivisor: true }),
      ],
      [
        G('+90', 90), G('×6', 6, { isMultiplier: true }), G('×9', 9, { isMultiplier: true }),
        B('−90', -90), B('÷4', 4, { isDivisor: true }), B('÷7', 7, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 20000,
    startsAt: 20,
  },
  {
    level: 11,
    title: 'Level 11',
    cols: 3,
    duration: 360000,
    fallDuration: 3200,
    spawnInterval: 800,
    bucketWeights: { good: 1, bad: 1.8 },
    pools: [
      [
        G('+150', 150), G('×8',  8,  { isMultiplier: true }), G('×10', 10, { isMultiplier: true }),
        B('−120', -120), B('÷5', 5, { isDivisor: true }), B('÷8',  8, { isDivisor: true }),
      ],
      [
        G('+200', 200), G('×9',  9,  { isMultiplier: true }), G('×10', 10, { isMultiplier: true }),
        B('−150', -150), B('÷6', 6, { isDivisor: true }), B('÷8',  8, { isDivisor: true }),
      ],
      [
        G('+180', 180), G('×8',  8,  { isMultiplier: true }), G('×12', 12, { isMultiplier: true }),
        B('−180', -180), B('÷5', 5, { isDivisor: true }), B('÷9',  9, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 60000,
    startsAt: 25,
  },
  {
    level: 12,
    title: 'Level 12',
    cols: 3,
    duration: 360000,
    fallDuration: 2900,
    spawnInterval: 700,
    bucketWeights: { good: 1, bad: 2 },
    pools: [
      [
        G('+300', 300), G('×10', 10, { isMultiplier: true }), G('×12', 12, { isMultiplier: true }),
        B('−250', -250), B('÷6',  6,  { isDivisor: true }), B('÷10', 10, { isDivisor: true }),
      ],
      [
        G('+400', 400), G('×12', 12, { isMultiplier: true }), G('×15', 15, { isMultiplier: true }),
        B('−300', -300), B('÷8',  8,  { isDivisor: true }), B('÷10', 10, { isDivisor: true }),
      ],
      [
        G('+350', 350), G('×10', 10, { isMultiplier: true }), G('×15', 15, { isMultiplier: true }),
        B('−350', -350), B('÷5',  5,  { isDivisor: true }), B('÷12', 12, { isDivisor: true }),
      ],
    ],
    scoreThreshold: 200000,
    startsAt: 30,
  },
];
