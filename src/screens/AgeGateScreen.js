import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
import { setAgeGroup, AGE_GROUPS } from '../utils/ageGroupStorage';
import { FONTS } from '../constants/fonts';

const AgeGateScreen = ({ navigation, route }) => {
  const { t } = useLanguage();
  const onResolved = route?.params?.onResolved;

  const choose = async (group) => {
    await setAgeGroup(group);
    onResolved?.(group);
    navigation.replace('Home');
  };

  // Each card: themed glow color + icon + age label + role label.
  const CARDS = [
    {
      group: AGE_GROUPS.kid,
      emoji: '🪐',
      label: t('ageGateKid'),
      sub: t('ageGateKidSub'),
      color: '#00D9FF',
      borderRgba: 'rgba(0, 217, 255, 0.4)',
      glowColors: ['rgba(0, 217, 255, 0.18)', 'rgba(0, 217, 255, 0.04)'],
    },
    {
      group: AGE_GROUPS.teen,
      emoji: '☄️',
      label: t('ageGateTeen'),
      sub: t('ageGateTeenSub'),
      color: '#FF6B9D',
      borderRgba: 'rgba(255, 107, 157, 0.45)',
      glowColors: ['rgba(255, 107, 157, 0.20)', 'rgba(255, 107, 157, 0.04)'],
    },
    {
      group: AGE_GROUPS.adult,
      emoji: '🚀',
      label: t('ageGateAdult'),
      sub: t('ageGateAdultSub'),
      color: '#A78BFA',
      borderRgba: 'rgba(124, 58, 237, 0.45)',
      glowColors: ['rgba(167, 139, 250, 0.22)', 'rgba(124, 58, 237, 0.05)'],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <LinearGradient
        colors={['#050510', '#0a0a1a', '#0f0f2a', '#0a0a1a', '#050510']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        style={styles.gradient}
      >
        <View style={styles.body}>
          <Text style={styles.title}>{t('ageGateTitle')}</Text>
          <Text style={styles.subtitle}>{t('ageGateSubtitle')}</Text>

          <View style={styles.cards}>
            {CARDS.map(c => (
              <TouchableOpacity
                key={c.group}
                style={[styles.card, {
                  borderColor: c.borderRgba,
                  shadowColor: c.color,
                }]}
                activeOpacity={0.82}
                onPress={() => choose(c.group)}
              >
                <LinearGradient
                  colors={c.glowColors}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.emoji}>{c.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.label}</Text>
                  <Text style={styles.cardSub}>{c.sub}</Text>
                </View>
                <Text style={[styles.arrow, { color: c.color }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.note}>{t('ageGateNote')}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  gradient:  { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 90,
    paddingBottom: 40,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 36,
    color: '#fff',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: '#6C63FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: 'rgba(184,184,212,0.7)',
    textAlign: 'center',
    marginTop: 10,
  },
  cards: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 10, 35, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  emoji: { fontSize: 34 },
  cardTitle: {
    fontFamily: FONTS.displaySemi,
    fontSize: 19,
    color: '#fff',
    letterSpacing: 0.3,
  },
  cardSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: 'rgba(184,184,212,0.6)',
    marginTop: 2,
  },
  arrow: {
    fontFamily: FONTS.displayBold,
    fontSize: 30,
  },
  note: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: 'rgba(184,184,212,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});

export default AgeGateScreen;
