import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, GRADIENTS } from '../constants/colors';
import {
  DIFFICULTY_CONFIG,
  generateQuestion,
  calculateScore,
} from '../utils/mathGenerator';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

const GameScreen = ({ route, navigation }) => {
  const { difficulty } = route.params;
  const config = DIFFICULTY_CONFIG[difficulty];
  const { t } = useLanguage();

  // Feedback display time: 2 seconds for hard/expert/universe, 1.2 seconds for others
  const feedbackDisplayTime = (difficulty === 'hard' || difficulty === 'expert' || difficulty === 'universe') ? 2000 : 1200;

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameResults, setGameResults] = useState([]);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Timer ref
  const timerRef = useRef(null);

  useEffect(() => {
    generateNewQuestion();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Pulse animation for timer when low
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && !isAnswered) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [timeLeft]);

  useEffect(() => {
    if (isAnswered || !currentQuestion) return;

    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: config.timePerQuestion * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion, isAnswered]);

  const generateNewQuestion = () => {
    const question = generateQuestion(difficulty);
    setCurrentQuestion(question);
    setTimeLeft(config.timePerQuestion);
    setSelectedAnswer(null);
    setIsAnswered(false);

    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleTimeout = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    setGameResults((prev) => [
      ...prev,
      {
        question: currentQuestion.questionText,
        correct: false,
        userAnswer: null,
        correctAnswer: currentQuestion.answer,
        timeUsed: config.timePerQuestion,
      },
    ]);

    shakeAnimation();
    setTimeout(moveToNextQuestion, 1500);
  };

  const handleAnswer = (answer) => {
    if (isAnswered) return;

    setIsAnswered(true);
    setSelectedAnswer(answer);
    clearInterval(timerRef.current);

    const isCorrect = answer === currentQuestion.answer;
    const timeUsed = config.timePerQuestion - timeLeft;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const points = calculateScore(true, timeLeft, config.timePerQuestion);
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);

      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeAnimation();
    }

    setGameResults((prev) => [
      ...prev,
      {
        question: currentQuestion.questionText,
        correct: isCorrect,
        userAnswer: answer,
        correctAnswer: currentQuestion.answer,
        timeUsed,
      },
    ]);

    setTimeout(moveToNextQuestion, feedbackDisplayTime);
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const moveToNextQuestion = () => {
    const nextIndex = questionIndex + 1;

    if (nextIndex >= config.questionsCount) {
      navigation.replace('Result', {
        difficulty,
        score,
        correctCount: correctCount + (selectedAnswer === currentQuestion?.answer ? 1 : 0),
        totalQuestions: config.questionsCount,
        gameResults,
      });
    } else {
      setQuestionIndex(nextIndex);
      generateNewQuestion();
    }
  };

  const getTimerColor = () => {
    const percentage = timeLeft / config.timePerQuestion;
    if (percentage > 0.5) return COLORS.timerNormal;
    if (percentage > 0.25) return COLORS.timerWarning;
    return COLORS.timerDanger;
  };

  const getOperationColor = () => {
    switch (currentQuestion?.operation) {
      case '+': return COLORS.addition;
      case '-': return COLORS.subtraction;
      case '×': return COLORS.multiplication;
      case '÷': return COLORS.division;
      default: return COLORS.primary;
    }
  };

  const getAnswerStyle = (answer) => {
    const baseStyle = [styles.answerButton];

    if (!isAnswered) {
      return baseStyle;
    }

    if (answer === currentQuestion.answer) {
      return [...baseStyle, styles.correctAnswer];
    }

    if (answer === selectedAnswer && answer !== currentQuestion.answer) {
      return [...baseStyle, styles.wrongAnswer];
    }

    return [...baseStyle, styles.disabledAnswer];
  };

  const getFeedbackText = () => {
    if (selectedAnswer === currentQuestion.answer) {
      return `🎉 ${t('correct')}`;
    } else if (selectedAnswer === null) {
      return `⏰ ${t('timeUp')}`;
    } else {
      return `❌ ${t('incorrect')}`;
    }
  };

  if (!currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const timerProgress = timeLeft / config.timePerQuestion;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={styles.backgroundGradient}
      >
        {/* Circular Timer Background */}
        <View style={styles.timerCircleContainer}>
          <View style={[styles.timerCircle, { borderColor: getTimerColor() }]}>
            <Animated.Text
              style={[
                styles.timerNumber,
                { color: getTimerColor(), transform: [{ scale: pulseAnim }] },
              ]}
            >
              {timeLeft}
            </Animated.Text>
          </View>
        </View>

        {/* Mini Header */}
        <View style={styles.miniHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${((questionIndex + 1) / config.questionsCount) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {questionIndex + 1}/{config.questionsCount}
            </Text>
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>{t('score')}</Text>
          </View>
        </View>

        {/* Question Area */}
        <Animated.View
          style={[
            styles.questionArea,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
            },
          ]}
        >
          {/* Operation Badge */}
          <View style={[styles.operationBadge, { backgroundColor: getOperationColor() }]}>
            <Text style={styles.operationText}>{currentQuestion.operation}</Text>
          </View>

          {/* Question */}
          <View style={styles.questionBox}>
            <Text style={styles.questionNumber}>{currentQuestion.num1}</Text>
            <Text style={[styles.questionOperator, { color: getOperationColor() }]}>
              {currentQuestion.operation}
            </Text>
            <Text style={styles.questionNumber}>{currentQuestion.num2}</Text>
          </View>

          <Text style={styles.equalSign}>= ?</Text>

          {/* Feedback */}
          {isAnswered && (
            <View
              style={[
                styles.feedbackBadge,
                {
                  backgroundColor:
                    selectedAnswer === currentQuestion.answer
                      ? COLORS.correctBg
                      : COLORS.wrongBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.feedbackText,
                  {
                    color:
                      selectedAnswer === currentQuestion.answer
                        ? COLORS.correct
                        : COLORS.wrong,
                  },
                ]}
              >
                {getFeedbackText()}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Answer Grid */}
        <View style={styles.answersArea}>
          <View style={styles.answersGrid}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getAnswerStyle(option)}
                onPress={() => handleAnswer(option)}
                disabled={isAnswered}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    isAnswered && option === currentQuestion.answer
                      ? GRADIENTS.success
                      : isAnswered && option === selectedAnswer && option !== currentQuestion.answer
                      ? GRADIENTS.danger
                      : [COLORS.surface, COLORS.backgroundCard]
                  }
                  style={styles.answerGradient}
                >
                  <Text
                    style={[
                      styles.answerText,
                      isAnswered &&
                        (option === currentQuestion.answer ||
                          option === selectedAnswer) &&
                        styles.answerTextHighlight,
                    ]}
                  >
                    {option}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Stats */}
        <View style={styles.bottomStats}>
          <View style={styles.statBadge}>
            <Text style={styles.statIcon}>✓</Text>
            <Text style={styles.statText}>
              {correctCount}/{questionIndex + (isAnswered ? 1 : 0)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  timerCircleContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    zIndex: 10,
  },
  timerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: COLORS.textSecondary,
    fontSize: 24,
    lineHeight: 28,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 15,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreValue: {
    color: COLORS.accentYellow,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  questionArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  operationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 20,
  },
  operationText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  questionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: 10,
  },
  questionOperator: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  equalSign: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  feedbackBadge: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  answersArea: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  answersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  answerButton: {
    width: (width - 45) / 2,
    height: 70,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  answerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  correctAnswer: {
    transform: [{ scale: 1.02 }],
  },
  wrongAnswer: {
    opacity: 1,
  },
  disabledAnswer: {
    opacity: 0.4,
  },
  answerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  answerTextHighlight: {
    color: COLORS.white,
  },
  bottomStats: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statIcon: {
    color: COLORS.correct,
    fontSize: 16,
    marginRight: 6,
  },
  statText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GameScreen;
