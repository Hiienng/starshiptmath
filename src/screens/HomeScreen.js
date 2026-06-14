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
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DIFFICULTY_CONFIG } from '../utils/mathGenerator';
import { getHighScores } from '../utils/storage';
import { getCoins } from '../utils/itemStorage';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import { loadSounds, playSound } from '../utils/soundManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '../constants/fonts';
import MenuButton from '../components/MenuButton';
import BuyCoinsModal from '../components/BuyCoinsModal';
import AdBanner from '../components/AdBanner';

const COIN_IMG = require('../../assets/coin.png');

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
  const { width: SW, height: SH } = useWindowDimensions();
  const isTablet = SW >= 768;
  // Scale factor: 1.0 on phone, up to ~1.45 on large iPad
  const ts = isTablet ? Math.min(SW / 640, 1.5) : 1;
  // Hero (logo/title/subtitle) is pinned to the top third of the screen and
  // shrunk to fit via a transform — only the cards below it scroll.
  const heroHeight = SH / 3;
  const [heroNaturalHeight, setHeroNaturalHeight] = useState(0);
  const heroScale = heroNaturalHeight > 0 ? Math.min(1, heroHeight / heroNaturalHeight) : 1;
  const [highScores, setHighScores] = useState({});
  const [coins, setCoins] = useState(0);
  const [buyCoinsVisible, setBuyCoinsVisible] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const universePulseAnim = useRef(new Animated.Value(1)).current;
  const { language, changeLanguage, t } = useLanguage();

  useEffect(() => {
    loadSounds();
    loadHighScores();
    loadCoins();
    const unsubscribe = navigation.addListener('focus', () => {
      loadHighScores();
      loadCoins();
    });

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

  const loadCoins = async () => {
    const balance = await getCoins();
    setCoins(balance);
  };

  const startGame = (difficulty) => {
    playSound('tap');
    if (difficulty === 'easy') {
      navigation.navigate('DecimalMap');
      return;
    }
    if (difficulty === 'medium') {
      navigation.navigate('Jupiter', { level: 1 });
      return;
    }
    if (difficulty === 'hard') {
      navigation.navigate('Mars', { level: 1 });
      return;
    }
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
    const iconSize  = Math.round(70 * ts);
    const imgSize   = Math.round(54 * ts);
    const cardPad   = Math.round(16 * ts);

    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.78}
        onPress={() => startGame(key)}
        style={[styles.cardWrapper, isTablet && styles.cardWrapperTablet]}
      >
        <Animated.View style={[styles.difficultyCard, { padding: cardPad, gap: Math.round(14 * ts) }, isTablet && { flex: 1 }, isUniverse && { transform: [{ scale: universePulseAnim }] }]}>
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

          {/* Planet image, edges blended into the card background via overlay gradients */}
          <View style={[styles.iconCircle, { width: iconSize, height: iconSize, borderRadius: iconSize / 2, backgroundColor: color + '18', borderWidth: 0, overflow: 'hidden' }]}>
            <Image source={PLANET_IMAGES[key]} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
            <LinearGradient
              colors={['rgba(28,30,46,0.9)', 'transparent', 'transparent', 'rgba(28,30,46,0.9)']}
              locations={[0, 0.35, 0.65, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(28,30,46,0.9)', 'transparent', 'transparent', 'rgba(28,30,46,0.9)']}
              locations={[0, 0.35, 0.65, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.iconCircleDot, { backgroundColor: color, shadowColor: color }]} />
          </View>

          {/* Title + tag + description */}
          <View style={styles.cardCenter}>
            <Text style={[styles.cardTitle, { fontSize: Math.round(26 * ts) }]}>{t(key)}</Text>
            <Text style={[styles.cardTag, { color, fontSize: Math.round(13 * ts) }]}>{t(`${key}Tag`)}</Text>
            <Text style={[styles.cardDescription, { fontSize: Math.round(13 * ts), lineHeight: Math.round(18 * ts) }]}>{t(`${key}Desc`)}</Text>
          </View>

          {/* Top-right: best score badge */}
          {highScore ? (
            <View style={[styles.scoreTag, { top: cardPad, right: cardPad }]}>
              <View style={[styles.scoreDot, { backgroundColor: '#FFD600' }]} />
              <Text style={[styles.scoreTagText, { fontSize: Math.round(12 * ts) }]}>{highScore.score} pts</Text>
            </View>
          ) : null}

          {/* Right edge: chevron */}
          <View style={styles.chevronCircle}>
            <Text style={styles.chevronText}>›</Text>
          </View>
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

        {/* Background planets — fixed to the backdrop, don't move with the ship */}
        <View style={[styles.bgPlanet1, { width: Math.round(150 * ts), height: Math.round(173 * ts), top: Math.round(heroHeight * 0.68) }]}>
          <Image
            source={require('../../assets/star1.png')}
            style={styles.bgPlanetImage}
            resizeMode="contain"
          />
          {/* Fade the outer (left screen edge) side into the background */}
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(8,8,22,0.95)']}
            locations={[0, 0.4, 1]}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={[styles.bgPlanet2, { width: Math.round(130 * ts), height: Math.round(94 * ts), top: Math.round(heroHeight * 0.62) }]}>
          <Image
            source={require('../../assets/star2.png')}
            style={styles.bgPlanetImage}
            resizeMode="contain"
          />
          {/* Fade the outer (right screen edge) side into the background */}
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(8,8,22,0.6)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Bottom half (belly) progressively darkens into the background */}
          <LinearGradient
            colors={['transparent', 'rgba(8,8,22,0.5)', 'rgba(8,8,22,0.8)']}
            locations={[0.3, 0.7, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Scanning lines effect */}
        <View style={styles.scanLines} />

        <BuyCoinsModal visible={buyCoinsVisible} onClose={() => setBuyCoinsVisible(false)} />

        {/* Hero: pinned to the top third of the screen, shrunk to fit — never scrolls */}
        <View style={[styles.heroFixed, { height: heroHeight }]}>
          {/* Top header: hamburger menu + coin balance — kept outside the scaled
              hero content so its edges stay aligned with the cards below,
              regardless of heroScale */}
          <View style={[styles.topHeader, isTablet && { paddingHorizontal: 20 + SW * 0.06 }]}>
            <MenuButton navigation={navigation} activeTab="Home" style={{ height: 49 }} />

            <View style={styles.coinPill}>
              <Image source={COIN_IMG} style={styles.coinPillIcon} resizeMode="contain" />
              <Text style={styles.coinPillText}>{coins.toLocaleString()}</Text>
              <TouchableOpacity
                style={styles.coinPlusBtn}
                onPress={() => setBuyCoinsVisible(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.coinPlusText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[styles.heroContent, { transform: [{ scale: heroScale }], transformOrigin: 'top center' }]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0 && Math.abs(h - heroNaturalHeight) > 0.5) {
                setHeroNaturalHeight(h);
              }
            }}
          >
            {/* Animated Logo */}
            <Animated.View
              style={[
                styles.logoContainer,
                { transform: [{ translateY: floatAnim }] },
              ]}
            >
            <View style={{ width: Math.round(195 * ts), height: Math.round(270 * ts) }}>
              <Image
                source={require('../../assets/starship3D.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              {/* Fade only the far tip of the exhaust trail into the background — keep the part near the ship sharp */}
              <LinearGradient
                colors={['transparent', 'transparent', 'rgba(8,8,22,0.95)']}
                locations={[0, 0.55, 1]}
                start={{ x: 0.5, y: 0.3 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.logoFade}
              />
            </View>
            </Animated.View>

            {/* Title artwork — overlaps the rocket's exhaust tail a little */}
            <Image
              source={require('../../assets/starshipmath.png')}
              style={{
                width: Math.round(367 * ts),
                height: Math.round((367 * ts) / 4.458),
                marginTop: Math.round(-85 * ts),
                marginBottom: Math.round(38 * ts),
              }}
              resizeMode="contain"
            />

            <Text style={[styles.subtitle, { fontSize: Math.round(14 * ts), marginTop: Math.round(15 * ts) }]}>
              {t('subtitleLine1')}
            </Text>
            <Text style={[styles.subtitle, { fontSize: Math.round(14 * ts) }]}>
              {t('subtitleLine2')}
            </Text>
          </View>
        </View>

        <View style={[styles.scrollClip, { top: heroHeight }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, isTablet && { paddingHorizontal: SW * 0.06 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Difficulty Cards */}
          <View
            style={[styles.cardsSection, isTablet && styles.cardsSectionTablet]}
          >
            {Object.entries(DIFFICULTY_CONFIG)
              .filter(([key]) => key !== 'expert' && key !== 'universe')
              .map(([key, config], index) =>
                renderDifficultyCard(key, config, index)
              )}
          </View>

          {/* Version info */}
          <TouchableOpacity
            onLongPress={async () => {
              if (!__DEV__) return;
              await AsyncStorage.clear();
              Alert.alert('Dev Reset', 'All app data cleared. Restart to see changes.');
            }}
            activeOpacity={1}
          >
            <Text style={styles.versionText}>v1.0.0 • {t('poweredBy')}</Text>
          </TouchableOpacity>
        </ScrollView>
        </View>

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
  topHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    paddingLeft: 12,
    paddingRight: 4,
    height: 49,
    gap: 8,
  },
  coinPillIcon: {
    width: 22,
    height: 22,
  },
  coinPillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#FFD700',
  },
  coinPlusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinPlusText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: -1,
  },
  scrollClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  heroFixed: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  heroContent: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 99,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginTop: 20,
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
    width: '100%',
    height: '100%',
  },
  logoFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  bgPlanet1: {
    position: 'absolute',
    left: -45,
  },
  bgPlanet2: {
    position: 'absolute',
    right: -30,
  },
  bgPlanetImage: {
    width: '100%',
    height: '100%',
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
  subtitle: {
    // Per CLAUDE.md §1.1.2: Nunito Bold, default letter spacing (do not expand).
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 4,
    textAlign: 'center',
  },
  cardsSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  cardsSectionTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  cardWrapperTablet: {
    width: '48%',
  },
  cardWrapper: {
    marginBottom: 12,
  },
  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 30, 46, 0.7)',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    borderWidth: 1,
    position: 'relative',
  },
  iconCircleDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  planetImage: {
    width: 42,
    height: 42,
  },
  cardCenter: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FONTS.displaySemi,
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  cardTag: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    marginBottom: 3,
  },
  cardDescription: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
  },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 1,
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
  },

});

export default HomeScreen;
