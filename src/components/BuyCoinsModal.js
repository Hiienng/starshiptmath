import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Image, Alert } from 'react-native';

const COIN_IMG = require('../../assets/coin.png');

const PACKAGES = [
  { coins: 100,  price: '$0.99' },
  { coins: 500,  price: '$3.99' },
  { coins: 1200, price: '$7.99' },
];

const BuyCoinsModal = ({ visible, onClose }) => {
  const handleBuy = (pkg) => {
    Alert.alert('Coming soon', 'In-app coin purchases will be available in a future update.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Get more coins</Text>

          {PACKAGES.map((pkg) => (
            <TouchableOpacity
              key={pkg.coins}
              style={styles.row}
              onPress={() => handleBuy(pkg)}
              activeOpacity={0.8}
            >
              <Image source={COIN_IMG} style={styles.coinIcon} resizeMode="contain" />
              <Text style={styles.coinAmount}>{pkg.coins.toLocaleString()}</Text>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>{pkg.price}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
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
    width: 260,
    backgroundColor: '#16172e',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  coinIcon: {
    width: 24,
    height: 24,
  },
  coinAmount: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
  },
  priceTag: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a78bfa',
  },
  closeBtn: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
});

export default BuyCoinsModal;
