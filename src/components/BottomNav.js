import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const ACTIVE   = '#a78bfa';
const INACTIVE = 'rgba(255,255,255,0.5)';

// Shape-based icons (shared look with the old menu).
const HomeIcon = ({ color }) => (
  <View style={styles.iconBox}>
    <View style={[styles.homeRoof, { borderBottomColor: color }]} />
    <View style={[styles.homeBody, { backgroundColor: color }]} />
  </View>
);
const StoreIcon = ({ color }) => (
  <View style={styles.iconBox}>
    <View style={[styles.storeRoof, { borderColor: color }]} />
    <View style={[styles.storeBody, { backgroundColor: color }]} />
  </View>
);
const SettingsIcon = ({ color }) => (
  <View style={styles.iconBox}>
    <Image
      source={require('../../assets/setting.png')}
      style={{ width: 22, height: 22, tintColor: color }}
      resizeMode="contain"
    />
  </View>
);

const TABS = [
  { key: 'Home',     tKey: 'home',     fallback: 'Home',     Icon: HomeIcon },
  { key: 'Store',    tKey: 'store',    fallback: 'Store',    Icon: StoreIcon },
  { key: 'Settings', tKey: 'settings', fallback: 'Settings', Icon: SettingsIcon },
];

// Floating bottom navigation bar. Replaces the top-left hamburger menu.
const BottomNav = ({ navigation, activeTab }) => {
  const { t } = useLanguage();
  const goTo = (key) => { if (key !== activeTab) navigation.navigate(key); };

  return (
    <View style={styles.bar}>
      {TABS.map(({ key, tKey, fallback, Icon }) => {
        const active = key === activeTab;
        const color  = active ? ACTIVE : INACTIVE;
        // t() returns the key itself when a translation is missing (e.g. "store"),
        // so fall back to the English label in that case.
        const tr     = t(tKey);
        const label  = tr && tr !== tKey ? tr : fallback;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => goTo(key)}
            activeOpacity={0.8}
          >
            <Icon color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(22,23,46,0.96)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 18,
    gap: 5,
  },
  tabActive: {
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.45)',
  },
  label: { fontSize: 12, fontWeight: '700' },

  iconBox: { alignItems: 'center', justifyContent: 'center', width: 24, height: 24 },
  homeRoof: {
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginBottom: -1,
  },
  homeBody: { width: 16, height: 11, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  storeRoof: {
    width: 12, height: 6, borderWidth: 2, borderBottomWidth: 0, borderRadius: 4,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: -1,
  },
  storeBody: { width: 20, height: 14, borderRadius: 3 },
});

export default BottomNav;
