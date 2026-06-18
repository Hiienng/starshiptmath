import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Alert, Platform, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAd } from '../context/AdContext';
import {
  getAllItems, getAllSkins, getCoins, addCoin, spendCoins, grantItem,
  unlockSkin, setActiveSkin,
} from '../utils/itemStorage';
import BottomNav from '../components/BottomNav';
import AdBanner from '../components/AdBanner';

const COIN_IMG   = require('../../assets/coin.png');
const POCKET_IMG = require('../../assets/pocket.png');

const ITEM_IMAGES = {
  shield:       require('../../assets/shield.png'),
  emergencykit: require('../../assets/emergencykit.png'),
  timeboost:    require('../../assets/coin.png'),
};

// ── Wallet card ───────────────────────────────────────────────
const WalletCard = ({ coins, auto, watched, adReady, onEarn, onStop }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCoins = useRef(coins);

  useEffect(() => {
    if (coins > prevCoins.current) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.3, friction: 3, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1,   friction: 4, useNativeDriver: true }),
      ]).start();
    }
    prevCoins.current = coins;
  }, [coins]);

  return (
    <View style={styles.walletCard}>
      <Image source={POCKET_IMG} style={styles.walletBg} resizeMode="contain" />

      <Text style={styles.walletLabel}>MAGIC COIN WALLET</Text>

      <View style={styles.walletRow}>
        <Animated.Image
          source={COIN_IMG}
          style={[styles.walletCoinImg, { transform: [{ scale: scaleAnim }] }]}
          resizeMode="contain"
        />
        <Text style={styles.walletBalance}>{coins}</Text>

        <TouchableOpacity
          style={[styles.earnBtn, (!auto && !adReady) && { opacity: 0.45 }]}
          onPress={auto ? onStop : onEarn}
          disabled={!auto && !adReady}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={auto ? ['#EF4444', '#B91C1C'] : (adReady ? ['#7C3AED', '#4F46E5'] : ['#3a3a5a', '#2a2a4a'])}
            style={styles.earnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {auto ? (
              <Text style={styles.earnText}>■  Stop</Text>
            ) : (
              <>
                <Image source={COIN_IMG} style={styles.earnIcon} resizeMode="contain" />
                <Text style={styles.earnText}>{adReady ? 'Earn Coins' : 'Ad loading...'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.walletSub}>
        {auto
          ? `Auto-playing · watched ${watched} (+${watched * 10} coins) · tap Stop to finish`
          : '1 ad = 10 coins · tap to auto-watch'}
      </Text>
    </View>
  );
};

// ── Owned items row ───────────────────────────────────────────
const OwnedRow = ({ items }) => (
  <View style={styles.ownedRow}>
    {items.map((item) => (
      <View key={item.id} style={styles.ownedItem}>
        <Image source={ITEM_IMAGES[item.id] ?? COIN_IMG} style={styles.ownedImg} resizeMode="contain" />
        <Text style={styles.ownedCount}>{item.uses}</Text>
      </View>
    ))}
  </View>
);

// ── Store item row ────────────────────────────────────────────
const StoreItem = ({ item, coins, onBuy }) => {
  const canAfford = coins >= item.price;

  return (
    <View style={styles.storeItem}>
      <Image source={ITEM_IMAGES[item.id] ?? COIN_IMG} style={styles.storeItemImg} resizeMode="contain" />

      <View style={styles.storeItemInfo}>
        <Text style={styles.storeItemName}>{item.nameEn}</Text>
        <Text style={styles.storeItemDesc}>{item.descEn}</Text>
        <View style={styles.priceRow}>
          <Image source={COIN_IMG} style={styles.priceIcon} resizeMode="contain" />
          <Text style={[styles.priceText, { color: item.color }]}>{item.price}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
        onPress={() => canAfford && onBuy(item)}
        activeOpacity={canAfford ? 0.8 : 1}
      >
        <Text style={[styles.buyText, !canAfford && { color: 'rgba(255,255,255,0.25)' }]}>Buy</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Skin card ─────────────────────────────────────────────────
const SkinCard = ({ skin, coins, onBuy, onEquip }) => {
  const canAfford = coins >= skin.price;

  return (
    <View style={[styles.skinCard, skin.active && styles.skinCardActive]}>
      {skin.active && (
        <View style={styles.skinActiveBadge}>
          <Text style={styles.skinActiveTick}>✓</Text>
        </View>
      )}
      {!skin.owned && (
        <View style={styles.skinPriceBadge}>
          <Image source={COIN_IMG} style={styles.skinPriceIcon} resizeMode="contain" />
          <Text style={styles.skinPriceText}>{skin.price}</Text>
        </View>
      )}
      <Image source={skin.image} style={styles.skinImg} resizeMode="contain" />
      <Text style={styles.skinName} numberOfLines={1}>{skin.nameEn}</Text>
      {skin.owned ? (
        <TouchableOpacity
          style={[styles.skinBtn, skin.active && styles.skinBtnActive]}
          onPress={() => !skin.active && onEquip(skin)}
          activeOpacity={skin.active ? 1 : 0.8}
        >
          <Text style={styles.skinBtnText}>{skin.active ? 'Equipped' : 'Equip'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.skinBtn, !canAfford && styles.skinBtnDisabled]}
          onPress={() => canAfford && onBuy(skin)}
          activeOpacity={canAfford ? 0.8 : 1}
        >
          <Text style={[styles.skinBtnText, !canAfford && { color: 'rgba(255,255,255,0.25)' }]}>Buy</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Screen ────────────────────────────────────────────────────
const StoreScreen = ({ navigation }) => {
  const { showRewarded, isRewardedReady, ensureRewardedLoaded } = useAd();
  const [items,   setItems]   = useState([]);
  const [skins,   setSkins]   = useState([]);
  const [coins,   setCoins]   = useState(0);
  const [auto,    setAuto]    = useState(false);  // auto-watch rewarded loop active
  const [watched, setWatched] = useState(0);      // ads completed this auto session
  const showingRef = useRef(false);               // a rewarded ad is on screen now

  const refresh = useCallback(async () => {
    const [data, skinData, bal] = await Promise.all([getAllItems(), getAllSkins(), getCoins()]);
    setItems(data);
    setSkins(skinData);
    setCoins(bal);
  }, []);

  useEffect(() => {
    refresh();
    // Kick a fresh rewarded load on entry so "Earn Coin" doesn't sit stuck on
    // "Ad loading..." while a long error-backoff runs.
    ensureRewardedLoaded();
    const unsubFocus = navigation.addListener('focus', () => {
      refresh();
      ensureRewardedLoaded();
    });
    // Leaving the Store ends any auto-watch session.
    const unsubBlur = navigation.addListener('blur', () => setAuto(false));
    return () => { unsubFocus(); unsubBlur(); };
  }, [navigation]);

  const startAutoEarn = () => { setWatched(0); setAuto(true); };
  const stopAutoEarn  = () => setAuto(false);

  // Auto-watch loop: while `auto` is on, show a rewarded ad as soon as one is
  // ready, grant 10 coins per completed view, then chain the next — until the
  // user taps Stop (or leaves the Store). isRewardedReady flips false→true each
  // ad (shown → closed → reloaded), re-running this effect to show the next one.
  useEffect(() => {
    if (!auto) return;
    if (showingRef.current) return;                          // an ad is on screen
    if (!isRewardedReady) { ensureRewardedLoaded(); return; } // wait for next ad
    showingRef.current = true;
    const shown = showRewarded(
      async () => { const b = await addCoin(10); setCoins(b); setWatched(w => w + 1); },
      () => { showingRef.current = false; refresh(); },
    );
    if (!shown) { showingRef.current = false; ensureRewardedLoaded(); }
  }, [auto, isRewardedReady]);

  const handleBuy = async (item) => {
    const ok = await spendCoins(item.price);
    if (!ok) {
      Alert.alert('Not enough coins', `Need ${item.price - coins} more coins.`);
      return;
    }
    await grantItem(item.id);
    await refresh();
    Alert.alert('Success!', `Purchased "${item.nameEn}"!`);
  };

  const handleBuySkin = async (skin) => {
    const ok = await spendCoins(skin.price);
    if (!ok) {
      Alert.alert('Not enough coins', `Need ${skin.price - coins} more coins.`);
      return;
    }
    await unlockSkin(skin.id);
    await setActiveSkin(skin.id);
    await refresh();
    Alert.alert('Success!', `Unlocked "${skin.nameEn}"!`);
  };

  const handleEquipSkin = async (skin) => {
    await setActiveSkin(skin.id);
    await refresh();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <LinearGradient colors={['#050510', '#0a0a1a', '#0f0f2a']} style={styles.gradient}>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.pageTitle}>
            Your wallet
          </Text>

          {/* Wallet */}
          <WalletCard
            coins={coins}
            auto={auto}
            watched={watched}
            adReady={isRewardedReady}
            onEarn={startAutoEarn}
            onStop={stopAutoEarn}
          />

          {/* Owned inventory row */}
          <OwnedRow items={items} />

          {/* STORE divider */}
          <Text style={styles.storeTitle}>STORE</Text>

          {/* Items list */}
          <View style={styles.storeList}>
            {items.map((item) => (
              <StoreItem
                key={item.id}
                item={item}
                coins={coins}
                onBuy={handleBuy}
              />
            ))}
          </View>

          {/* SHIP SKINS section */}
          <Text style={[styles.storeTitle, { marginTop: 28 }]}>SHIPS</Text>
          <View style={styles.skinGrid}>
            {skins.map((skin) => (
              <SkinCard
                key={skin.id}
                skin={skin}
                coins={coins}
                onBuy={handleBuySkin}
                onEquip={handleEquipSkin}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomDock} pointerEvents="box-none">
          <BottomNav navigation={navigation} activeTab="Store" />
          {Platform.OS !== 'web' && <AdBanner />}
        </View>
      </LinearGradient>

    </View>
  );
};

export default StoreScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  gradient:  { flex: 1 },
  scroll:    { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 150,
  },
  topHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  bottomDock: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
  },

  pageTitle: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: 18,
  },

  // Wallet card
  walletCard: {
    backgroundColor: '#16172e',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    overflow: 'hidden',
  },
  walletBg: {
    position: 'absolute', right: -8, bottom: -8,
    width: 110, height: 110, opacity: 0.15,
  },
  walletLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5, marginBottom: 10,
  },
  walletRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  walletCoinImg: { width: 36, height: 36 },
  walletBalance: {
    fontSize: 36, fontWeight: '900', color: '#FFD700', flex: 1,
    textShadowColor: '#FFD70066', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  earnBtn:     { borderRadius: 14, overflow: 'hidden' },
  earnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  earnIcon:    { width: 18, height: 18 },
  earnText:    { fontSize: 14, fontWeight: '700', color: '#fff' },
  walletSub:   { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  // Owned row
  ownedRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 20, marginBottom: 24,
  },
  ownedItem:  { alignItems: 'center', gap: 4 },
  ownedImg:   { width: 52, height: 52 },
  ownedCount: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Store section
  storeTitle: {
    fontSize: 26, fontWeight: '900', color: '#fff',
    textAlign: 'center', letterSpacing: 4, marginBottom: 14,
  },
  storeList: {
    backgroundColor: '#16172e',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  storeItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  storeItemImg:  { width: 52, height: 52 },
  storeItemInfo: { flex: 1 },
  storeItemName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  storeItemDesc: { fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 5 },
  priceRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceIcon:     { width: 14, height: 14 },
  priceText:     { fontSize: 15, fontWeight: '800' },

  buyBtn: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.5)',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  buyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  buyText: { fontSize: 14, fontWeight: '700', color: '#a78bfa' },

  // Skin grid
  skinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skinCard: {
    width: '31%',
    backgroundColor: '#16172e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  skinCardActive: {
    borderColor: '#4ade80',
    borderWidth: 2,
    backgroundColor: '#16272e',
  },
  skinActiveBadge: {
    position: 'absolute', top: 6, right: 8,
  },
  skinActiveTick: { fontSize: 14, color: '#4ade80', fontWeight: '900' },
  skinPriceBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  skinPriceIcon: { width: 10, height: 10 },
  skinPriceText: { fontSize: 10, fontWeight: '800', color: '#FFD700' },
  skinImg: { width: 64, height: 64, marginBottom: 6, marginTop: 4 },
  skinName: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', marginBottom: 8,
  },
  skinBtn: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.5)',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  skinBtnActive: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderColor: 'rgba(74,222,128,0.5)',
  },
  skinBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
  skinBtnText: { fontSize: 11, fontWeight: '700', color: '#a78bfa' },
});
