import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
// Import screens
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';
import StoreScreen from './src/screens/StoreScreen';
import DecimalMapScreen from './src/screens/DecimalMapScreen';
import JupiterScreen from './src/screens/JupiterScreen';
import MarsScreen from './src/screens/MarsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AgeGateScreen from './src/screens/AgeGateScreen';

// Import context
import { LanguageProvider } from './src/context/LanguageContext';
import { AdProvider } from './src/context/AdContext';
import { initializeCoins } from './src/utils/itemStorage';
import { getAgeGroup } from './src/utils/ageGroupStorage';

// Grant 30 starter coins on first install
initializeCoins();

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const Stack = createNativeStackNavigator();

// Mobile frame wrapper for web
const MobileFrame = ({ children }) => {
  // TEMP: frame now tracks the real browser window size (capped) so
  // isTablet/ts paths can be previewed at >=768px widths. Remove this
  // override and restore the fixed 375x812 frame once tablet testing is done.
  const { width, height } = useWindowDimensions();
  const frameWidth = Math.min(width - 16, 1366);
  const frameHeight = Math.min(height - 16, 1366);

  if (Platform.OS !== 'web') {
    return children;
  }

  return (
    <View style={styles.webContainer}>
      <View style={[styles.mobileFrame, { width: frameWidth, height: frameHeight }]}>
        <View style={styles.notch} />
        {children}
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
};

// Resolve Nunito family from fontWeight on each Text render.
// This lets every <Text> in the app inherit the correct Nunito weight
// without changing per-component styles. Components can opt into Fredoka
// (heading font) by setting fontFamily explicitly — that wins over the patch.
const NUNITO_FAMILY = {
  '400': 'Nunito_400Regular',
  '500': 'Nunito_600SemiBold',
  '600': 'Nunito_600SemiBold',
  '700': 'Nunito_700Bold',
  '800': 'Nunito_800ExtraBold',
  '900': 'Nunito_900Black',
  normal: 'Nunito_400Regular',
  bold: 'Nunito_700Bold',
};

const flattenStyle = (style) => {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.flat(Infinity).filter(Boolean));
  return style;
};

const applyDefaultFont = () => {
  if (Text.__patchedFont) return;
  Text.__patchedFont = true;
  const origRender = Text.render;
  Text.render = function (...args) {
    const el = origRender.call(this, ...args);
    const flat = flattenStyle(el.props.style);
    // If the component already chose a fontFamily (e.g. Fredoka), respect it.
    if (flat.fontFamily) return el;
    const weight = String(flat.fontWeight ?? '400');
    const family = NUNITO_FAMILY[weight] ?? 'Nunito_400Regular';
    return React.cloneElement(el, {
      style: [{ fontFamily: family }, el.props.style],
    });
  };
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  if (fontsLoaded) applyDefaultFont();

  // Age gate state. null while loading, '' when needs picking, 'kid'|'adult' when chosen.
  const [ageGroup, setAgeGroupState] = useState(null);
  const [ageLoaded, setAgeLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const g = await getAgeGroup();
      setAgeGroupState(g ?? '');
      setAgeLoaded(true);
    })();
  }, []);

  if (!fontsLoaded || !ageLoaded) return null;

  const initialRouteName = ageGroup ? 'Home' : 'AgeGate';

  return (
    <LanguageProvider>
      <AdProvider ageGroup={ageGroup || null}>
      <MobileFrame>
        <View style={{ flex: 1 }}>
          <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator
              initialRouteName={initialRouteName}
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
              }}
            >
              <Stack.Screen
                name="AgeGate"
                component={AgeGateScreen}
                initialParams={{ onResolved: (g) => setAgeGroupState(g) }}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Store" component={StoreScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="DecimalMap" component={DecimalMapScreen} />
              <Stack.Screen name="Jupiter" component={JupiterScreen} />
              <Stack.Screen name="Mars" component={MarsScreen} />
              <Stack.Screen name="Game" component={GameScreen} />
              <Stack.Screen
                name="Result"
                component={ResultScreen}
                options={{
                  gestureEnabled: false,
                  animation: 'slide_from_bottom',
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </MobileFrame>
      </AdProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  mobileFrame: {
    width: 375,
    height: 812,
    backgroundColor: '#000',
    borderRadius: 40,
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    position: 'relative',
  },
  notch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -75,
    width: 150,
    height: 30,
    backgroundColor: '#000',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 100,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -67,
    width: 134,
    height: 5,
    backgroundColor: '#fff',
    borderRadius: 3,
    zIndex: 100,
  },
});
