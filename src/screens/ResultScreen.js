import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, GRADIENTS } from '../constants/colors';
import { DIFFICULTY_CONFIG, getRank } from '../utils/mathGenerator';
import { saveHighScore } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const ResultScreen = ({ route, navigation }) => {
  const { difficulty, score, correctCount, totalQuestions, gameResults } =
    route.params;
  const config = DIFFICULTY_CONFIG[difficulty];
  const { t, language } = useLanguage();

  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const accuracy = (correctCount / totalQuestions) * 100;
  const rankInfo = getRank(accuracy);

  useEffect(() => {
    checkHighScore();

    // Entrance animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotation for rank badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for new record
    if (isNewRecord) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    if (accuracy >= 70) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isNewRecord]);

  const checkHighScore = async () => {
    const newRecord = await saveHighScore(difficulty, score, accuracy);
    setIsNewRecord(newRecord);
    if (newRecord) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const playAgain = () => {
    navigation.replace('Game', { difficulty });
  };

  const goHome = () => {
    navigation.navigate('Home');
  };

  const getGradientByRank = () => {
    switch (rankInfo.rank) {
      case 'S': return GRADIENTS.gold;
      case 'A': return GRADIENTS.success;
      case 'B': return GRADIENTS.primary;
      default: return [COLORS.surface, COLORS.backgroundCard];
    }
  };

  const getRankTitle = (acc) => {
    if (acc >= 90) return t('excellent');
    if (acc >= 70) return t('great');
    if (acc >= 50) return t('good');
    return t('keepPracticing');
  };

  const getDifficultyName = () => {
    return t(difficulty);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight]}
        style={styles.backgroundGradient}
      >
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.decorCircle3} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Rank Section */}
          <Animated.View
            style={[
              styles.rankSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { rotate: spin }],
              },
            ]}
          >
            <LinearGradient
              colors={getGradientByRank()}
              style={styles.rankCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.rankGlow} />
              <Text style={styles.rankEmoji}>{rankInfo.emoji}</Text>
              <Text style={styles.rankLabel}>{language === 'vi' ? 'Hạng' : 'Rank'}</Text>
              <Text style={styles.rankValue}>{rankInfo.rank}</Text>
              <Text style={styles.rankTitle}>{getRankTitle(accuracy)}</Text>
            </LinearGradient>
          </Animated.View>

          {/* New Record Badge */}
          {isNewRecord && (
            <Animated.View
              style={[styles.newRecordContainer, { transform: [{ scale: pulseAnim }] }]}
            >
              <LinearGradient
                colors={GRADIENTS.gold}
                style={styles.newRecordBadge}
              >
                <Text style={styles.newRecordText}>🏆 {t('newRecord')}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Score Display */}
          <Animated.View
            style={[
              styles.scoreSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.mainScoreCard}>
              <Text style={styles.scoreLabel}>{t('totalScore')}</Text>
              <Text style={styles.mainScore}>{score}</Text>
              <View style={styles.accuracyBar}>
                <View
                  style={[
                    styles.accuracyFill,
                    {
                      width: `${accuracy}%`,
                      backgroundColor: accuracy >= 70 ? COLORS.correct : COLORS.wrong,
                    },
                  ]}
                />
              </View>
              <Text style={styles.accuracyText}>{Math.round(accuracy)}% {t('accuracy')}</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <LinearGradient colors={GRADIENTS.success} style={styles.statIconBg}>
                  <Text style={styles.statIcon}>✓</Text>
                </LinearGradient>
                <Text style={styles.statNumber}>{correctCount}</Text>
                <Text style={styles.statLabel2}>{t('correctAnswers')}</Text>
              </View>

              <View style={styles.statBox}>
                <LinearGradient colors={GRADIENTS.danger} style={styles.statIconBg}>
                  <Text style={styles.statIcon}>✗</Text>
                </LinearGradient>
                <Text style={styles.statNumber}>{totalQuestions - correctCount}</Text>
                <Text style={styles.statLabel2}>{language === 'vi' ? 'Sai' : 'Wrong'}</Text>
              </View>

              <View style={styles.statBox}>
                <LinearGradient colors={GRADIENTS.primary} style={styles.statIconBg}>
                  <Text style={styles.statIcon}>📝</Text>
                </LinearGradient>
                <Text style={styles.statNumber}>{totalQuestions}</Text>
                <Text style={styles.statLabel2}>{language === 'vi' ? 'Tổng câu' : 'Total'}</Text>
              </View>
            </View>

            {/* Difficulty Badge */}
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>
                {config.emoji} {getDifficultyName()}
              </Text>
            </View>
          </Animated.View>

          {/* Details Toggle */}
          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => setShowDetails(!showDetails)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[COLORS.surface, COLORS.backgroundCard]}
              style={styles.detailsToggleInner}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? `▲ ${t('hideDetails')}` : `▼ ${t('details')}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Details List */}
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
                    <Text
                      style={[
                        styles.detailIcon,
                        { color: result.correct ? COLORS.correct : COLORS.wrong },
                      ]}
                    >
                      {result.correct ? '✓' : '✗'}
                    </Text>
                    {!result.correct && (
                      <Text style={styles.correctAnswerSmall}>
                        = {result.correctAnswer}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={playAgain}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={GRADIENTS.primary}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>🔄 {t('playAgain').toUpperCase()}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={goHome}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>🏠 {t('home')}</Text>
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            {accuracy < 70 && (
              <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>💡</Text>
                <Text style={styles.tipText}>
                  {language === 'vi' ? 'Thử mức độ dễ hơn để luyện tập nhé!' : 'Try an easier level to practice!'}
                </Text>
              </View>
            )}
            {accuracy >= 90 && accuracy < 100 && (
              <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>💪</Text>
                <Text style={styles.tipText}>
                  {language === 'vi' ? 'Tuyệt vời! Thử mức khó hơn nhé!' : 'Great! Try a harder level!'}
                </Text>
              </View>
            )}
            {accuracy === 100 && (
              <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>🌟</Text>
                <Text style={styles.tipText}>
                  {language === 'vi' ? 'Hoàn hảo! Bạn là thiên tài toán học!' : 'Perfect! You are a math genius!'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
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
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    opacity: 0.1,
  },
  decorCircle3: {
    position: 'absolute',
    top: 200,
    left: 50,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    opacity: 0.1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  rankSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rankCard: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  rankGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rankEmoji: {
    fontSize: 50,
    marginBottom: 5,
  },
  rankLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  rankValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: -5,
  },
  rankTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  newRecordContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  newRecordBadge: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 25,
  },
  newRecordText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreSection: {
    marginBottom: 20,
  },
  mainScoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 15,
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
  accuracyBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 4,
    marginTop: 15,
    overflow: 'hidden',
  },
  accuracyFill: {
    height: '100%',
    borderRadius: 4,
  },
  accuracyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
    color: COLORS.white,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel2: {
    fontSize: 12,
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
    marginBottom: 15,
  },
  detailsToggleInner: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailsToggleText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
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
  actionButtons: {
    marginTop: 10,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
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
});

export default ResultScreen;
