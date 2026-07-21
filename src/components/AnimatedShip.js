import React, { useEffect, useRef, memo } from 'react';
import { View, Image, Animated, Easing, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Placement (matches the old MainStarship in SpaceBackground) ───────────
const SHIP_SIZE = 88;
const SHIP_X    = SW * 0.78;  // right side
const SHIP_MID  = SH * 0.14;  // vertically near header
const SHIP_AMP  = 18;         // bob amplitude

const DEFAULT_SHIP = require('../../assets/mainobj.png');

/**
 * Decorative-but-reactive starship for GameScreen.
 *
 * Pure Animated + View — no extra deps, no new art. The skin PNG is rendered
 * as-is; the flame, glow, bob, sway and shake are all programmatic layers.
 *
 * Props:
 *  - source: skin PNG (falls back to mainobj).
 *  - state:  'cruise' (default) | 'celebrate' | 'hit' | 'idle'.
 */
const AnimatedShip = memo(({ source, state = 'cruise' }) => {
  const isIdle = state === 'idle';

  // Continuous drivers
  const bob   = useRef(new Animated.Value(0)).current; // 0..1 vertical hover
  const sway  = useRef(new Animated.Value(0)).current; // -1..1 tilt
  const flame = useRef(new Animated.Value(0)).current; // 0..1 flame flicker

  // Transient drivers (event reactions)
  const shake  = useRef(new Animated.Value(0)).current; // px, hit
  const bounce = useRef(new Animated.Value(1)).current; // scale, celebrate
  const glow   = useRef(new Animated.Value(0)).current; // 0..1 halo, celebrate

  // ── Continuous: bob ──────────────────────────────────────────────────────
  useEffect(() => {
    const dur = isIdle ? 2600 : 2000;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob, isIdle]);

  // ── Continuous: sway (gentle auto-tilt; near-still when idle) ─────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1,  duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sway]);

  // ── Continuous: flame flicker ────────────────────────────────────────────
  useEffect(() => {
    const fast = isIdle ? 260 : 130;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flame, { toValue: 1, duration: fast,        easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(flame, { toValue: 0, duration: fast * 1.4,  easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flame, isIdle]);

  // ── Transient: react to state changes ────────────────────────────────────
  useEffect(() => {
    if (state === 'hit') {
      Animated.sequence([
        Animated.timing(shake, { toValue: 10,  duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 8,   duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0,   duration: 50, useNativeDriver: true }),
      ]).start();
    } else if (state === 'celebrate') {
      Animated.parallel([
        Animated.sequence([
          Animated.spring(bounce, { toValue: 1.18, friction: 4, tension: 120, useNativeDriver: true }),
          Animated.spring(bounce, { toValue: 1,    friction: 5, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 520, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [state, shake, bounce, glow]);

  // ── Derived transforms ───────────────────────────────────────────────────
  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [SHIP_MID - SHIP_AMP, SHIP_MID + SHIP_AMP],
  });
  const tiltDeg = isIdle ? 1.5 : 4;
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: [`-${tiltDeg}deg`, `${tiltDeg}deg`] });

  const flameScaleY = flame.interpolate({ inputRange: [0, 1], outputRange: isIdle ? [0.55, 0.8] : [0.7, 1.35] });
  const flameOpacity = flame.interpolate({ inputRange: [0, 1], outputRange: isIdle ? [0.35, 0.6] : [0.65, 1] });

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] });

  const flameW = SHIP_SIZE * 0.26;
  const flameH = SHIP_SIZE * 0.5;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: SHIP_SIZE,
        height: SHIP_SIZE,
        left: SHIP_X,
        top: 0,
        opacity: isIdle ? 0.5 : 0.65,
        transform: [{ translateY }, { translateX: shake }],
      }}
    >
      {/* Celebrate halo — behind the ship */}
      <Animated.View
        style={{
          position: 'absolute',
          left: SHIP_SIZE / 2 - SHIP_SIZE * 0.6,
          top: SHIP_SIZE / 2 - SHIP_SIZE * 0.6,
          width: SHIP_SIZE * 1.2,
          height: SHIP_SIZE * 1.2,
          borderRadius: SHIP_SIZE * 0.6,
          backgroundColor: '#ffe07a',
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }}
      />

      {/* Ship + tilt + celebrate bounce */}
      <Animated.View style={{ width: '100%', height: '100%', transform: [{ rotate }, { scale: bounce }] }}>
        <Image source={source ?? DEFAULT_SHIP} style={{ width: '100%', height: '100%' }} resizeMode="contain" />

        {/* Tail flame — nose-up art, exhaust at the bottom centre */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: -flameH * 0.45,
            left: SHIP_SIZE / 2 - flameW / 2,
            width: flameW,
            height: flameH,
            opacity: flameOpacity,
            transform: [{ scaleY: flameScaleY }],
          }}
        >
          {/* outer orange */}
          <View style={{
            position: 'absolute', left: 0, top: 0, width: flameW, height: flameH,
            borderTopLeftRadius: flameW / 2, borderTopRightRadius: flameW / 2,
            borderBottomLeftRadius: flameW * 0.5, borderBottomRightRadius: flameW * 0.5,
            backgroundColor: '#ff7a18',
          }} />
          {/* inner yellow */}
          <View style={{
            position: 'absolute', left: flameW * 0.22, top: flameH * 0.12,
            width: flameW * 0.56, height: flameH * 0.7,
            borderRadius: flameW * 0.28, backgroundColor: '#ffd23f',
          }} />
          {/* hot core */}
          <View style={{
            position: 'absolute', left: flameW * 0.36, top: flameH * 0.22,
            width: flameW * 0.28, height: flameH * 0.45,
            borderRadius: flameW * 0.14, backgroundColor: '#fff6d6',
          }} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});

export default AnimatedShip;
