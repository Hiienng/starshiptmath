import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

const RAINBOW = ['#FF0000', '#FF6600', '#FFD700', '#00DD55', '#0088FF', '#7700EE', '#FF00BB'];
const STAR_COLORS = ['#ffffff', '#aaccff', '#ffeebb', '#ccffee', '#ddaaff', '#ffffff'];

// Stars generated once at module load — deterministic spread across screen
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: ((i * 0.618033) % 1) * SW,          // golden ratio spread
  delay: (i * 53) % 1400,                 // staggered starts
  width: i % 7 === 0 ? 2 : 1,
  height: 6 + (i % 7) * 5,               // 6–36px streak length
  duration: 350 + (i % 10) * 120,        // 350–1470ms / loop
  opacity: 0.25 + (i % 6) * 0.12,
  color: STAR_COLORS[i % STAR_COLORS.length],
}));

// ── Warp star: loops upward continuously ──────────────────────────────────
const WarpStar = memo(({ x, delay, width, height, duration, opacity, color }) => {
  const y = useRef(new Animated.Value(SH + height)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const run = () => {
      if (!mounted.current) return;
      y.setValue(SH + height);
      Animated.timing(y, {
        toValue: -height,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished && mounted.current) run(); });
    };
    const t = setTimeout(run, delay);
    return () => { mounted.current = false; clearTimeout(t); };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width,
        height,
        backgroundColor: color,
        opacity,
        borderRadius: width,
        transform: [{ translateY: y }],
      }}
    />
  );
});

// ── Rainbow exhaust ring (pulsing) ────────────────────────────────────────
const ExhaustRing = memo(({ color, index }) => {
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const period = 100 + index * 25;
    const loopX = () => {
      Animated.sequence([
        Animated.timing(scaleX, { toValue: 1.5 - index * 0.06, duration: period, useNativeDriver: true }),
        Animated.timing(scaleX, { toValue: 0.7 + index * 0.04, duration: period, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) loopX(); });
    };
    const loopY = () => {
      Animated.sequence([
        Animated.timing(scaleY, { toValue: 0.6, duration: period * 1.3, useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 1.2, duration: period * 1.3, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) loopY(); });
    };
    loopX();
    loopY();
  }, []);

  const w = 38 - index * 3.5;
  const h = w * 0.45;
  return (
    <Animated.View
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        backgroundColor: color,
        opacity: Math.max(0.08, 0.9 - index * 0.11),
        alignSelf: 'center',
        marginTop: index === 0 ? 2 : -3,
        transform: [{ scaleX }, { scaleY }],
      }}
    />
  );
});

// ── Main component ────────────────────────────────────────────────────────
const RoundTransition = ({ visible, fromRound, toRound, newEffectiveTime, onComplete }) => {
  const overlayAlpha  = useRef(new Animated.Value(0)).current;
  const shipY         = useRef(new Animated.Value(SH + 160)).current;
  const contentAlpha  = useRef(new Animated.Value(0)).current;
  const glowScale     = useRef(new Animated.Value(0.2)).current;
  const numberScale   = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!visible) return;

    // Reset
    overlayAlpha.setValue(0);
    shipY.setValue(SH + 160);
    contentAlpha.setValue(0);
    glowScale.setValue(0.2);
    numberScale.setValue(0.5);

    // 1 — Space background wipes in
    Animated.timing(overlayAlpha, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // 2 — Ship accelerates from bottom off-screen to top off-screen
    setTimeout(() => {
      Animated.timing(shipY, {
        toValue: -(SH * 0.55),
        duration: 1900,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, 150);

    // 3 — Round number explodes in when ship passes mid-screen
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentAlpha, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(glowScale,  { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.spring(numberScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
      ]).start();
    }, 900);

    // 4 — Fade out and hand off
    setTimeout(() => {
      Animated.timing(overlayAlpha, { toValue: 0, duration: 550, useNativeDriver: true })
        .start(() => onComplete());
    }, 2700);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { opacity: overlayAlpha, zIndex: 9999 }]}
    >
      {/* ── Deep space background ── */}
      <LinearGradient
        colors={['#000008', '#04001c', '#080038', '#04001c', '#000008']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Warp stars ── */}
      {STARS.map(s => <WarpStar key={s.id} {...s} />)}

      {/* ── Round number reveal ── */}
      <Animated.View style={[styles.centerContent, { opacity: contentAlpha }]}>
        <Animated.View style={[styles.glowOrb, { transform: [{ scale: glowScale }] }]} />

        <Text style={styles.labelText}>ROUND</Text>

        <Animated.Text style={[styles.roundNum, { transform: [{ scale: numberScale }] }]}>
          {toRound}
        </Animated.Text>
      </Animated.View>

      {/* ── Starship + rainbow exhaust ── */}
      <Animated.View style={[styles.shipStack, { transform: [{ translateY: shipY }] }]}>
        {/* Ship image */}
        <Image
          source={require('../../assets/mainobj.png')}
          style={styles.ship}
          resizeMode="contain"
        />
        {/* Rainbow exhaust beneath ship */}
        <View style={styles.exhaustWrap}>
          {RAINBOW.map((color, i) => (
            <ExhaustRing key={i} color={color} index={i} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Center round number
  centerContent: {
    position: 'absolute',
    top: SH * 0.28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(100, 30, 220, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(160, 80, 255, 0.25)',
  },
  labelText: {
    fontSize: 12,
    color: 'rgba(200, 180, 255, 0.6)',
    letterSpacing: 10,
    marginBottom: 2,
  },
  roundNum: {
    fontSize: 108,
    fontWeight: 'bold',
    color: '#FFD700',
    lineHeight: 116,
    textShadowColor: 'rgba(255, 210, 0, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  // Ship + exhaust
  shipStack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ship: {
    width: 88,
    height: 120,
  },
  exhaustWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
});

export default RoundTransition;