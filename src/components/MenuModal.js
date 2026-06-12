import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Image } from 'react-native';

// Simple shape-based icons (moved from the old BottomNav)
const HomeIcon = ({ active }) => (
  <View style={styles.iconBox}>
    <View style={[styles.homeRoof, { borderBottomColor: active ? '#a78bfa' : 'rgba(255,255,255,0.5)' }]} />
    <View style={[styles.homeBody, { backgroundColor: active ? '#a78bfa' : 'rgba(255,255,255,0.5)' }]} />
  </View>
);

const StoreIcon = ({ active }) => (
  <View style={styles.iconBox}>
    <View style={[styles.storeRoof, { borderColor: active ? '#a78bfa' : 'rgba(255,255,255,0.5)' }]} />
    <View style={[styles.storeBody, { backgroundColor: active ? '#a78bfa' : 'rgba(255,255,255,0.5)' }]} />
  </View>
);

const SettingsIcon = ({ active }) => (
  <View style={styles.iconBox}>
    <Image
      source={require('../../assets/setting.png')}
      style={{ width: 22, height: 22, tintColor: active ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}
      resizeMode="contain"
    />
  </View>
);

const ITEMS = [
  { key: 'Home',     label: 'Home',     Icon: HomeIcon },
  { key: 'Store',    label: 'Store',    Icon: StoreIcon },
  { key: 'Settings', label: 'Settings', Icon: SettingsIcon },
];

const MenuModal = ({ visible, onClose, navigation, activeTab }) => {
  const goTo = (key) => {
    onClose();
    if (key !== activeTab) navigation.navigate(key);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {ITEMS.map(({ key, label, Icon }, idx) => {
            const isActive = key === activeTab;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.row, idx < ITEMS.length - 1 && styles.rowDivider, isActive && styles.rowActive]}
                onPress={() => goTo(key)}
                activeOpacity={0.75}
              >
                <Icon active={isActive} />
                <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 220,
    backgroundColor: '#16172e',
    borderRadius: 18,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.25)',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowActive: {
    backgroundColor: 'rgba(108,99,255,0.12)',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  labelActive: {
    color: '#a78bfa',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  homeBody: {
    width: 16,
    height: 11,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  storeRoof: {
    width: 12,
    height: 6,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderRadius: 4,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: -1,
  },
  storeBody: {
    width: 20,
    height: 14,
    borderRadius: 3,
  },
});

export default MenuModal;
