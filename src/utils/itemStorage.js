import AsyncStorage from '@react-native-async-storage/async-storage';

export const ADS_REQUIRED = 3;

const ITEMS_KEY = 'store_items_v1';
const ADS_WATCHED_KEY = 'store_ads_watched_v1';
const COIN_KEY = 'magic_coins_v1';
const COINS_INITIALIZED_KEY = 'coins_initialized_v1';

// Grant 30 coins on first install — call once at app startup
export const initializeCoins = async () => {
  try {
    const done = await AsyncStorage.getItem(COINS_INITIALIZED_KEY);
    if (done) return;
    await AsyncStorage.setItem(COIN_KEY, '40');
    await AsyncStorage.setItem(COINS_INITIALIZED_KEY, '1');
  } catch {}
};

export const getCoins = async () => {
  try {
    const val = await AsyncStorage.getItem(COIN_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
};

export const addCoin = async (amount = 1) => {
  try {
    const current = await getCoins();
    const next = current + amount;
    await AsyncStorage.setItem(COIN_KEY, String(next));
    return next;
  } catch { return 0; }
};

export const spendCoins = async (amount) => {
  try {
    const current = await getCoins();
    if (current < amount) return false;
    await AsyncStorage.setItem(COIN_KEY, String(current - amount));
    return true;
  } catch { return false; }
};

// ── Ship Skins ────────────────────────────────────────────────────────────
const SKIN_KEY        = 'ship_skins_owned_v1';
const ACTIVE_SKIN_KEY = 'ship_skin_active_v1';

export const SHIP_SKINS = [
  {
    id: 'mainobj',
    nameVi: 'Tàu Tiêu Chuẩn',
    nameEn: 'Standard Ship',
    image: require('../../assets/mainobj.png'),
    price: 0, // always free
  },
  {
    id: 'starship1',
    nameVi: 'Tàu Cầu Vồng',
    nameEn: 'Rainbow Ship',
    image: require('../../assets/starship1.png'),
    price: 0, // default — free
  },
  {
    id: 'startship4',
    nameVi: 'Chiến Hạm',
    nameEn: 'Star Fighter',
    image: require('../../assets/starship4.png'),
    price: 35,
  },
  {
    id: 'starship3',
    nameVi: 'Tàu Mùa Hè',
    nameEn: 'Summer Cruiser',
    image: require('../../assets/starship3.png'),
    price: 30,
  },
  {
    id: 'starship2',
    nameVi: 'Tàu Băng Giá',
    nameEn: 'Frost Cruiser',
    image: require('../../assets/starship2.png'),
    price: 30,
  },
  {
    id: 'shootingstar',
    nameVi: 'Sao Băng',
    nameEn: 'Shooting Star',
    image: require('../../assets/shootingstar.png'),
    price: 25,
  },
  {
    id: 'starship3D',
    nameVi: 'Tàu Plasma',
    nameEn: 'Plasma Cruiser',
    image: require('../../assets/starship3D.png'),
    price: 60, // premium top-tier skin — aspirational coin sink
  },
];

export const getAllSkins = async () => {
  try {
    const data    = await AsyncStorage.getItem(SKIN_KEY);
    const owned   = data ? JSON.parse(data) : {};
    const active  = await getActiveSkin();
    return SHIP_SKINS.map(s => ({
      ...s,
      owned:  s.price === 0 || (owned[s.id] ?? false),
      active: s.id === active,
    }));
  } catch {
    return SHIP_SKINS.map(s => ({ ...s, owned: s.price === 0, active: s.id === 'mainobj' }));
  }
};

export const getActiveSkin = async () => {
  try {
    const val = await AsyncStorage.getItem(ACTIVE_SKIN_KEY);
    return val ?? 'starship1';
  } catch { return 'starship1'; }
};

export const setActiveSkin = async (skinId) => {
  try { await AsyncStorage.setItem(ACTIVE_SKIN_KEY, skinId); } catch {}
};

export const unlockSkin = async (skinId) => {
  try {
    const data  = await AsyncStorage.getItem(SKIN_KEY);
    const owned = data ? JSON.parse(data) : {};
    owned[skinId] = true;
    await AsyncStorage.setItem(SKIN_KEY, JSON.stringify(owned));
  } catch {}
};

export const STORE_ITEMS = [
  {
    id: 'shield',
    nameVi: 'Khiên Bảo Vệ',
    nameEn: 'Iron Shield',
    descVi: 'Gợi ý đáp án đúng cho câu hiện tại',
    descEn: 'Highlights the correct answer',
    image: require('../../assets/shield.png'),
    color: '#00E5FF',
    price: 20,
  },
  {
    id: 'emergencykit',
    nameVi: 'Hộp Cứu Thương',
    nameEn: 'Emergency Kit',
    descVi: 'Hồi phục toàn bộ mạng',
    descEn: 'Restore all lives',
    image: require('../../assets/emergencykit.png'),
    color: '#FF6B9D',
    price: 30,
  },
  {
    id: 'timeboost',
    nameVi: 'Tăng Thời Gian',
    nameEn: 'Time Boost',
    descVi: '+3 giây mỗi câu hỏi',
    descEn: '+3s per question',
    image: require('../../assets/timeboost.png'),
    color: '#FFD600',
    price: 25,
  },
];

// Get owned state + uses for one item
export const getItemState = async (itemId) => {
  try {
    const data = await AsyncStorage.getItem(ITEMS_KEY);
    const items = data ? JSON.parse(data) : {};
    return items[itemId] ?? { owned: false, uses: 0 };
  } catch {
    return { owned: false, uses: 0 };
  }
};

// Get how many ads have been watched toward an item
export const getAdsWatched = async (itemId) => {
  try {
    const data = await AsyncStorage.getItem(ADS_WATCHED_KEY);
    const counts = data ? JSON.parse(data) : {};
    return counts[itemId] ?? 0;
  } catch {
    return 0;
  }
};

/**
 * Record a rewarded ad watch for an item.
 * Returns { earned: bool, adsWatched: number }
 */
export const recordAdWatched = async (itemId) => {
  try {
    const adsData = await AsyncStorage.getItem(ADS_WATCHED_KEY);
    const counts = adsData ? JSON.parse(adsData) : {};
    const current = counts[itemId] ?? 0;
    const next = current + 1;

    if (next >= ADS_REQUIRED) {
      // Earned! Grant item, reset ad counter
      counts[itemId] = 0;
      const itemsData = await AsyncStorage.getItem(ITEMS_KEY);
      const items = itemsData ? JSON.parse(itemsData) : {};
      items[itemId] = {
        owned: true,
        uses: (items[itemId]?.uses ?? 0) + 1,
      };
      await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
      await AsyncStorage.setItem(ADS_WATCHED_KEY, JSON.stringify(counts));
      return { earned: true, adsWatched: 0 };
    } else {
      counts[itemId] = next;
      await AsyncStorage.setItem(ADS_WATCHED_KEY, JSON.stringify(counts));
      return { earned: false, adsWatched: next };
    }
  } catch {
    return { earned: false, adsWatched: 0 };
  }
};

// Directly grant an item (used when buying with coins)
export const grantItem = async (itemId) => {
  try {
    const data = await AsyncStorage.getItem(ITEMS_KEY);
    const items = data ? JSON.parse(data) : {};
    items[itemId] = {
      owned: true,
      uses: (items[itemId]?.uses ?? 0) + 1,
    };
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch {}
};

// Use one charge of an item
export const useItem = async (itemId) => {
  try {
    const data = await AsyncStorage.getItem(ITEMS_KEY);
    const items = data ? JSON.parse(data) : {};
    if (!items[itemId]?.uses) return false;
    items[itemId].uses -= 1;
    if (items[itemId].uses <= 0) {
      items[itemId] = { owned: false, uses: 0 };
    }
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
};

// Load all items with their current state
export const getAllItems = async () => {
  try {
    const itemsData = await AsyncStorage.getItem(ITEMS_KEY);
    const adsData = await AsyncStorage.getItem(ADS_WATCHED_KEY);
    const items = itemsData ? JSON.parse(itemsData) : {};
    const adCounts = adsData ? JSON.parse(adsData) : {};

    return STORE_ITEMS.map((item) => ({
      ...item,
      owned: items[item.id]?.owned ?? false,
      uses: items[item.id]?.uses ?? 0,
      adsWatched: adCounts[item.id] ?? 0,
    }));
  } catch {
    return STORE_ITEMS.map((item) => ({ ...item, owned: false, uses: 0, adsWatched: 0 }));
  }
};
