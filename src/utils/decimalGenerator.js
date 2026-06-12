const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const digRange = (d) => {
  if (d === 1) return [1, 9];
  if (d === 2) return [10, 99];
  if (d === 3) return [100, 999];
  return [1000, 9999];
};

// Section colors
const SEC_COLOR = {
  1: '#00E5FF',  // addition  – cyan
  2: '#A78BFA',  // subtraction – purple
  3: '#FB923C',  // multiplication – orange
  4: '#4ADE80',  // division – green
  5: '#F472B6',  // mixed – pink
};

const SEC_NAME = {
  1: 'Addition',
  2: 'Subtraction',
  3: 'Multiplication',
  4: 'Division',
  5: 'Mixed',
};

// ── Stage definitions ─────────────────────────────────────────────────────
// { id, label, section, op, operands, digits, time }
export const DECIMAL_STAGES = [
  // ── Section 1: Addition ──────────────────────────────────────────────────
  { id: 1,  label: '1.1',  section: 1, op: '+',   operands: 2, digits: 1, time: 10 },
  { id: 2,  label: '1.2',  section: 1, op: '+',   operands: 2, digits: 1, time: 8 },
  { id: 3,  label: '1.3',  section: 1, op: '+',   operands: 2, digits: 2, time: 8 },
  { id: 4,  label: '1.4',  section: 1, op: '+',   operands: 2, digits: 2, time: 6 },
  { id: 5,  label: '1.5',  section: 1, op: '+',   operands: 2, digits: 3, time: 8 },
  { id: 6,  label: '1.6',  section: 1, op: '+',   operands: 2, digits: 3, time: 6 },
  { id: 7,  label: '1.7',  section: 1, op: '+',   operands: 2, digits: 4, time: 8 },
  { id: 8,  label: '1.8',  section: 1, op: '+',   operands: 2, digits: 4, time: 6 },
  { id: 9,  label: '1.9',  section: 1, op: '++',  operands: 3, digits: 1, time: 8 },
  { id: 10, label: '1.10', section: 1, op: '++',  operands: 3, digits: 2, time: 8 },
  { id: 11, label: '1.11', section: 1, op: '++',  operands: 3, digits: 2, time: 6 },
  { id: 12, label: '1.12', section: 1, op: '++',  operands: 3, digits: 3, time: 8 },
  { id: 13, label: '1.13', section: 1, op: '++',  operands: 3, digits: 3, time: 6 },
  // ── Section 2: Subtraction ───────────────────────────────────────────────
  { id: 14, label: '2.1',  section: 2, op: '-',   operands: 2, digits: 1, time: 10 },
  { id: 15, label: '2.2',  section: 2, op: '-',   operands: 2, digits: 1, time: 8 },
  { id: 16, label: '2.3',  section: 2, op: '-',   operands: 2, digits: 2, time: 8 },
  { id: 17, label: '2.4',  section: 2, op: '-',   operands: 2, digits: 2, time: 6 },
  { id: 18, label: '2.5',  section: 2, op: '-',   operands: 2, digits: 3, time: 8 },
  { id: 19, label: '2.6',  section: 2, op: '-',   operands: 2, digits: 3, time: 6 },
  { id: 20, label: '2.7',  section: 2, op: '-',   operands: 2, digits: 4, time: 8 },
  { id: 21, label: '2.8',  section: 2, op: '-',   operands: 2, digits: 4, time: 6 },
  // ── Section 3: Multiplication ────────────────────────────────────────────
  { id: 22, label: '3.1',  section: 3, op: '×',   operands: 2, digits: 1, time: 10 },
  { id: 23, label: '3.2',  section: 3, op: '×',   operands: 2, digits: 1, time: 8 },
  { id: 24, label: '3.3',  section: 3, op: '×',   operands: 2, digitsMul: [2,1], time: 10 },
  { id: 25, label: '3.4',  section: 3, op: '×',   operands: 2, digitsMul: [2,1], time: 8 },
  { id: 26, label: '3.5',  section: 3, op: '×',   operands: 2, digitsMul: [2,1], time: 6 },
  { id: 27, label: '3.6',  section: 3, op: '×',   operands: 2, digitsMul: [2,2], time: 10 },
  // ── Section 4: Division ──────────────────────────────────────────────────
  { id: 28, label: '4.1',  section: 4, op: '÷',   operands: 2, digits: 1, time: 10 },
  { id: 29, label: '4.2',  section: 4, op: '÷',   operands: 2, digits: 1, time: 8 },
  { id: 30, label: '4.3',  section: 4, op: '÷',   operands: 2, digits: 2, time: 10 },
  { id: 31, label: '4.4',  section: 4, op: '÷',   operands: 2, digits: 2, time: 8 },
  { id: 32, label: '4.5',  section: 4, op: '÷',   operands: 2, digits: 2, time: 6 },
  { id: 33, label: '4.6',  section: 4, op: '÷',   operands: 2, digits: 3, time: 8 },
  // ── Section 5: Mixed ─────────────────────────────────────────────────────
  { id: 34, label: '5.1',  section: 5, op: 'mix', operands: 2, digits: 1, time: 8 },
  { id: 35, label: '5.2',  section: 5, op: 'mix', operands: 2, digits: 2, time: 8 },
  { id: 36, label: '5.3',  section: 5, op: 'mix', operands: 2, digits: 3, time: 8 },
  { id: 37, label: '5.4',  section: 5, op: 'mix', operands: 3, digits: 2, time: 8 },
  { id: 38, label: '5.5',  section: 5, op: 'mix', operands: 2, digits: 4, time: 6 },
];

DECIMAL_STAGES.forEach(s => {
  s.color = SEC_COLOR[s.section];
  s.sectionName = SEC_NAME[s.section];
});

export const TOTAL_STAGES = DECIMAL_STAGES.length; // 38

export const DECIMAL_STAGE_CONFIG = (stageId) => ({
  timePerQuestion: DECIMAL_STAGES.find(s => s.id === stageId)?.time ?? 7,
  questionsCount: 7,
});

// ── Wrong answer generator ────────────────────────────────────────────────
const makeWrong = (correct) => {
  const result = new Set();
  const s = String(Math.abs(correct));
  const len = s.length;
  const add = (w) => { if (w > 0 && w !== correct && !result.has(w)) result.add(w); };

  // Same last digit (delta = multiple of 10^(len-1))
  const step = Math.max(10, 10 ** (len - 1));
  for (let t = 0; t < 20 && result.size < 1; t++)
    add(correct + (Math.random() > 0.5 ? 1 : -1) * rand(1, 5) * step);

  // Same first digit, different rest
  if (len >= 2) {
    for (let t = 0; t < 20 && result.size < 2; t++) {
      let rest = '';
      for (let i = 1; i < len; i++) rest += String(rand(0, 9));
      if (len > 2 && rest[0] === '0') rest = String(rand(1, 9)) + rest.slice(1);
      add(parseInt(s[0] + rest));
    }
  }

  // Near-miss fill
  const v = Math.max(Math.round(correct * 0.15), 3);
  let tries = 0;
  while (result.size < 3 && tries++ < 200)
    add(correct + (Math.random() > 0.5 ? 1 : -1) * rand(1, v));

  return [...result].slice(0, 3);
};

// ── Question generator ────────────────────────────────────────────────────
export const generateDecimalQuestion = (stageId) => {
  const stage = DECIMAL_STAGES.find(s => s.id === stageId);
  if (!stage) return null;

  const op = stage.op === 'mix'
    ? ['+', '-', '×', '÷'][rand(0, stage.operands === 3 ? 0 : 3)]
    : stage.op;

  let num1, num2, num3 = null, answer, questionText;
  const [lo, hi] = digRange(stage.digits ?? 1);

  switch (op) {
    case '+': {
      num1 = rand(lo, hi); num2 = rand(lo, hi);
      answer = num1 + num2;
      questionText = `${num1} + ${num2} = ?`;
      break;
    }
    case '++': {
      num1 = rand(lo, hi); num2 = rand(lo, hi); num3 = rand(lo, hi);
      answer = num1 + num2 + num3;
      questionText = `${num1} + ${num2} + ${num3} = ?`;
      break;
    }
    case '-': {
      num1 = rand(lo + 1, hi); num2 = rand(lo, num1 - 1);
      answer = num1 - num2;
      questionText = `${num1} − ${num2} = ?`;
      break;
    }
    case '×': {
      const [lo1, hi1] = digRange((stage.digitsMul?.[0]) ?? stage.digits ?? 1);
      const [lo2, hi2] = digRange((stage.digitsMul?.[1]) ?? stage.digits ?? 1);
      num1 = rand(lo1, hi1); num2 = rand(lo2, hi2);
      answer = num1 * num2;
      questionText = `${num1} × ${num2} = ?`;
      break;
    }
    case '÷': {
      // answer is clean integer 2–9, divisor within digit range
      const intAns = rand(2, 9);
      num2 = rand(lo, hi);
      num1 = intAns * num2;
      answer = intAns;
      questionText = `${num1} ÷ ${num2} = ?`;
      break;
    }
    default: return null;
  }

  const options = shuffle([answer, ...makeWrong(answer)]);
  return { num1, num2, num3, operation: op, answer, options, questionText };
};

// ── Pyramid row layout (top = hardest, bottom = easiest) ─────────────────
// Rows from top to bottom: [38], [36,37], [33,34,35], [29-32], [24-28],
//   [19-23], [14-18], [9-13], [4-8], [1-3]
export const PYRAMID_ROWS = [
  [38],
  [36, 37],
  [33, 34, 35],
  [29, 30, 31, 32],
  [24, 25, 26, 27, 28],
  [19, 20, 21, 22, 23],
  [14, 15, 16, 17, 18],
  [9,  10, 11, 12, 13],
  [4,  5,  6,  7,  8],
  [1,  2,  3],
];
