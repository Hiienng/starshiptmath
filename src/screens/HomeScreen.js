import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DIFFICULTY_CONFIG } from '../utils/mathGenerator';
import { getHighScores } from '../utils/storage';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import { loadSounds, playSound } from '../utils/soundManager';
import AdBanner from '../components/AdBanner';

// Planet images — place these files in assets/
const PLANET_IMAGES = {
  easy:     require('../../assets/venus.png'),
  medium:   require('../../assets/jupiter.png'),
  hard:     require('../../assets/mars.png'),
  expert:   require('../../assets/saturn.png'),
  universe: require('../../assets/blackhole.png'),
};

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
  const [cardsWidth, setCardsWidth] = useState(0);
  const isTablet = cardsWidth >= 640;
  const [highScores, setHighScores] = useState({});
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const universePulseAnim = useRef(new Animated.Value(1)).current;
  const { language, changeLanguage, t } = useLanguage();

  useEffect(() => {
    loadSounds();
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
    playSound('tap');
    navigation.navigate('Game', {
      difficulty,
      totalFails: 0,
      timeMultiplier: 1,
      operandMultiplier: 1,
    });
  };

  // Per-level neon color
  const CARD_COLOR = {
    easy:     '#00E5FF',
    medium:   '#FF4DB8',
    hard:     '#FF6D3B',
    expert:   '#AA44FF',
    universe: '#8B5CF6',
  };

  const renderDifficultyCard = (key) => {
    const highScore = highScores[key];
    const color = CARD_COLOR[key];
    const isUniverse = key === 'universe';

    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.78}
        onPress={() => startGame(key)}
        style={[styles.cardWrapper, isTablet && styles.cardWrapperTablet]}
      >
        <Animated.View style={[styles.difficultyCard, isUniverse && { transform: [{ scale: universePulseAnim }] }]}>
          {/* Universe: right 2/3 of blackhole.png on left half */}
          {isUniverse && (
            <View style={styles.universeBgContainer}>
              <Image
                source={require('../../assets/blackhole.png')}
                style={styles.universeBgImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Planet image in colored circle */}
          <View style={[styles.iconCircle, { backgroundColor: color + '30' }]}>
            <Image source={PLANET_IMAGES[key]} style={styles.planetImage} resizeMode="contain" />
          </View>

          {/* Title + description */}
          <View style={styles.cardCenter}>
            <Text style={styles.cardTitle}>{t(key)}</Text>
            <Text style={styles.cardDescription}>{t(`${key}Desc`)}</Text>
          </View>

          {/* Top-right: best score badge */}
          {highScore ? (
            <View style={styles.scoreTag}>
              <View style={[styles.scoreDot, { backgroundColor: '#FFD600' }]} />
              <Text style={styles.scoreTagText}>{highScore.score} pts</Text>
            </View>
          ) : (
            <View style={styles.scoreTag}>
              <View style={[styles.scoreDot, { backgroundColor: color }]} />
              <Text style={[styles.scoreTagText, { color }]}>—</Text>
            </View>
          )}
        </Animated.View>
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
          <View
            style={[styles.cardsSection, isTablet && styles.cardsSectionTablet]}
            onLayout={e => setCardsWidth(e.nativeEvent.layout.width)}
          >
            <View style={[styles.sectionHeader, isTablet && { width: '100%' }]}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionTitle}>{t('selectChallenge')}</Text>
              <View style={styles.sectionLine} />
            </View>

            {Object.entries(DIFFICULTY_CONFIG).map(([key, config], index) =>
              renderDifficultyCard(key, config, index)
            )}
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
    letterSpacing: 3,
    fontWeight: '600',
    textAlign: 'center',
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
  cardsSectionTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapperTablet: {
    width: '48%',
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
    marginBottom: 12,
  },
  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1e2e',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    overflow: 'hidden',
  },
  universeBgContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  universeBgImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '150%',
    opacity: 0.22,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planetImage: {
    width: 42,
    height: 42,
  },
  cardCenter: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
  },
  scoreTag: {
    position: 'absolute',
    top: 14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 11,
    color: 'rgba(108, 99, 255, 0.5)',
    letterSpacing: 1,
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
