import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  useWindowDimensions,
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
import { loadSounds, playSound, playGameOver } from '../utils/soundManager';
import RoundTransition from '../components/RoundTransition';
import SpaceBackground from '../components/SpaceBackground';


// Answer button with press bounce animation
const AnswerButton = ({ option, onPress, isAnswered, currentQuestion, selectedAnswer, isTablet }) => {
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (isAnswered) return;
    Animated.spring(pressAnim, { toValue: 0.92, useNativeDriver: true, speed: 50 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const getColors = () => {
    if (isAnswered && option === currentQuestion.answer) return GRADIENTS.success;
    if (isAnswered && option === selectedAnswer && option !== currentQuestion.answer) return GRADIENTS.danger;
    return [COLORS.surface, COLORS.backgroundCard];
  };

  const getOpacity = () => {
    if (!isAnswered) return 1;
    if (option === currentQuestion.answer || option === selectedAnswer) return 1;
    return 0.4;
  };

  const isHighlighted = isAnswered && (option === currentQuestion.answer || option === selectedAnswer);

  return (
    <Animated.View style={[styles.answerButton, isTablet && styles.answerButtonTablet, { transform: [{ scale: pressAnim }], opacity: getOpacity() }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isAnswered}
        activeOpacity={1}
        style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
      >
        <LinearGradient colors={getColors()} style={styles.answerGradient}>
          <Text style={[styles.answerText, isTablet && styles.answerTextTablet, isHighlighted && styles.answerTextHighlight]}>
            {option}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const MAX_LIVES = 5;
const AD_FAIL_THRESHOLD = 5;

const GameScreen = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const {
    difficulty,
    totalFails = 0,
    timeMultiplier: initTimeMultiplier = 1,
    operandMultiplier: initOperandMultiplier = 1,
  } = route.params;
  const config = DIFFICULTY_CONFIG[difficulty];
  const { t } = useLanguage();

  const [timeMultiplier, setTimeMultiplier] = useState(initTimeMultiplier);
  const [operandMultiplier, setOperandMultiplier] = useState(initOperandMultiplier);
  const [roundNumber, setRoundNumber] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  const gameOverParams = useRef({});
  const nextRoundParams = useRef({ newTM: 1, newOM: 1, newRound: 2, newEffectiveTime: config.timePerQuestion });
  const totalQuestionsPlayed = useRef(0);

  // Thời gian hiệu lực (giảm 1/3 mỗi lần win)
  const effectiveTime = Math.max(1, Math.round(config.timePerQuestion * timeMultiplier));

  // Feedback display time
  const feedbackDisplayTime = (difficulty === 'hard' || difficulty === 'expert' || difficulty === 'universe') ? 2000 : 1200;

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(effectiveTime);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameResults, setGameResults] = useState([]);
  const [livesLeft, setLivesLeft] = useState(MAX_LIVES);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Timer ref
  const timerRef = useRef(null);

  // Score popup animation
  const popupY = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const [popupScore, setPopupScore] = useState(0);

  useEffect(() => {
    loadSounds();
    generateNewQuestion();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Pulse animation for timer when low
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && !isAnswered) {
      playSound('countdown');
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
      duration: effectiveTime * 1000,
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

  const getQuestionFontSize = (n1, n2) => {
    const digits = Math.max(String(n1).length, String(n2).length);
    if (digits <= 2) return 64;
    if (digits <= 4) return 48;
    if (digits <= 6) return 36;
    return 28;
  };

  const startNextRound = (newTM, newOM, newRound) => {
    const question = generateQuestion(difficulty, newOM);
    const newEffectiveTime = Math.max(1, Math.round(config.timePerQuestion * newTM));
    setTimeMultiplier(newTM);
    setOperandMultiplier(newOM);
    setRoundNumber(newRound);
    setQuestionIndex(0);
    setCurrentQuestion(question);
    setTimeLeft(newEffectiveTime);
    setSelectedAnswer(null);
    setIsAnswered(false);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const generateNewQuestion = () => {
    const question = generateQuestion(difficulty, operandMultiplier);
    setCurrentQuestion(question);
    setTimeLeft(effectiveTime);
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
    playSound('timeout');

    setGameResults((prev) => [
      ...prev,
      {
        question: currentQuestion.questionText,
        correct: false,
        userAnswer: null,
        correctAnswer: currentQuestion.answer,
        timeUsed: effectiveTime,
      },
    ]);

    shakeAnimation();
    setLivesLeft((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setTimeout(handleGameOver, 1000);
      } else {
        setTimeout(moveToNextQuestion, 1500);
      }
      return next;
    });
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
      playSound('correct');
      const points = calculateScore(true, timeLeft, effectiveTime);
      showScorePopup(points);
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
      playSound('wrong');
      shakeAnimation();
      setLivesLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(handleGameOver, feedbackDisplayTime);
        } else {
          setTimeout(moveToNextQuestion, feedbackDisplayTime);
        }
        return next;
      });
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

    totalQuestionsPlayed.current += 1;
    if (isCorrect) setTimeout(moveToNextQuestion, feedbackDisplayTime);
  };

  const handleGameOver = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playGameOver();
    const newTotalFails = totalFails + 1;
    gameOverParams.current = {
      difficulty,
      score,
      correctCount,
      totalQuestions: Math.max(1, totalQuestionsPlayed.current),
      gameResults,
      failed: true,
      totalFails: newTotalFails,
      nextTimeMultiplier: timeMultiplier,
      nextOperandMultiplier: operandMultiplier,
      mustWatchAd: newTotalFails >= AD_FAIL_THRESHOLD,
    };
    navigation.replace('Result', gameOverParams.current);
  };

  const showScorePopup = (points) => {
    setPopupScore(points);
    popupY.setValue(0);
    popupOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(popupY, { toValue: -70, duration: 700, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(popupOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
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
      // Round complete — cinematic transition to next round
      const newTM = timeMultiplier * (2 / 3);
      const newOM = operandMultiplier * 10;
      const newRound = roundNumber + 1;
      const newEffectiveTime = Math.max(1, Math.round(config.timePerQuestion * newTM));

      nextRoundParams.current = { newTM, newOM, newRound, newEffectiveTime };
      setShowTransition(true);
      playSound('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setQuestionIndex(nextIndex);
      generateNewQuestion();
    }
  };

  const handleTransitionComplete = () => {
    setShowTransition(false);
    const { newTM, newOM, newRound } = nextRoundParams.current;
    startNextRound(newTM, newOM, newRound);
  };

  const getTimerColor = () => {
    const percentage = timeLeft / effectiveTime;
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

  const getFeedbackText = () => {
    if (selectedAnswer === currentQuestion.answer) {
      return t('correct');
    } else if (selectedAnswer === null) {
      return t('timeUp');
    } else {
      return t('incorrect');
    }
  };

  if (!currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={styles.backgroundGradient}
      >
        <SpaceBackground />

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

          <Animated.View style={[styles.timerCircle, { borderColor: getTimerColor(), transform: [{ scale: pulseAnim }] }]}>
            <Text style={[styles.timerNumber, { color: getTimerColor() }]}>{timeLeft}</Text>
          </Animated.View>

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
          {/* Question */}
          <View style={styles.questionBox}>
            <Text style={[styles.questionNumber, { fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2) }]}>{currentQuestion.num1}</Text>
            <Text style={[styles.questionOperator, { color: getOperationColor(), fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2) * 0.75 }]}>
              {currentQuestion.operation}
            </Text>
            <Text style={[styles.questionNumber, { fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2) }]}>{currentQuestion.num2}</Text>
          </View>

          <Text style={styles.equalSign}>= ?</Text>

          {/* Floating score popup */}
          <Animated.Text style={[styles.scorePopup, { opacity: popupOpacity, transform: [{ translateY: popupY }] }]}>
            +{popupScore} pts
          </Animated.Text>

        </Animated.View>

        {/* Feedback — absolute at top centre */}
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

        {/* Answer Grid */}
        <View style={[styles.answersArea, isTablet && { maxWidth: 640, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.answersGrid}>
            {currentQuestion.options.map((option, index) => (
              <AnswerButton
                key={index}
                option={option}
                onPress={() => { playSound('tap'); handleAnswer(option); }}
                isAnswered={isAnswered}
                currentQuestion={currentQuestion}
                selectedAnswer={selectedAnswer}
                isTablet={isTablet}
              />
            ))}
          </View>
        </View>

        {/* Bottom Stats */}
        <View style={styles.bottomStats}>
          <View style={styles.statBadge}>
            <Text style={styles.statText}>
              {correctCount}/{questionIndex + (isAnswered ? 1 : 0)}
            </Text>
          </View>
          <View style={styles.livesRow}>
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Text key={i} style={[styles.heartIcon, i >= livesLeft && styles.heartLost]}>
                {i < livesLeft ? '❤️' : '🖤'}
              </Text>
            ))}
          </View>
        </View>


      </LinearGradient>

      {/* Cinematic round transition */}
      <RoundTransition
        visible={showTransition}
        fromRound={roundNumber}
        toRound={nextRoundParams.current.newRound}
        newEffectiveTime={nextRoundParams.current.newEffectiveTime}
        onComplete={handleTransitionComplete}
      />

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
  timerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  timerNumber: {
    fontSize: 18,
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
    fontWeight: '300',
    color: COLORS.text,
    marginHorizontal: 10,
    letterSpacing: 2,
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
  scorePopup: {
    position: 'absolute',
    fontSize: 26,
    fontWeight: 'bold',
    color: '#4ADE80',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  feedbackBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
    zIndex: 100,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
    width: '48%',
    height: 70,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  answerButtonTablet: {
    height: 100,
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
  answerTextTablet: {
    fontSize: 36,
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
  livesRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  heartIcon: {
    fontSize: 20,
    marginHorizontal: 2,
  },
  heartLost: {
    opacity: 0.3,
  },
});

export default GameScreen;
