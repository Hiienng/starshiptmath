import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  useWindowDimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, GRADIENTS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { formatInt } from '../utils/numberFormat';
import {
  DIFFICULTY_CONFIG,
  generateQuestion,
  calculateScore,
} from '../utils/mathGenerator';
import { useLanguage } from '../context/LanguageContext';
import { loadSounds, playSound, playGameOver } from '../utils/soundManager';
import RoundTransition from '../components/RoundTransition';
import SpaceBackground from '../components/SpaceBackground';
import { getActiveSkin, getAllSkins, setActiveSkin, SHIP_SKINS, getItemState, useItem, getCoins, spendCoins } from '../utils/itemStorage';
import { recordPlay } from '../utils/streakStorage';
import { useAd } from '../context/AdContext';
import { generateDecimalQuestion, DECIMAL_STAGES, DECIMAL_STAGE_CONFIG, TOTAL_STAGES } from '../utils/decimalGenerator';
import { unlockNextStage, saveStageSnapshot, loadStageSnapshot, clearStageSnapshot } from '../utils/progressStorage';

const TOOL_IMGS = {
  shield:       require('../../assets/shield.png'),
  emergencykit: require('../../assets/emergencykit.png'),
  timeboost:    require('../../assets/timeboost.png'),
};
const TIME_BOOST_SEC = 3;


// Answer button with press bounce animation
const AnswerButton = ({ option, onPress, isAnswered, currentQuestion, selectedAnswer, isTablet, ts, hintAnswer, formatNumber }) => {
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (isAnswered) return;
    Animated.spring(pressAnim, { toValue: 0.92, useNativeDriver: true, speed: 50 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const isHinted = !isAnswered && hintAnswer === option;

  const getColors = () => {
    if (isAnswered && option === currentQuestion.answer) return GRADIENTS.success;
    if (isAnswered && option === selectedAnswer && option !== currentQuestion.answer) return GRADIENTS.danger;
    if (isHinted) return ['#0f3d2a', '#1a5c3a']; // subtle green hint
    return [COLORS.surface, COLORS.backgroundCard];
  };

  const getOpacity = () => {
    if (!isAnswered) return 1;
    if (option === currentQuestion.answer || option === selectedAnswer) return 1;
    return 0.4;
  };

  const isHighlighted = isAnswered && (option === currentQuestion.answer || option === selectedAnswer);

  return (
    <Animated.View style={[styles.answerButton, isTablet && [styles.answerButtonTablet, { height: 70 * Math.min(ts, 1.8) }], isHinted && styles.answerButtonHint, { transform: [{ scale: pressAnim }], opacity: getOpacity() }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isAnswered}
        activeOpacity={1}
        style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
      >
        <LinearGradient colors={getColors()} style={styles.answerGradient}>
          <Text style={[styles.answerText, isTablet && [styles.answerTextTablet, { fontSize: 28 * Math.min(ts, 1.8) }], isHighlighted && styles.answerTextHighlight]}>
            {formatNumber ? formatNumber(option) : option}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const MAX_LIVES = 5;
const AD_FAIL_THRESHOLD = 5;
const REVIVE_COST = 20;

const GameScreen = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  // Continuous scale factor for tablets — grows with screen width so UI
  // elements don't stay phone-sized on large iPads.
  const ts = isTablet ? Math.min(width / 480, 2.2) : 1;
  // Shared horizontal inset on tablet so the header card and the answer
  // grid line up to the same left/right edges (content capped to 760px,
  // centered, on very wide screens).
  const contentSideInset = isTablet ? (width - Math.min(width * 0.85, 760)) / 2 : 0;
  const {
    difficulty,
    totalFails = 0,
    timeMultiplier: initTimeMultiplier = 1,
    operandMultiplier: initOperandMultiplier = 1,
    customConfig,
    stageId,
    isStageMode = false,
    skipInGameRevive = false, // true → in-game 2-coin revive disabled (used after result-screen continue)
    // Carry-over state from previous stage (continuous run)
    initialLives = MAX_LIVES,
    initialScore = 0,
    initialCorrectCount = 0,
    initialGameResults = [],
    initialQuestionsPlayed = 0,
  } = route.params;
  const isDecimal = difficulty === 'decimal';
  const config = customConfig ?? DIFFICULTY_CONFIG[difficulty];
  const { t, language } = useLanguage();
  const fmt = (n) => formatInt(n, language);
  const { showRewarded, isRewardedReady, recordLevelPlayed } = useAd();
  const [paused, setPaused] = useState(false);
  const [showRevive, setShowRevive] = useState(false);
  const [reviveCoins, setReviveCoins] = useState(0);
  const reviveUsed = useRef(skipInGameRevive); // pre-mark as used if result-screen continue was used last
  const voluntaryExit = useRef(false); // true when user presses X (not a real game-over)
  const livesLeftRef  = useRef(initialLives); // mirror for use in cleanup closure

  const [activeSkinId,     setActiveSkinId]     = useState('starship1');
  const [activeSkinSource, setActiveSkinSource] = useState(null);
  const [ownedSkins,       setOwnedSkins]       = useState([]);
  const [skinPickerOpen,   setSkinPickerOpen]   = useState(false);
  const pickerAnim = useRef(new Animated.Value(0)).current;

  const loadSkin = async () => {
    const skinId = await getActiveSkin();
    const allSkins = await getAllSkins();
    const owned = allSkins.filter(s => s.owned);
    const skin = SHIP_SKINS.find(s => s.id === skinId);
    setActiveSkinId(skinId);
    setActiveSkinSource(skin?.image ?? null);
    setOwnedSkins(owned);
  };

  useEffect(() => {
    loadSkin();
    const unsub = navigation.addListener('focus', loadSkin);
    return unsub;
  }, [navigation]);

  const toggleSkinPicker = () => {
    const open = !skinPickerOpen;
    setSkinPickerOpen(open);
    Animated.spring(pickerAnim, {
      toValue: open ? 1 : 0,
      friction: 7, tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleSelectSkin = async (skin) => {
    await setActiveSkin(skin.id);
    setActiveSkinId(skin.id);
    setActiveSkinSource(skin.image);
    toggleSkinPicker();
  };

  // ── Power-up items ────────────────────────────────────────────
  const [itemUses, setItemUses]     = useState({ shield: 0, emergencykit: 0, timeboost: 0 });
  const [shieldActive, setShield]   = useState(false); // reveals correct answer this question

  const refreshItems = async () => {
    const [s, e, t] = await Promise.all([
      getItemState('shield'),
      getItemState('emergencykit'),
      getItemState('timeboost'),
    ]);
    setItemUses({ shield: s.uses, emergencykit: e.uses, timeboost: t.uses });
  };

  useEffect(() => { refreshItems(); }, []);

  const handleUseShield = async () => {
    if (isAnswered || shieldActive || itemUses.shield <= 0) return;
    const ok = await useItem('shield');
    if (ok) { setItemUses(p => ({ ...p, shield: p.shield - 1 })); setShield(true); }
  };

  const handleUseEmergencyKit = async () => {
    if (itemUses.emergencykit <= 0 || livesLeft >= MAX_LIVES) return;
    const ok = await useItem('emergencykit');
    if (ok) { setItemUses(p => ({ ...p, emergencykit: p.emergencykit - 1 })); setLivesLeft(MAX_LIVES); }
  };

  const handleUseTimeBoost = async () => {
    if (isAnswered || itemUses.timeboost <= 0) return;
    const ok = await useItem('timeboost');
    if (ok) {
      setItemUses(p => ({ ...p, timeboost: p.timeboost - 1 }));
      setTimeLeft(prev => prev + TIME_BOOST_SEC);
    }
  };

  const [timeMultiplier, setTimeMultiplier] = useState(initTimeMultiplier);
  const [operandMultiplier, setOperandMultiplier] = useState(initOperandMultiplier);
  const [roundNumber, setRoundNumber] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  const gameOverParams = useRef({});
  const nextRoundParams = useRef({ newTM: 1, newOM: 1, newRound: 2, newEffectiveTime: config.timePerQuestion });
  const totalQuestionsPlayed = useRef(initialQuestionsPlayed);

  // Thời gian hiệu lực (giảm 1/3 mỗi lần win)
  const effectiveTime = Math.max(1, Math.round(config.timePerQuestion * timeMultiplier));

  // Feedback display time
  const feedbackDisplayTime = (difficulty === 'hard' || difficulty === 'expert' || difficulty === 'universe') ? 2000 : 1200;

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(initialScore);
  const [correctCount, setCorrectCount] = useState(initialCorrectCount);
  const [timeLeft, setTimeLeft] = useState(effectiveTime);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameResults, setGameResults] = useState(initialGameResults);
  const [livesLeft, setLivesLeft] = useState(initialLives);
  // Keep ref in sync so cleanup closure can read current value
  useEffect(() => { livesLeftRef.current = livesLeft; }, [livesLeft]);

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

    // For stage mode: restore lives from snapshot if user exited voluntarily
    if (isStageMode && stageId) {
      loadStageSnapshot(stageId).then(snap => {
        if (snap) {
          setLivesLeft(snap.livesLeft);
          reviveUsed.current = snap.reviveUsed ?? false;
        }
      });
    }

    generateNewQuestion();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (voluntaryExit.current && isStageMode && stageId) {
        saveStageSnapshot({
          stageId,
          livesLeft: livesLeftRef.current,
          reviveUsed: reviveUsed.current,
        });
      }
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

  const getQuestionFontSize = (n1, n2, n3 = null) => {
    const digits = Math.max(String(n1).length, String(n2).length, n3 != null ? String(n3).length : 0);
    // 3-operand questions get slightly smaller base to fit
    const base = n3 != null ? 0.82 : 1;
    if (digits <= 2) return Math.round(64 * base);
    if (digits <= 4) return Math.round(48 * base);
    if (digits <= 6) return Math.round(36 * base);
    return Math.round(28 * base);
  };

  const startNextRound = (newTM, newOM, newRound) => {
    const question = isDecimal
      ? generateDecimalQuestion(stageId)
      : generateQuestion(difficulty, newOM);
    const newEffectiveTime = Math.max(1, Math.round(config.timePerQuestion * newTM));
    setTimeMultiplier(newTM);
    setOperandMultiplier(newOM);
    setRoundNumber(newRound);
    setQuestionIndex(0);
    setCurrentQuestion(question);
    setTimeLeft(newEffectiveTime);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShield(false);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const generateNewQuestion = () => {
    const question = isDecimal
      ? generateDecimalQuestion(stageId)
      : generateQuestion(difficulty, operandMultiplier);
    setCurrentQuestion(question);
    setTimeLeft(effectiveTime);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShield(false);

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

  const proceedGameOver = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playGameOver();
    recordPlay();
    // Real fail: clear saved snapshot and deduct 5 coins
    if (isStageMode && stageId) {
      clearStageSnapshot();
      spendCoins(5); // fire-and-forget, no need to await for UI
    }
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
      // decimal stage mode — needed so ResultScreen can retry correctly
      stageId: stageId ?? null,
      customConfig: customConfig ?? null,
      isStageMode,
      stageCompleted: false,
    };
    recordLevelPlayed(() => navigation.replace('Result', gameOverParams.current));
  };

  const handleGameOver = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!reviveUsed.current) {
      const bal = await getCoins();
      setReviveCoins(bal);
      setShowRevive(true);
    } else {
      proceedGameOver();
    }
  };

  const handleRevive = async () => {
    const ok = await spendCoins(REVIVE_COST);
    if (!ok) return;
    setShowRevive(false);
    reviveUsed.current = true;
    setLivesLeft(MAX_LIVES); // restore all lives
    setIsAnswered(false);
    setSelectedAnswer(null);
    setShield(false);
    setTimeLeft(effectiveTime);
  };

  const handleSkipRevive = () => {
    setShowRevive(false);
    proceedGameOver();
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

  // ── pause / resume ────────────────────────────────────────────
  const pauseGame = () => {
    if (paused || isAnswered || !currentQuestion) return;
    if (timerRef.current) clearInterval(timerRef.current);
    progressAnim.stopAnimation();
    setSkinPickerOpen(false); // always open the pause skin picker collapsed
    setPaused(true);
  };

  const resumeGame = () => {
    if (!paused) return;
    setPaused(false);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: timeLeft * 1000,
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
      playSound('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      recordPlay();

      if (isStageMode) {
        // Stage complete — show warp transition first, then go to Result
        if (timerRef.current) clearInterval(timerRef.current);
        nextRoundParams.current = {
          isStageComplete: true,
          newTM: 1, newOM: 1, newRound: roundNumber + 1, newEffectiveTime: config.timePerQuestion,
        };
        setShowTransition(true);
      } else {
        // Normal round — cinematic transition → next round
        const newTM = timeMultiplier * (2 / 3);
        const newOM = operandMultiplier * 10;
        const newRound = roundNumber + 1;
        const newEffectiveTime = Math.max(1, Math.round(config.timePerQuestion * newTM));
        nextRoundParams.current = { isStageComplete: false, newTM, newOM, newRound, newEffectiveTime };
        setShowTransition(true);
      }
    } else {
      setQuestionIndex(nextIndex);
      generateNewQuestion();
    }
  };

  const handleTransitionComplete = async () => {
    setShowTransition(false);
    const { isStageComplete, newTM, newOM, newRound } = nextRoundParams.current;

    if (isStageComplete) {
      await unlockNextStage(stageId);
      await clearStageSnapshot(); // stage cleared cleanly — no resume needed
      const nextStageId = stageId + 1;

      if (nextStageId > TOTAL_STAGES) {
        // Final stage cleared — go to Result
        recordLevelPlayed(() => navigation.replace('Result', {
          difficulty: 'decimal',
          stageId,
          score,
          correctCount,
          totalQuestions: Math.max(1, totalQuestionsPlayed.current),
          gameResults,
          failed: false,
          totalFails: 0,
          nextTimeMultiplier: 1,
          nextOperandMultiplier: 1,
          stageCompleted: true,
          mustWatchAd: false,
          customConfig,
          isStageMode: true,
        }));
      } else {
        // Continue run — carry lives + score into next stage
        reviveUsed.current = false; // allow one revive per stage
        const nextConfig = DECIMAL_STAGE_CONFIG(nextStageId);
        recordLevelPlayed(() => navigation.replace('Game', {
          difficulty: 'decimal',
          stageId: nextStageId,
          customConfig: nextConfig,
          totalFails,
          timeMultiplier: 1,
          operandMultiplier: 1,
          isStageMode: true,
          skipInGameRevive: false, // reset alternation on stage advance
          // carry-over
          initialLives: livesLeft,
          initialScore: score,
          initialCorrectCount: correctCount,
          initialGameResults: gameResults,
          initialQuestionsPlayed: totalQuestionsPlayed.current,
        }));
      }
    } else {
      startNextRound(newTM, newOM, newRound);
    }
  };

  const getTimerColor = () => {
    const percentage = timeLeft / effectiveTime;
    if (percentage > 0.5) return COLORS.timerNormal;
    if (percentage > 0.25) return COLORS.timerWarning;
    return COLORS.timerDanger;
  };

  const getOperationColor = () => {
    switch (currentQuestion?.operation) {
      case '+':
      case '++': return COLORS.addition;
      case '-':  return COLORS.subtraction;
      case '×':  return COLORS.multiplication;
      case '÷':  return COLORS.division;
      default:   return COLORS.primary;
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
        <SpaceBackground shipSource={activeSkinSource} />

          {/* Header — floating ✕ + centred glow card + pause */}
        <View style={[styles.headerWrap, isTablet && { height: 120 + (ts - 1) * 30 }]}>
          <TouchableOpacity
            style={[styles.closeBtn, isTablet && { width: 30 * Math.min(ts, 1.4), height: 30 * Math.min(ts, 1.4), borderRadius: 15 * Math.min(ts, 1.4) }]}
            onPress={() => { voluntaryExit.current = true; navigation.goBack(); }}
          >
            <Text style={[styles.closeTxt, isTablet && { fontSize: 13 * Math.min(ts, 1.4) }]}>✕</Text>
          </TouchableOpacity>

          <View style={[styles.headerCard, isTablet && { paddingVertical: 10 * Math.min(ts, 1.5), paddingHorizontal: 14 * Math.min(ts, 1.5), left: contentSideInset, right: contentSideInset }]}>
            {/* Progress */}
            <Text style={[styles.headerProgress, isTablet && { fontSize: 15 * Math.min(ts, 1.5) }]}>
              {questionIndex + 1}/{config.questionsCount}
            </Text>
            {/* Timer */}
            <Animated.View style={[styles.timerCircle, isTablet && { width: 40 * Math.min(ts, 1.5), height: 40 * Math.min(ts, 1.5), borderRadius: 20 * Math.min(ts, 1.5) }, { borderColor: getTimerColor(), transform: [{ scale: pulseAnim }] }]}>
              <Text style={[styles.timerNumber, isTablet && { fontSize: 16 * Math.min(ts, 1.5) }, { color: getTimerColor() }]}>{timeLeft}</Text>
            </Animated.View>
            {/* Score */}
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, isTablet && { fontSize: 18 * Math.min(ts, 1.5) }]}>{fmt(score)}</Text>
              <Text style={[styles.scoreLabel, isTablet && { fontSize: 10 * Math.min(ts, 1.4) }]}>{t('score')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.pauseBtn, isTablet && { width: 30 * Math.min(ts, 1.4), height: 30 * Math.min(ts, 1.4), borderRadius: 15 * Math.min(ts, 1.4) }]}
            onPress={pauseGame}
          >
            <View style={styles.pauseBars}>
              <View style={[styles.pauseBar, isTablet && { width: 3 * Math.min(ts, 1.4), height: 12 * Math.min(ts, 1.4) }]} />
              <View style={[styles.pauseBar, isTablet && { width: 3 * Math.min(ts, 1.4), height: 12 * Math.min(ts, 1.4) }]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Tools + skin picker moved into the Pause menu (see pause overlay below) */}

        {/* ── Body: question centre, answers+stats at bottom ── */}
        <View style={styles.gameBody}>

          {/* Question Area — grows to fill space */}
          <Animated.View
            style={[
              styles.questionArea,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
              },
            ]}
          >
            <View style={[styles.questionBox, currentQuestion.operation === '++' && styles.questionBoxChained]}>
              {currentQuestion.operation === '++' ? (
                <>
                  <Text style={[styles.questionNumber, { fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2, currentQuestion.num3) * (isTablet ? ts : 1) }]}>{fmt(currentQuestion.num1)}</Text>
                  <Text style={[styles.questionOperator, { color: getOperationColor(), fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2, currentQuestion.num3) * 0.65 * (isTablet ? ts : 1) }]}>+</Text>
                  <Text style={[styles.questionNumber, { fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2, currentQuestion.num3) * (isTablet ? ts : 1) }]}>{fmt(currentQuestion.num2)}</Text>
                  <Text style={[styles.questionOperator, { color: getOperationColor(), fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2, currentQuestion.num3) * 0.65 * (isTablet ? ts : 1) }]}>+</Text>
                  <Text style={[styles.questionNumber, { fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2, currentQuestion.num3) * (isTablet ? ts : 1) }]}>{fmt(currentQuestion.num3)}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.questionNumber, { fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2) * (isTablet ? ts : 1) }]}>{fmt(currentQuestion.num1)}</Text>
                  <Text style={[styles.questionOperator, { color: getOperationColor(), fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2) * 0.75 * (isTablet ? ts : 1) }]}>
                    {currentQuestion.operation}
                  </Text>
                  <Text style={[styles.questionNumber, { fontSize: getQuestionFontSize(currentQuestion.num1, currentQuestion.num2) * (isTablet ? ts : 1) }]}>{fmt(currentQuestion.num2)}</Text>
                </>
              )}
            </View>

            <Text style={[styles.equalSign, isTablet && { fontSize: 36 * ts }]}>= ?</Text>

            <Animated.Text style={[styles.scorePopup, { opacity: popupOpacity, transform: [{ translateY: popupY }] }]}>
              +{fmt(popupScore)} {t('points')}
            </Animated.Text>
          </Animated.View>

          {/* Feedback badge — inline between question and answers */}
          <View style={styles.feedbackBadgeRow}>
            {isAnswered && (
              <View style={[styles.feedbackBadge, {
                backgroundColor: selectedAnswer === currentQuestion.answer ? COLORS.correctBg : COLORS.wrongBg,
              }]}>
                <Text style={[styles.feedbackText, {
                  color: selectedAnswer === currentQuestion.answer ? COLORS.correct : COLORS.wrong,
                }]}>
                  {getFeedbackText()}
                </Text>
              </View>
            )}
          </View>

          {/* Answer Grid — 2×2 */}
          <View style={[styles.answersArea, isTablet && { paddingHorizontal: 12 + contentSideInset }]}>
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
                  ts={ts}
                  hintAnswer={shieldActive ? currentQuestion.answer : null}
                  formatNumber={fmt}
                />
              ))}
            </View>
          </View>

          {/* Bottom Stats */}
          <View style={[styles.bottomStats, isTablet && { paddingBottom: 24 }]}>
            <View style={[styles.statBadge, isTablet && { paddingHorizontal: 15 * Math.min(ts, 1.4), paddingVertical: 8 * Math.min(ts, 1.4) }]}>
              <Text style={[styles.statText, isTablet && { fontSize: 14 * Math.min(ts, 1.4) }]}>
                {correctCount}/{questionIndex + (isAnswered ? 1 : 0)}
              </Text>
            </View>
            <View style={styles.livesRow}>
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <Text key={i} style={[styles.heartIcon, isTablet && { fontSize: 20 * Math.min(ts, 1.5), marginHorizontal: 4 }, i >= livesLeft && styles.heartLost]}>
                  {i < livesLeft ? '❤️' : '🖤'}
                </Text>
              ))}
            </View>
          </View>

        </View>{/* end gameBody */}

      </LinearGradient>

      {/* ── Revive modal ── */}
      {showRevive && (
        <View style={styles.reviveOverlay}>
          <View style={styles.reviveBox}>
            <Text style={styles.reviveTitle}>Game Over!</Text>
            {reviveCoins >= REVIVE_COST ? (
              <>
                <Text style={styles.reviveSub}>
                  {`You have ${reviveCoins} 🪙 in your wallet.\nUse ${REVIVE_COST} coins to recover all lives.`}
                </Text>
                <TouchableOpacity style={styles.reviveBtn} onPress={handleRevive} activeOpacity={0.85}>
                  <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.reviveGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.reviveBtnText}>Keep playing</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.reviveSub}>
                  {`You have ${reviveCoins} 🪙 — not enough to revive.\nEarn coins in the Store.`}
                </Text>
                <TouchableOpacity
                  style={styles.reviveBtn}
                  onPress={() => { setShowRevive(false); navigation.navigate('Store'); }}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.reviveGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.reviveBtnText}>🪙 Earn Coins at Store</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.reviveSkip} onPress={handleSkipRevive} activeOpacity={0.7}>
              <Text style={styles.reviveSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pause overlay */}
      {paused && (
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>PAUSED</Text>
            <Text style={styles.pauseSub}>{t('score')}: {fmt(score)}</Text>

            {/* ── Tools + skin picker (moved here from the in-game control row) ── */}
            <View style={styles.pauseToolsRow}>
              {[
                { id: 'shield',       img: TOOL_IMGS.shield,       onUse: handleUseShield,       disabled: isAnswered || shieldActive || itemUses.shield <= 0 },
                { id: 'emergencykit', img: TOOL_IMGS.emergencykit, onUse: handleUseEmergencyKit, disabled: itemUses.emergencykit <= 0 || livesLeft >= MAX_LIVES },
                { id: 'timeboost',    img: TOOL_IMGS.timeboost,    onUse: handleUseTimeBoost,    disabled: isAnswered || itemUses.timeboost <= 0 },
              ].map(({ id, img, onUse, disabled }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.toolBtn, disabled && styles.toolBtnDisabled]}
                  onPress={onUse}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Image source={img} style={[styles.toolImg, disabled && { opacity: 0.35 }]} resizeMode="contain" />
                  <View style={styles.toolBadge}>
                    <Text style={styles.toolBadgeText}>{itemUses[id]}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Skin picker — toggles the inline skin row below */}
              <TouchableOpacity
                style={[styles.skinPickerBtn, ownedSkins.length <= 1 && styles.toolBtnDisabled]}
                onPress={toggleSkinPicker}
                disabled={ownedSkins.length <= 1}
                activeOpacity={0.8}
              >
                <Image source={activeSkinSource ?? SHIP_SKINS[0].image} style={[styles.skinPickerThumb, ownedSkins.length <= 1 && { opacity: 0.35 }]} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            {/* Inline skin choices (shown when the ship button is tapped) */}
            {skinPickerOpen && ownedSkins.length > 1 && (
              <View style={styles.pauseSkinRow}>
                {ownedSkins.map(skin => (
                  <TouchableOpacity
                    key={skin.id}
                    style={[styles.skinPickerItem, skin.id === activeSkinId && styles.skinPickerItemActive]}
                    onPress={() => handleSelectSkin(skin)}
                    activeOpacity={0.8}
                  >
                    <Image source={skin.image} style={styles.skinPickerImg} resizeMode="contain" />
                    {skin.id === activeSkinId && <View style={styles.skinPickerDot} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 12 }} />
            <TouchableOpacity style={[styles.pauseAction, { backgroundColor: '#7C3AED' }]} onPress={resumeGame}>
              <Text style={styles.pauseActionTxt}>▶  Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pauseAction, { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }]}
              onPress={() => { voluntaryExit.current = true; navigation.goBack(); }}
            >
              <Text style={styles.pauseActionTxt}>Quit to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Cinematic round transition */}
      <RoundTransition
        visible={showTransition}
        fromRound={roundNumber}
        toRound={nextRoundParams.current.isStageComplete ? stageId + 1 : nextRoundParams.current.newRound}
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
  // ── Jupiter-style header ──────────────────────────────────────
  headerWrap: {
    paddingTop: 50,
    paddingBottom: 14,
    height: 120,
  },
  closeBtn: {
    position: 'absolute',
    top: 50, left: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  closeTxt: { color: '#fff', fontSize: 13 },
  pauseBtn: {
    position: 'absolute',
    top: 50, right: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  pauseBars: { flexDirection: 'row', gap: 4 },
  pauseBar:  { width: 3, height: 12, borderRadius: 1.5, backgroundColor: '#fff' },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  },
  pauseCard: {
    backgroundColor: 'rgba(15, 10, 35, 0.96)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.45)',
    paddingHorizontal: 18, paddingVertical: 26,
    width: 300, alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 14,
  },
  pauseTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 4 },
  pauseSub:   { color: 'rgba(184,184,212,0.6)', fontSize: 12, letterSpacing: 1, marginTop: 6 },
  pauseToolsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  pauseSkinRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  pauseAction: {
    width: '100%', borderRadius: 14, paddingVertical: 13, alignItems: 'center',
    marginTop: 10,
  },
  pauseActionTxt: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  headerCard: {
    position: 'absolute',
    top: 50, left: 56, right: 56,
    backgroundColor: 'rgba(15, 10, 35, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  headerProgress: {
    fontFamily: FONTS.displaySemi,
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    minWidth: 40,
    textAlign: 'left',
  },
  timerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerNumber: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
  },
  scoreBox: {
    alignItems: 'flex-end',
    minWidth: 40,
  },
  scoreValue: {
    fontFamily: FONTS.displayBold,
    color: '#FCD34D',
    fontSize: 18,
  },
  scoreLabel: {
    fontFamily: FONTS.bodySemi,
    color: 'rgba(184,184,212,0.55)',
    fontSize: 10,
    letterSpacing: 1,
  },
  // ── Control row (tools + skin picker) ────────────────────────
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
    zIndex: 10,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 8,
  },

  gameBody: {
    flex: 1,
    justifyContent: 'flex-end',   // push answers + stats to bottom
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
  questionBoxChained: {
    flexWrap: 'wrap',
    maxWidth: '95%',
    gap: 2,
  },
  questionNumber: {
    fontFamily: FONTS.displayMedium,
    fontSize: 64,
    color: COLORS.text,
    marginHorizontal: 10,
    letterSpacing: 2,
  },
  questionOperator: {
    fontFamily: FONTS.displayBold,
    fontSize: 48,
  },
  equalSign: {
    fontFamily: FONTS.displaySemi,
    fontSize: 36,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  scorePopup: {
    position: 'absolute',
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    color: '#4ADE80',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  feedbackBadgeRow: {
    alignItems: 'center',
    height: 38,         // reserve fixed height so layout doesn't jump when badge appears
    justifyContent: 'center',
  },
  feedbackBadge: {
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
  },
  feedbackText: {
    fontFamily: FONTS.displaySemi,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  answersArea: {
    paddingHorizontal: 12,
    paddingBottom: 12,
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
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    color: COLORS.text,
  },
  answerTextTablet: {
    fontSize: 44,
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
    fontFamily: FONTS.bodySemi,
    color: COLORS.textSecondary,
    fontSize: 14,
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

  toolBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toolImg: {
    width: 30,
    height: 30,
  },
  toolBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  answerButtonHint: {
    borderWidth: 2,
    borderColor: '#4ADE80',
    borderRadius: 16,
  },

  // ── Skin picker ───────────────────────────────────────────────
  skinPickerBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skinPickerThumb: { width: 34, height: 34 },
  skinPickerPanel: {
    position: 'absolute',
    right: 0,
    top: 54,          // drops below the 48px button
    backgroundColor: 'rgba(22,23,46,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    padding: 8,
    gap: 8,
    zIndex: 20,
  },
  skinPickerItem: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skinPickerItemActive: {
    backgroundColor: 'rgba(167,139,250,0.2)',
    borderWidth: 1.5,
    borderColor: '#a78bfa',
  },
  skinPickerImg: { width: 36, height: 36 },
  skinPickerDot: {
    position: 'absolute',
    bottom: 4, right: 4,
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },

  // ── Revive modal ──────────────────────────────────────────────
  reviveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  reviveBox: {
    backgroundColor: '#16172e',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
    padding: 28,
    width: '78%',
    alignItems: 'center',
    gap: 10,
  },
  reviveTitle:   { fontFamily: FONTS.displayBold, fontSize: 24, color: '#fff' },
  reviveSub:     { fontFamily: FONTS.bodyRegular, fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },
  reviveBtn:     { borderRadius: 14, overflow: 'hidden', width: '100%', marginTop: 6 },
  reviveGradient: { paddingVertical: 14, alignItems: 'center' },
  reviveBtnText: { fontFamily: FONTS.bodyExtra, fontSize: 16, color: '#fff' },
  reviveSkip:    { paddingVertical: 8 },
  reviveSkipText: { fontFamily: FONTS.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.35)' },

  // ── Tool bar tablet ───────────────────────────────────────────
  toolBtnTablet:   { width: 72, height: 72, borderRadius: 20 },
  toolImgTablet:   { width: 42, height: 42 },
  toolBadgeTablet: { minWidth: 22, height: 22, borderRadius: 11, top: -6, right: -6 },
  toolBadgeText: {
    fontFamily: FONTS.bodyExtra,
    fontSize: 10,
    color: '#fff',
  },
});

export default GameScreen;
