import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Switch, useWindowDimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage, LANGUAGES, LANGUAGE_LABELS } from '../context/LanguageContext';
import { FONTS } from '../constants/fonts';
import BottomNav from '../components/BottomNav';
import AdBanner from '../components/AdBanner';
import appConfig from '../../app.json';

const APP_VERSION = appConfig.expo.version; // single source of truth (bumped per release)

const FLAGS = {
  en:   '🇺🇸',
  es:   '🇪🇸',
  ptBR: '🇧🇷',
  fil:  '🇵🇭',
  hi:   '🇮🇳',
  id:   '🇮🇩',
};

const SettingsScreen = ({ navigation }) => {
  const { t, language, changeLanguage, soundEnabled, toggleSound } = useLanguage();
  const { width: SW } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <LinearGradient
        colors={['#050510', '#0a0a1a', '#0f0f2a', '#0a0a1a', '#050510']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        style={styles.gradient}
      >
        {/* Header — hamburger menu + centred glow card */}
        <View style={styles.headerWrap}>
          <View style={styles.menuBtnWrap} />
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>{t('settings').toUpperCase()}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sound */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t('soundEffects')}</Text>
                <Text style={styles.rowSub}>{soundEnabled ? t('on') : t('off')}</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={toggleSound}
                trackColor={{ false: '#2a2b45', true: '#7C3AED' }}
                thumbColor={soundEnabled ? '#A78BFA' : '#6b6b8d'}
                ios_backgroundColor="#2a2b45"
              />
            </View>
          </View>

          {/* Language */}
          <Text style={styles.sectionLabel}>{t('chooseLanguage').toUpperCase()}</Text>
          <View style={styles.card}>
            {Object.entries(LANGUAGES).map(([key, code], idx, arr) => {
              const isActive = language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.langRow, idx < arr.length - 1 && styles.langRowDivider]}
                  onPress={() => changeLanguage(code)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.flag}>{FLAGS[key]}</Text>
                  <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                    {LANGUAGE_LABELS[key]}
                  </Text>
                  {isActive && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.versionText}>v{APP_VERSION} • {t('poweredBy')}</Text>
        </ScrollView>

        <View style={styles.bottomDock} pointerEvents="box-none">
          <BottomNav navigation={navigation} activeTab="Settings" />
          {Platform.OS !== 'web' && <AdBanner />}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  gradient:  { flex: 1 },

  headerWrap: {
    paddingTop: 50,
    paddingBottom: 14,
    height: 120,
  },
  menuBtnWrap: {
    position: 'absolute',
    top: 50, left: 14,
    zIndex: 10,
  },
  headerCard: {
    position: 'absolute',
    top: 50, left: 64, right: 56,
    backgroundColor: 'rgba(15, 10, 35, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  headerTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22, color: '#fff', letterSpacing: 2,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 150 },

  sectionLabel: {
    fontFamily: FONTS.displaySemi,
    color: 'rgba(184,184,212,0.6)',
    fontSize: 12, letterSpacing: 1.5,
    marginTop: 24, marginBottom: 10, marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(37, 37, 71, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowTitle: {
    color: '#fff', fontSize: 16, fontWeight: '700',
  },
  rowSub: {
    color: 'rgba(184,184,212,0.55)', fontSize: 12, marginTop: 2,
    letterSpacing: 1, fontWeight: '600',
  },

  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  langRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.1)',
  },
  flag: { fontSize: 22, marginRight: 14 },
  langLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600',
    flex: 1,
  },
  langLabelActive: {
    color: '#fff', fontWeight: '800',
  },
  activeDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED', shadowOpacity: 0.8, shadowRadius: 6,
  },

  versionText: {
    color: 'rgba(184,184,212,0.35)',
    fontSize: 11, textAlign: 'center', marginTop: 30,
  },
  bottomDock: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
  },
});

export default SettingsScreen;
