import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, StyleSheet, Platform } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';

// Import context
import { LanguageProvider } from './src/context/LanguageContext';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const Stack = createNativeStackNavigator();

// Mobile frame wrapper for web
const MobileFrame = ({ children }) => {
  if (Platform.OS !== 'web') {
    return children;
  }

  return (
    <View style={styles.webContainer}>
      <View style={styles.mobileFrame}>
        <View style={styles.notch} />
        {children}
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <MobileFrame>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen
              name="Result"
              component={ResultScreen}
              options={{
                gestureEnabled: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </MobileFrame>
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
