import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Image, Easing, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const PLANET_IMAGES = {
  easy:     require('../../assets/venus.png'),
  medium:   require('../../assets/jupiter.png'),
  hard:     require('../../assets/mars.png'),
  expert:   require('../../assets/saturn.png'),
  universe: require('../../assets/blackhole.png'),
};

const SHIP_SIZE   = 90;
const PLANET_SIZE = 120;

const SHIP_START_X = SW * 0.20;
const SHIP_START_Y = SH * 0.44;

const PLANET_LEFT  = SW * 0.60;
const PLANET_TOP   = SH * 0.06;

const SHIP_END_X = PLANET_LEFT + (PLANET_SIZE - SHIP_SIZE) / 2;
const SHIP_END_Y = PLANET_TOP  + (PLANET_SIZE - SHIP_SIZE) / 2;

const GameOverTransition = ({ visible, difficulty = 'easy', onComplete }) => {
  const overlayAlpha = useRef(new Animated.Value(0)).current;
  const planetAlpha  = useRef(new Animated.Value(0)).current;
  const shipX        = useRef(new Animated.Value(SHIP_START_X)).current;
  const shipY        = useRef(new Animated.Value(SHIP_START_Y)).current;
  const shipAlpha    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    overlayAlpha.setValue(0);
    planetAlpha.setValue(0);
    shipX.setValue(SHIP_START_X);
    shipY.setValue(SHIP_START_Y);
    shipAlpha.setValue(1);

    // Dark overlay fades in
    Animated.timing(overlayAlpha, {
      toValue: 0.90,
      duration: 180,
      useNativeDriver: true,
    }).start();

    // Planet appears at destination
    Animated.timing(planetAlpha, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Ship flies to planet
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(shipX, {
          toValue: SHIP_END_X,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shipY, {
          toValue: SHIP_END_Y,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);

    // Ship "merges" into planet then overlay fades out → navigate
    setTimeout(() => {
      Animated.timing(shipAlpha, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(overlayAlpha, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onComplete());
    }, 1300);
  }, [visible]);

  if (!visible) return null;

  const planetSource = PLANET_IMAGES[difficulty] || PLANET_IMAGES.easy;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: '#000010', opacity: overlayAlpha, zIndex: 9999 },
      ]}
    >
      {/* Planet at upper-right */}
      <Animated.View
        style={{
          position: 'absolute',
          left: PLANET_LEFT,
          top: PLANET_TOP,
          width: PLANET_SIZE,
          height: PLANET_SIZE,
          opacity: planetAlpha,
        }}
      >
        <Image
          source={planetSource}
          style={{ width: PLANET_SIZE, height: PLANET_SIZE }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Ship flying */}
      <Animated.View
        style={{
          position: 'absolute',
          width: SHIP_SIZE,
          height: SHIP_SIZE,
          left: 0,
          top: 0,
          opacity: shipAlpha,
          transform: [{ translateX: shipX }, { translateY: shipY }],
        }}
      >
        <Image
          source={require('../../assets/mainobj.png')}
          style={{ width: SHIP_SIZE, height: SHIP_SIZE }}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
};

export default GameOverTransition;
