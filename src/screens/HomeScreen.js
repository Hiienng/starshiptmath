import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants/colors';
import { DIFFICULTY_CONFIG } from '../utils/mathGenerator';
import { getHighScores } from '../utils/storage';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import AdBanner from '../components/AdBanner';

const { width, height } = Dimensions.get('window');

// Generate random stars
const generateStars = (count) => {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      delay: Math.random() * 2000,
    });
  }
  return stars;
};

const STARS = generateStars(50);

// Animated Star Component
const Star = ({ star }) => {
  const pulseAnim = useRef(new Animated.Value(star.opacity)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: star.opacity + 0.3,
          duration: 1500 + star.delay,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: star.opacity,
          duration: 1500 + star.delay,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: `${star.left}%`,
          top: `${star.top}%`,
          width: star.size,
          height: star.size,
          opacity: pulseAnim,
        },
      ]}
    />
  );
};

const HomeScreen = ({ navigation }) => {
  const [highScores, setHighScores] = useState({});
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const universeGlowAnim = useRef(new Animated.Value(0)).current;
  const universePulseAnim = useRef(new Animated.Value(1)).current;
  const { language, changeLanguage, t } = useLanguage();

  useEffect(() => {
    loadHighScores();
    const unsubscribe = navigation.addListener('focus', loadHighScores);

    // Float animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Universe card glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(universeGlowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(universeGlowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Universe pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(universePulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(universePulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return unsubscribe;
  }, [navigation]);

  const loadHighScores = async () => {
    const scores = await getHighScores();
    setHighScores(scores);
  };

  const startGame = (difficulty) => {
    navigation.navigate('Game', { difficulty });
  };

  const getDifficultyGradient = (key) => {
    return GRADIENTS[key] || GRADIENTS.primary;
  };

  const getDifficultyName = (key) => {
    return t(key);
  };

  const getDifficultyDesc = (key) => {
    return t(`${key}Desc`);
  };

  // Special Universe Card with glowing dark vibe
  const renderUniverseCard = (config) => {
    const highScore = highScores['universe'];

    return (
      <TouchableOpacity
        key="universe"
        activeOpacity={0.9}
        onPress={() => startGame('universe')}
        style={styles.universeCardWrapper}
      >
        <Animated.View style={[styles.universeCardOuter, { transform: [{ scale: universePulseAnim }] }]}>
          {/* Animated glow border */}
          <Animated.View style={[styles.universeGlowBorder, { opacity: universeGlowAnim }]} />

          {/* Main card */}
          <LinearGradient
            colors={['#0a0014', '#1a0033', '#0d001a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.universeCard}
          >
            {/* Animated stars inside card */}
            <View style={styles.universeStars}>
              {[...Array(15)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.universeStar,
                    {
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      opacity: universeGlowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.8],
                      }),
                    },
                  ]}
                />
              ))}
            </View>

            {/* Purple glow orbs */}
            <View style={styles.universeOrb1} />
            <View style={styles.universeOrb2} />

            {/* Top glow line */}
            <Animated.View
              style={[
                styles.universeTopGlow,
                {
                  opacity: universeGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  })
                }
              ]}
            />

            <View style={styles.cardContent}>
              <View style={styles.cardLeft}>
                <View style={styles.universeEmojiContainer}>
                  <Text style={styles.universeEmoji}>{config.emoji}</Text>
                  <Animated.View
                    style={[
                      styles.universeEmojiGlow,
                      {
                        opacity: universeGlowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.2, 0.6],
                        })
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.cardCenter}>
                <View style={styles.universeTitleRow}>
                  <Text style={styles.universeTitle}>{getDifficultyName('universe')}</Text>
                  <View style={styles.universeBadge}>
                    <Text style={styles.universeBadgeText}>★ ULTIMATE</Text>
                  </View>
                </View>
                <Text style={styles.universeDescription}>{getDifficultyDesc('universe')}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.universeStatValue}>{config.questionsCount}</Text>
                    <Text style={styles.universeStatLabel}>{t('questions')}</Text>
                  </View>
                  <View style={styles.universeStatDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.universeStatValue}>{config.timePerQuestion}s</Text>
                    <Text style={styles.universeStatLabel}>{t('perQuestion')}</Text>
                  </View>
                  <View style={styles.universeStatDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.universeStatValue}>{config.operations.join('')}</Text>
                    <Text style={styles.universeStatLabel}>{t('operations')}</Text>
                  </View>
                </View>

                {highScore && (
                  <View style={styles.universeHighScoreRow}>
                    <Text style={styles.universeHighScoreText}>
                      🏆 {highScore.score} {t('points')} ({Math.round(highScore.accuracy)}%)
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardRight}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.universePlayIcon}
                >
                  <Text style={styles.playIconText}>▶</Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderDifficultyCard = (key, config, index) => {
    // Use special card for Universe
    if (key === 'universe') {
      return renderUniverseCard(config);
    }

    const highScore = highScores[key];

    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.9}
        onPress={() => startGame(key)}
        style={styles.cardWrapper}
      >
        <LinearGradient
          colors={getDifficultyGradient(key)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.difficultyCard}
        >
          {/* Glow effect */}
          <View style={styles.cardGlow} />

          {/* Grid pattern */}
          <View style={styles.gridPattern}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={styles.gridLine} />
            ))}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardLeft}>
              <View style={styles.emojiContainer}>
                <Text style={styles.cardEmoji}>{config.emoji}</Text>
              </View>
            </View>

            <View style={styles.cardCenter}>
              <Text style={styles.cardTitle}>{getDifficultyName(key)}</Text>
              <Text style={styles.cardDescription}>{getDifficultyDesc(key)}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{config.questionsCount}</Text>
                  <Text style={styles.statLabel}>{t('questions')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{config.timePerQuestion}s</Text>
                  <Text style={styles.statLabel}>{t('perQuestion')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{config.operations.join('')}</Text>
                  <Text style={styles.statLabel}>{t('operations')}</Text>
                </View>
              </View>

              {highScore && (
                <View style={styles.highScoreRow}>
                  <Text style={styles.highScoreText}>
                    🏆 {highScore.score} {t('points')} ({Math.round(highScore.accuracy)}%)
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardRight}>
              <View style={styles.playIcon}>
                <Text style={styles.playIconText}>▶</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />

      {/* Deep space background */}
      <LinearGradient
        colors={['#050510', '#0a0a1a', '#0f0f2a', '#0a0a1a', '#050510']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        style={styles.backgroundGradient}
      >
        {/* Stars layer */}
        <View style={styles.starsContainer}>
          {STARS.map((star) => (
            <Star key={star.id} star={star} />
          ))}
        </View>

        {/* Nebula effects */}
        <View style={styles.nebula1} />
        <View style={styles.nebula2} />
        <View style={styles.nebula3} />

        {/* Scanning lines effect */}
        <View style={styles.scanLines} />

        {/* Language Selector */}
        <View style={styles.languageSelector}>
          <TouchableOpacity
            style={[
              styles.langButton,
              language === LANGUAGES.vi && styles.langButtonActive,
            ]}
            onPress={() => changeLanguage(LANGUAGES.vi)}
          >
            <Text style={[
              styles.langButtonText,
              language === LANGUAGES.vi && styles.langButtonTextActive,
            ]}>VI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.langButton,
              language === LANGUAGES.en && styles.langButtonActive,
            ]}
            onPress={() => changeLanguage(LANGUAGES.en)}
          >
            <Text style={[
              styles.langButtonText,
              language === LANGUAGES.en && styles.langButtonTextActive,
            ]}>EN</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            {/* Animated Logo */}
            <Animated.View
              style={[
                styles.logoContainer,
                { transform: [{ translateY: floatAnim }] },
              ]}
            >
            <Image
              source={{ uri: 'https://ik.imagekit.io/hiien/smartmath/assets/ship2.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            </Animated.View>

            {/* Title with tech style */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('appName')}</Text>
              <LinearGradient
                colors={['#00D9FF', '#6C63FF', '#FF6B9D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.titleAccentBg}
              >
                <Text style={styles.titleAccent}>{t('appNameAccent')}</Text>
              </LinearGradient>
            </View>

            <Text style={styles.subtitle}>
              {t('subtitle')}
            </Text>

            {/* Tech decorative line */}
            <View style={styles.techLine}>
              <View style={styles.techDot} />
              <View style={styles.techLineInner} />
              <View style={styles.techDot} />
            </View>
          </View>

          {/* Difficulty Cards */}
          <View style={styles.cardsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionTitle}>{t('selectChallenge')}</Text>
              <View style={styles.sectionLine} />
            </View>

            {Object.entries(DIFFICULTY_CONFIG).map(([key, config], index) =>
              renderDifficultyCard(key, config, index)
            )}
          </View>

          {/* Footer tip */}
          <View style={styles.tipContainer}>
            <View style={styles.tipCard}>
              <View style={styles.tipGlow} />
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>
                {t('tip')}
              </Text>
            </View>
          </View>

          {/* Version info */}
          <Text style={styles.versionText}>v1.0.0 • {t('poweredBy')}</Text>
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
    backgroundColor: '#050510',
  },
  backgroundGradient: {
    flex: 1,
  },
  languageSelector: {
    position: 'absolute',
    top: 45,
    right: 15,
    flexDirection: 'row',
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  langButtonActive: {
    backgroundColor: '#6C63FF',
  },
  langButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
  },
  langButtonTextActive: {
    color: '#FFFFFF',
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  nebula1: {
    position: 'absolute',
    top: 50,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#6C63FF',
    opacity: 0.05,
    transform: [{ scaleX: 1.5 }],
  },
  nebula2: {
    position: 'absolute',
    top: 400,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#00D9FF',
    opacity: 0.04,
  },
  nebula3: {
    position: 'absolute',
    bottom: 200,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FF6B9D',
    opacity: 0.03,
  },
  scanLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.02,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOuter: {
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 70,
    backgroundColor: '#6C63FF',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  logoBg: {
    width: 100,
    height: 100,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  orbitRing1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    borderStyle: 'dashed',
  },
  orbitRing2: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  titlePrefix: {
    fontSize: 12,
    color: '#00D9FF',
    letterSpacing: 4,
    fontWeight: '600',
    marginBottom: 5,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
    textShadowColor: '#6C63FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  titleAccentBg: {
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 5,
  },
  titleAccent: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 12,
  },
  subtitle: {
    fontSize: 11,
    color: '#6C63FF',
    marginTop: 15,
    letterSpacing: 2,
    fontWeight: '600',
  },
  techLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  techDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D9FF',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  techLineInner: {
    width: 100,
    height: 2,
    backgroundColor: 'rgba(0, 217, 255, 0.3)',
    marginHorizontal: 10,
  },
  cardsSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(108, 99, 255, 0.3)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C63FF',
    marginHorizontal: 15,
    letterSpacing: 3,
  },
  cardWrapper: {
    marginBottom: 15,
  },
  difficultyCard: {
    borderRadius: 16,
    padding: 18,
    overflow: 'hidden',
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.05,
  },
  gridLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#fff',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: {
    marginRight: 15,
  },
  emojiContainer: {
    width: 55,
    height: 55,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardEmoji: {
    fontSize: 30,
  },
  cardCenter: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 2,
    letterSpacing: 1,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 10,
  },
  highScoreRow: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  highScoreText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  cardRight: {
    marginLeft: 10,
  },
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  playIconText: {
    color: COLORS.white,
    fontSize: 16,
    marginLeft: 2,
  },
  tipContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    overflow: 'hidden',
  },
  tipGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#6C63FF',
    opacity: 0.5,
  },
  tipIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 11,
    color: 'rgba(108, 99, 255, 0.5)',
    letterSpacing: 1,
  },
  // Universe Card Styles
  universeCardWrapper: {
    marginBottom: 15,
    marginTop: 10,
  },
  universeCardOuter: {
    position: 'relative',
  },
  universeGlowBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  universeCard: {
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
    minHeight: 130,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  universeStars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  universeStar: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#C084FC',
    borderRadius: 1,
  },
  universeOrb1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B5CF6',
    opacity: 0.15,
  },
  universeOrb2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A855F7',
    opacity: 0.1,
  },
  universeTopGlow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#A855F7',
    borderRadius: 1,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  universeEmojiContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    position: 'relative',
  },
  universeEmoji: {
    fontSize: 32,
  },
  universeEmojiGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    zIndex: -1,
  },
  universeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  universeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E9D5FF',
    letterSpacing: 2,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  universeBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  universeBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#C084FC',
    letterSpacing: 1,
  },
  universeDescription: {
    fontSize: 12,
    color: 'rgba(233, 213, 255, 0.6)',
    marginBottom: 10,
  },
  universeStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E9D5FF',
  },
  universeStatLabel: {
    fontSize: 9,
    color: 'rgba(192, 132, 252, 0.7)',
  },
  universeStatDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    marginHorizontal: 10,
  },
  universeHighScoreRow: {
    marginTop: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  universeHighScoreText: {
    fontSize: 11,
    color: '#E9D5FF',
    fontWeight: '600',
  },
  universePlayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  adBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 5, 16, 0.9)',
  },
});

export default HomeScreen;
