// Cấu hình độ khó
export const DIFFICULTY_CONFIG = {
  easy: {
    name: 'Sao Kim',
    emoji: '🌟',
    description: '5-6 tuổi',
    maxNumber: 10,
    operations: ['+'],
    timePerQuestion: 15,
    questionsCount: 5,
    color: '#00E5FF',
  },
  medium: {
    name: 'Sao Mộc',
    emoji: '🪐',
    description: '7-8 tuổi',
    maxNumber: 100,
    operations: ['+', '-'],
    timePerQuestion: 12,
    questionsCount: 5,
    color: '#FF4DB8',
  },
  hard: {
    name: 'Sao Hỏa',
    emoji: '🔥',
    description: '9-10 tuổi',
    maxNumber: 1000,
    operations: ['×'],
    timePerQuestion: 5,
    questionsCount: 5,
    color: '#FF6D3B',
  },
  expert: {
    name: 'Sao Thổ',
    emoji: '💎',
    description: '10+ tuổi',
    maxNumber: 1000,
    operations: ['×', '÷'],
    timePerQuestion: 2,
    questionsCount: 5,
    color: '#AA44FF',
  },
  universe: {
    name: 'Hố Đen',
    emoji: '🌌',
    description: 'Ultimate Challenge',
    maxNumber: 9999,
    operations: ['+', '-', '×', '÷'],
    timePerQuestion: 1.5,
    questionsCount: 30,
    color: '#8B5CF6',
  },
};

// Tạo số ngẫu nhiên trong khoảng
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Tạo câu hỏi toán
export const generateQuestion = (difficulty, operandMultiplier = 1) => {
  const config = DIFFICULTY_CONFIG[difficulty];
  const operation = config.operations[randomInt(0, config.operations.length - 1)];

  let num1, num2, answer;

  switch (operation) {
    case '+':
      num1 = randomInt(1, config.maxNumber * operandMultiplier);
      num2 = randomInt(1, config.maxNumber * operandMultiplier);
      answer = num1 + num2;
      break;

    case '-':
      // Đảm bảo kết quả không âm
      num1 = randomInt(1, config.maxNumber * operandMultiplier);
      num2 = randomInt(0, num1);
      answer = num1 - num2;
      break;

    case '×':
      // Giới hạn để kết quả không quá lớn
      const maxMultiplier = Math.min(12, Math.floor(config.maxNumber / 2));
      num1 = randomInt(2, maxMultiplier * operandMultiplier);
      num2 = randomInt(2, maxMultiplier);
      answer = num1 * num2;
      break;

    case '÷':
      // Đảm bảo kết quả là số nguyên
      num2 = randomInt(2, 12 * operandMultiplier);
      answer = randomInt(1, 12);
      num1 = num2 * answer;
      break;

    default:
      num1 = randomInt(1, config.maxNumber) * operandMultiplier;
      num2 = randomInt(1, config.maxNumber) * operandMultiplier;
      answer = num1 + num2;
  }

  // Tạo các đáp án sai
  const wrongAnswers = generateWrongAnswers(answer, config.maxNumber);

  // Trộn đáp án
  const allAnswers = shuffleArray([answer, ...wrongAnswers]);

  return {
    num1,
    num2,
    operation,
    answer,
    options: allAnswers,
    questionText: `${num1} ${operation} ${num2} = ?`,
  };
};

// Tạo 3 đáp án sai
const generateWrongAnswers = (correctAnswer, maxNumber) => {
  const wrongAnswers = new Set();

  while (wrongAnswers.size < 3) {
    // Tạo đáp án sai gần với đáp án đúng
    let wrong;
    const variance = Math.max(5, Math.floor(correctAnswer * 0.3));

    if (Math.random() > 0.5) {
      wrong = correctAnswer + randomInt(1, variance);
    } else {
      wrong = Math.max(0, correctAnswer - randomInt(1, variance));
    }

    // Đảm bảo không trùng đáp án đúng và không âm
    if (wrong !== correctAnswer && wrong >= 0) {
      wrongAnswers.add(wrong);
    }
  }

  return Array.from(wrongAnswers);
};

// Trộn mảng (Fisher-Yates shuffle)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Tính điểm
export const calculateScore = (isCorrect, timeLeft, maxTime) => {
  if (!isCorrect) return 0;

  // Điểm cơ bản + bonus thời gian
  const baseScore = 10;
  const timeBonus = Math.floor((timeLeft / maxTime) * 10);

  return baseScore + timeBonus;
};

// Tính rank dựa trên accuracy
export const getRank = (accuracy) => {
  if (accuracy >= 95) return { rank: 'S', emoji: '👑', title: 'Thiên tài!' };
  if (accuracy >= 85) return { rank: 'A', emoji: '🏆', title: 'Xuất sắc!' };
  if (accuracy >= 70) return { rank: 'B', emoji: '🎯', title: 'Giỏi lắm!' };
  if (accuracy >= 50) return { rank: 'C', emoji: '💪', title: 'Cố gắng hơn!' };
  return { rank: 'D', emoji: '📚', title: 'Cần luyện tập!' };
};

export default {
  DIFFICULTY_CONFIG,
  generateQuestion,
  calculateScore,
  getRank,
};
