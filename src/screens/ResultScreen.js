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

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#6C63FF', '#FF6B9D', '#00E5FF', '#FF4DB8'];

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 6 + (i % 4) * 3,
  startX: SW * 0.1 + (i / 22) * SW * 0.8,
  angle: (i / 22) * Math.PI * 2,
  radius: 80 + (i % 5) * 40,
  delay: (i % 6) * 80,
}));

const ConfettiParticle = ({ color, size, startX, angle, radius, delay }) => {
  const y     = useRef(new Animated.Value(0)).current;
  const x     = useRef(new Animated.Value(0)).current;
  const alpha = useRef(new Animated.Value(0)).current;
  const rot   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dx = Math.cos(angle) * radius;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(alpha, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(x, { toValue: dx, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: SH * 0.55, duration: 1600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(alpha, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
  }, []);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX,
        top: SH * 0.12,
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: color,
        opacity: alpha,
        transform: [{ translateX: x }, { translateY: y }, { rotate }],
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
import useInterstitialAd from '../hooks/useInterstitialAd';
import AdBanner from '../components/AdBanner';



const ResultScreen = ({ route, navigation }) => {
  const {
    difficulty, score, correctCount, totalQuestions, gameResults,
    failed = false,
    totalFails = 0,
    nextTimeMultiplier = 1,
    nextOperandMultiplier = 1,
    mustWatchAd = false,
  } = route.params;
  const config = DIFFICULTY_CONFIG[difficulty];
  const { t, language } = useLanguage();
  const { showAd } = useInterstitialAd();

  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(score);

  // Max realm score = 5 perfect rounds (questionsCount × 20pts × 5)
  const MAX_REALM_SCORE = config.questionsCount * 20 * 5;

  // Animations
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(60)).current;
  const scaleAnim  = useRef(new Animated.Value(0.82)).current;
  const scoreScale = useRef(new Animated.Value(0.4)).current;
  const bar1Anim   = useRef(new Animated.Value(0)).current;
  const bar2Anim   = useRef(new Animated.Value(0)).current;
  const statsAnim  = useRef(new Animated.Value(0)).current;
  const btnAnim    = useRef(new Animated.Value(40)).current;

  const accuracy = (correctCount / totalQuestions) * 100;

  useEffect(() => {
    checkHighScore();
    if (Platform.OS !== 'web') showAd(mustWatchAd);

    // Staggered entrance
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(scoreScale, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(bar1Anim, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(bar2Anim, { toValue: 1, duration: 600, delay: 120, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.spring(statsAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(btnAnim,   { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    if (failed) {
      playSound('wrong');
    } else {
      playSound('complete');
      if (accuracy >= 70) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const continueAfterFail = () => {
    playSound('tap');
    navigation.replace('Game', {
      difficulty,
      totalFails,
      timeMultiplier: nextTimeMultiplier,
      operandMultiplier: nextOperandMultiplier,
    });
  };

  const goHome = () => {
    playSound('tap');
    navigation.navigate('Home');
  };

  const getRealmInfo = (pct) => {
    if (pct >= 95) return { name: 'Thiên Đạo',  emoji: '🌌', color: '#FFD700' };
    if (pct >= 80) return { name: 'Nguyên Anh', emoji: '👑', color: '#CC44FF' };
    if (pct >= 65) return { name: 'Kim Đan',    emoji: '💎', color: '#0099FF' };
    if (pct >= 50) return { name: 'Trúc Cơ',   emoji: '🔥', color: '#FF6600' };
    if (pct >= 30) return { name: 'Luyện Khí',  emoji: '⚡', color: '#00CC88' };
    if (pct >= 15) return { name: 'Nhập Môn',   emoji: '⭐', color: '#AABBCC' };
    return           { name: 'Thường Nhân', emoji: '🌱', color: '#778899' };
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
            <Animated.Text style={[styles.mainScore, { transform: [{ scale: scoreScale }] }]}>
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
              <Text style={styles.barLabel}>
                {language === 'vi' ? 'Độ nhanh' : 'Speed'}
              </Text>
              <Text style={[styles.barValue, { color: realmInfo.color }]}>{realmPct}%</Text>
            </View>
            <View style={styles.trackBar}>
              <Animated.View style={[styles.trackFill, {
                width: bar2Anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${realmPct}%`] }),
                backgroundColor: realmInfo.color,
              }]} />
            </View>
            <Text style={styles.realmSub}>
              {language === 'vi' ? `Kỷ lục: ${highScore} pts` : `Best: ${highScore} pts`}
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
                <Text style={styles.statLabel2}>{language === 'vi' ? 'Sai' : 'Wrong'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalQuestions}</Text>
                <Text style={styles.statLabel2}>{language === 'vi' ? 'Tổng câu' : 'Total'}</Text>
              </View>
            </Animated.View>
          </View>

          {/* ── Action Buttons ── */}
          <Animated.View style={[styles.actionButtons, { transform: [{ translateY: btnAnim }] }]}>
            <TouchableOpacity style={styles.primaryButton} onPress={continueAfterFail} activeOpacity={0.8}>
              <LinearGradient colors={GRADIENTS.danger} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.btnText}>
                  {language === 'vi' ? 'Thử lại' : 'Try Again'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={goHome} activeOpacity={0.8}>
              <Text style={[styles.btnText, { color: COLORS.textSecondary }]}>
                {t('home')}
              </Text>
            </TouchableOpacity>
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
