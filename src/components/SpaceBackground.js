import React, { useEffect, useRef, memo } from 'react';
import { View, Image, Animated, Easing, StyleSheet, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Stars (deterministic, loop downward) ─────────────────────────────────
const STARS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: ((i * 0.618033) % 1) * (SW - 3),
  w: i % 5 === 0 ? 2 : 1,
  h: 10 + (i % 4) * 7,
  speed: 1200 + (i % 6) * 480,
  delay: (i * 490) % 3500,
  opacity: 0.28 + (i % 4) * 0.09,
  color: i % 3 === 0 ? '#aaddff' : '#ffffff',
}));

const WarpStar = memo(({ x, w, h, speed, delay, opacity, color }) => {
  const y = useRef(new Animated.Value(-h)).current;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const loop = () => {
      if (!alive.current) return;
      y.setValue(-h);
      Animated.timing(y, {
        toValue: SH + h,
        duration: speed,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished && alive.current) loop(); });
    };
    const t = setTimeout(loop, delay);
    return () => { alive.current = false; clearTimeout(t); };
  }, []);

  const op = y.interpolate({
    inputRange: [-h, SH * 0.06, SH * 0.88, SH + h],
    outputRange: [0, opacity, opacity * 0.55, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x, top: 0,
        width: w, height: h,
        borderRadius: w,
        backgroundColor: color,
        opacity: op,
        transform: [{ translateY: y }],
      }}
    />
  );
});

// ── Floating space object ─────────────────────────────────────────────────
const FloatingObject = memo(({ source, size, startX, duration, initDelay }) => {
  const y = useRef(new Animated.Value(-size - 30)).current;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const loop = () => {
      if (!alive.current) return;
      y.setValue(-size - 30);
      Animated.timing(y, {
        toValue: SH + size + 30,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && alive.current) {
          setTimeout(loop, 3000 + Math.random() * 4000);
        }
      });
    };
    const t = setTimeout(loop, initDelay);
    return () => { alive.current = false; clearTimeout(t); };
  }, []);

  const opacity = y.interpolate({
    inputRange: [-size - 30, SH * 0.05, SH * 0.75, SH + size],
    outputRange: [0, 0.20, 0.15, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size, height: size,
        left: startX,
        top: 0,
        opacity,
        transform: [{ translateY: y }],
      }}
    >
      <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  );
});

// ── Main starship — gentle float left of centre ───────────────────────────
const SHIP_SIZE = 78;
const SHIP_X    = SW * 0.03;   // near left edge, behind X button area
const SHIP_MID  = SH * 0.11;  // high up, near the header
const SHIP_AMP  = 4;

const MainStarship = memo(() => {
  const shipY = useRef(new Animated.Value(SHIP_MID - SHIP_AMP)).current;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const animate = () => {
      if (!alive.current) return;
      Animated.sequence([
        Animated.timing(shipY, {
          toValue: SHIP_MID + SHIP_AMP,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shipY, {
          toValue: SHIP_MID - SHIP_AMP,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && alive.current) animate();
      });
    };
    animate();
    return () => { alive.current = false; };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: SHIP_SIZE,
        height: SHIP_SIZE,
        left: SHIP_X,
        top: 0,
        opacity: 0.65,
        transform: [{ translateY: shipY }],
      }}
    >
      <Image
        source={require('../../assets/mainobj.png')}
        style={{ width: SHIP_SIZE, height: SHIP_SIZE }}
        resizeMode="contain"
      />
    </Animated.View>
  );
});

// ── Exported component ────────────────────────────────────────────────────
const SpaceBackground = () => (
  <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
    {STARS.map(s => <WarpStar key={s.id} {...s} />)}

    <FloatingObject
      source={require('../../assets/planet.png')}
      size={60} startX={SW * 0.12} duration={11000} initDelay={800}
    />
    <FloatingObject
      source={require('../../assets/blackhole.png')}
      size={50} startX={SW * 0.68} duration={9000} initDelay={3500}
    />
    <FloatingObject
      source={require('../../assets/satellite.png')}
      size={46} startX={SW * 0.42} duration={13000} initDelay={1500}
    />
    <FloatingObject
      source={require('../../assets/satellite.png')}
      size={36} startX={SW * 0.78} duration={10500} initDelay={5000}
    />
    <FloatingObject
      source={require('../../assets/planet.png')}
      size={38} startX={SW * 0.25} duration={14000} initDelay={7000}
    />

    <MainStarship />
  </View>
);

export default SpaceBackground;
