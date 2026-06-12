import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#6C63FF', '#FF6B9D', '#00E5FF', '#FF4DB8', '#FFFFFF'];

// More particles, spread from center outward in 2 waves
const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 5 + (i % 5) * 3,
  startX: SW * 0.5,                               // all launch from center
  startY: SH * 0.38,
  angle: (i / 40) * Math.PI * 2,
  radius: 60 + (i % 3) * 60,                      // spread distance
  fallDist: SH * 0.45 + (i % 4) * 60,
  delay: i < 20 ? (i % 5) * 40 : 180 + (i % 5) * 40, // 2 waves
  dur: 1400 + (i % 4) * 200,
}));

const ConfettiParticle = ({ color, size, startX, startY, angle, radius, fallDist, delay, dur }) => {
  const y     = useRef(new Animated.Value(0)).current;
  const x     = useRef(new Animated.Value(0)).current;
  const alpha = useRef(new Animated.Value(0)).current;
  const rot   = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dx = Math.cos(angle) * radius;
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale,  { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        Animated.timing(alpha,  { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(x,      { toValue: dx, duration: dur * 0.45, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(y,      { toValue: fallDist, duration: dur, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(rot,    { toValue: 1, duration: dur, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(dur * 0.55),
          Animated.timing(alpha, { toValue: 0, duration: dur * 0.35, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
  }, []);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX - size / 2,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: color,
        opacity: alpha,
        transform: [{ translateX: x }, { translateY: y }, { rotate }, { scale }],
        zIndex: 999,
      }}
    />
  );
};
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, GRADIENTS } from '../constants/colors';
import { DIFFICULTY_CONFIG } from '../utils/mathGenerator';
import { saveHighScore, getHighScoreByDifficulty } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';
import { playSound } from '../utils/soundManager';
import { useAd } from '../context/AdContext';
import { addCoin, getCoins, spendCoins } from '../utils/itemStorage';
import { getHighestUnlockedStage } from '../utils/progressStorage';
import { DECIMAL_STAGES, DECIMAL_STAGE_CONFIG } from '../utils/decimalGenerator';
import AdBanner from '../components/AdBanner';



const ResultScreen = ({ route, navigation }) => {
  const {
    difficulty, score, correctCount, totalQuestions, gameResults,
    failed = false,
    totalFails = 0,
    nextTimeMultiplier = 1,
    nextOperandMultiplier = 1,
    mustWatchAd = false,
    stageCompleted = false,
    stageId = null,
    customConfig = null,
    isStageMode = false,
  } = route.params;
  const config = customConfig ?? DIFFICULTY_CONFIG[difficulty] ?? { questionsCount: 7 };
  const { t } = useLanguage();
  const { showRewarded, isRewardedReady } = useAd();
  const [watchingAd, setWatchingAd] = useState(false);
  const [walletCoins, setWalletCoins] = useState(0);
  const nextStageId = stageId ? stageId + 1 : null;
  const nextStageInfo = nextStageId ? DECIMAL_STAGES.find(s => s.id === nextStageId) : null;

  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(score);

  // Max realm score = 5 perfect rounds (questionsCount × 20pts × 5)
  const MAX_REALM_SCORE = config.questionsCount * 20 * 5;

  // Animations
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(SH * 0.22)).current;
  const scaleAnim  = useRef(new Animated.Value(0.6)).current;
  const scoreScale = useRef(new Animated.Value(0)).current;
  const bar1Anim   = useRef(new Animated.Value(0)).current;
  const bar2Anim   = useRef(new Animated.Value(0)).current;
  const statsAnim  = useRef(new Animated.Value(0)).current;
  const btnAnim    = useRef(new Animated.Value(80)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const flashAnim  = useRef(new Animated.Value(0)).current; // white flash on entry

  const accuracy = (correctCount / totalQuestions) * 100;

  useEffect(() => {
    checkHighScore();
    if (failed) getCoins().then(setWalletCoins);

    // ── Cinematic entrance ──────────────────────────────────────
    // 0. White flash (instant impact)
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.35, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0,    duration: 260, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      // 1. Card slams up from bottom — hard spring overshoot
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 5, tension: 140, useNativeDriver: true }),
      ]),
      // 2. Score slams in with huge bounce
      Animated.spring(scoreScale, { toValue: 1, friction: 2.5, tension: 180, useNativeDriver: true }),
      // 3. Double glow flash
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 160, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 120, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1,   duration: 140, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 200, useNativeDriver: true }),
      ]),
      // 4. Bars sweep fast
      Animated.parallel([
        Animated.timing(bar1Anim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(bar2Anim, { toValue: 1, duration: 500, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
      // 5. Stats + buttons spring up
      Animated.parallel([
        Animated.spring(statsAnim, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.spring(btnAnim,   { toValue: 0, friction: 5, tension: 100, useNativeDriver: true }),
      ]),
    ]).start();

    if (failed) {
      playSound('wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      playSound('complete');
      // Triple haptic punch for impact
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 120);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 260);
    }
  }, []);

  // Score count-up animation
  useEffect(() => {
    if (score === 0) return;
    const steps = 30;
    const stepTime = 1200 / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setDisplayScore(Math.round((step / steps) * score));
      if (step >= steps) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, []);

  const checkHighScore = async () => {
    const existing = await getHighScoreByDifficulty(difficulty);
    const prevBest = existing?.score ?? 0;
    const newRecord = await saveHighScore(difficulty, score, accuracy);
    const best = newRecord ? score : Math.max(prevBest, score);
    setHighScore(best);
    setIsNewRecord(newRecord);
    if (newRecord) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSound('newRecord');
    }
  };

  const continueAfterFail = (skipInGameRevive = false) => {
    playSound('tap');
    navigation.replace('Game', {
      difficulty,
      totalFails,
      timeMultiplier: nextTimeMultiplier,
      operandMultiplier: nextOperandMultiplier,
      skipInGameRevive,
      ...(isStageMode && stageId ? { stageId, customConfig, isStageMode: true } : {}),
    });
  };

  const handleSpendCoinsContinue = async () => {
    const ok = await spendCoins(5);
    if (!ok) return;
    continueAfterFail(true); // skipInGameRevive=true → forces next fail to result screen
  };

  const handleWatchAdContinue = () => {
    if (watchingAd || !isRewardedReady) return;
    setWatchingAd(true);
    showRewarded(
      async () => {
        await addCoin(10);
        continueAfterFail(true); // skipInGameRevive=true after ad continue too
      },
      () => setWatchingAd(false),
    );
  };

  const goHome = () => {
    playSound('tap');
    if (stageCompleted) {
      navigation.navigate('DecimalMap');
    } else {
      navigation.navigate('Home');
    }
  };

  const goNextStage = () => {
    if (!nextStageInfo) { navigation.navigate('DecimalMap'); return; }
    playSound('tap');
    navigation.replace('Game', {
      difficulty: 'decimal',
      stageId: nextStageId,
      customConfig: DECIMAL_STAGE_CONFIG(nextStageId),
      totalFails: 0,
      timeMultiplier: 1,
      operandMultiplier: 1,
      isStageMode: true,
    });
  };

  const getRealmInfo = (pct) => {
    if (pct >= 95) return { name: 'Celestial',   emoji: '🌌', color: '#FFD700' };
    if (pct >= 80) return { name: 'Primordial',  emoji: '👑', color: '#CC44FF' };
    if (pct >= 65) return { name: 'Golden Core', emoji: '💎', color: '#0099FF' };
    if (pct >= 50) return { name: 'Foundation',  emoji: '🔥', color: '#FF6600' };
    if (pct >= 30) return { name: 'Qi Training', emoji: '⚡', color: '#00CC88' };
    if (pct >= 15) return { name: 'Beginner',    emoji: '⭐', color: '#AABBCC' };
    return           { name: 'Mortal',      emoji: '🌱', color: '#778899' };
  };

  const realmPct = Math.min(100, Math.round((highScore / MAX_REALM_SCORE) * 100));
  const realmInfo = getRealmInfo(realmPct);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={styles.backgroundGradient}
      >
        {/* White flash on entry */}
        <Animated.View pointerEvents="none" style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: '#ffffff',
          opacity: flashAnim,
          zIndex: 9998,
        }} />

        {/* Celebration particles */}
        {PARTICLES.map(p => <ConfettiParticle key={p.id} {...p} />)}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            width: '100%',
          }}>

          {/* ── Score + stats ── */}
          <View style={styles.scoreSection}>
            {isNewRecord && (
              <LinearGradient colors={GRADIENTS.gold} style={styles.newRecordInline}>
                <Text style={styles.newRecordInlineText}>{t('newRecord')}</Text>
              </LinearGradient>
            )}

            <Text style={styles.scoreLabel}>{t('totalScore')}</Text>
            <Animated.Text style={[styles.mainScore, {
              transform: [{ scale: scoreScale }],
              opacity: glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.85, 1] }),
            }]}>
              {displayScore}
            </Animated.Text>

            <View style={styles.barRow}>
              <Text style={styles.barLabel}>{t('accuracy')}</Text>
              <Text style={styles.barValue}>{Math.round(accuracy)}%</Text>
            </View>
            <View style={styles.trackBar}>
              <Animated.View style={[styles.trackFill, {
                width: bar1Anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${accuracy}%`] }),
                backgroundColor: accuracy >= 70 ? COLORS.correct : COLORS.wrong,
              }]} />
            </View>

            <View style={[styles.barRow, { marginTop: 14 }]}>
              <Text style={styles.barLabel}>Speed</Text>
              <Text style={[styles.barValue, { color: realmInfo.color }]}>{realmPct}%</Text>
            </View>
            <View style={styles.trackBar}>
              <Animated.View style={[styles.trackFill, {
                width: bar2Anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${realmPct}%`] }),
                backgroundColor: realmInfo.color,
              }]} />
            </View>
            <Text style={styles.realmSub}>
              {`Best: ${highScore} pts`}
            </Text>

            <Animated.View style={[styles.statsGrid, {
              opacity: statsAnim,
              transform: [{ scale: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            }]}>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: COLORS.correct }]}>{correctCount}</Text>
                <Text style={styles.statLabel2}>{t('correctAnswers')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: COLORS.wrong }]}>{totalQuestions - correctCount}</Text>
                <Text style={styles.statLabel2}>Wrong</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalQuestions}</Text>
                <Text style={styles.statLabel2}>Total</Text>
              </View>
            </Animated.View>
          </View>

          {/* ── Action Buttons ── */}
          <Animated.View style={[styles.actionButtons, { transform: [{ translateY: btnAnim }] }]}>
            {stageCompleted ? (
              <>
                {nextStageInfo ? (
                  <TouchableOpacity style={styles.primaryButton} onPress={goNextStage} activeOpacity={0.8}>
                    <LinearGradient colors={[nextStageInfo.color + 'cc', nextStageInfo.color]} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={styles.btnText}>
                        {`Next: Stage ${nextStageInfo.label} — ${nextStageInfo.sectionName}`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.primaryButton} onPress={goHome} activeOpacity={0.8}>
                    <LinearGradient colors={['#FFD700', '#FF8C00']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={styles.btnText}>🏆 All stages cleared!</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.secondaryButton} onPress={goHome} activeOpacity={0.8}>
                  <Text style={[styles.btnText, { color: COLORS.textSecondary }]}>
                    {'← Realm Map'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : failed ? (
              <>
                {walletCoins >= 5 ? (
                  // Enough coins — spend 5 to retry
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSpendCoinsContinue} activeOpacity={0.8}>
                    <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={styles.btnText}>🪙 Use 5 coins — Keep playing</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  // Not enough coins — send to store to earn coins
                  <>
                    <Text style={styles.earnCoinsHint}>
                      {`You have ${walletCoins} 🪙 in your wallet.\nWatch an ad to earn 10 coins and keep playing.`}
                    </Text>
                    <TouchableOpacity
                      style={[styles.primaryButton, (!isRewardedReady || watchingAd) && { opacity: 0.45 }]}
                      onPress={handleWatchAdContinue}
                      disabled={!isRewardedReady || watchingAd}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.btnText}>
                          {watchingAd ? 'Loading...' : '▶ Earn coins'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={continueAfterFail} activeOpacity={0.8}>
                <LinearGradient colors={GRADIENTS.danger} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.btnText}>
                    {'Continue'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {!stageCompleted && (
              <TouchableOpacity style={styles.secondaryButton} onPress={goHome} activeOpacity={0.8}>
                <Text style={[styles.btnText, { color: COLORS.textSecondary }]}>
                  {t('home')}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* ── Details at very bottom ── */}
          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => setShowDetails(!showDetails)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsToggleText}>
              {showDetails ? `▲ ${t('hideDetails')}` : `▼ ${t('details')}`}
            </Text>
          </TouchableOpacity>

          {showDetails && (
            <View style={styles.detailsList}>
              {gameResults.map((result, index) => (
                <View
                  key={index}
                  style={[
                    styles.detailItem,
                    {
                      backgroundColor: result.correct ? COLORS.correctBg : COLORS.wrongBg,
                      borderLeftColor: result.correct ? COLORS.correct : COLORS.wrong,
                    },
                  ]}
                >
                  <View style={styles.detailLeft}>
                    <Text style={styles.detailNumber}>#{index + 1}</Text>
                    <Text style={styles.detailQuestion}>{result.question}</Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={[styles.detailIcon, { color: result.correct ? COLORS.correct : COLORS.wrong }]}>
                      {result.correct ? '✓' : '✗'}
                    </Text>
                    {!result.correct && (
                      <Text style={styles.correctAnswerSmall}>= {result.correctAnswer}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          </Animated.View>
        </ScrollView>

        {/* Banner Ad */}
        {Platform.OS !== 'web' && (
          <AdBanner style={styles.adBanner} />
        )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  newRecordInline: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  newRecordInlineText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: 'bold',
  },
  scoreSection: {
    alignItems: 'center',
    width: '100%',
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  mainScore: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.accentYellow,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 14,
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  barValue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  trackBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  realmSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.surface,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel2: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  difficultyBadge: {
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  difficultyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  detailsToggle: {
    marginTop: 14,
    marginBottom: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailsToggleText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  detailsList: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailNumber: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginRight: 10,
    width: 25,
  },
  detailQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailRight: {
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  correctAnswerSmall: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  failCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  failTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 6,
  },
  failSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  failPenalties: {
    gap: 4,
    alignItems: 'flex-start',
  },
  failPenaltyItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  nextRoundCard: {
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  nextRoundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  nextRoundSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  nextRoundItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  actionButtons: {
    marginTop: 24,
    gap: 10,
  },
  primaryButton: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  earnCoinsHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tipsContainer: {
    marginTop: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 12,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  adBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
  },
});

export default ResultScreen;
