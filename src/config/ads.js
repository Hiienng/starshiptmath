import { Platform } from 'react-native';

// AdMob Test IDs - Replace with your real IDs before publishing
const TEST_IDS = {
  BANNER: Platform.select({
    android: 'ca-app-pub-3940256099942544/6300978111',
    ios: 'ca-app-pub-3940256099942544/2934735716',
  }),
  INTERSTITIAL: Platform.select({
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
  }),
  REWARDED: Platform.select({
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
  }),
};

// Production IDs - Replace these with your actual AdMob unit IDs
const PRODUCTION_IDS = {
  BANNER: Platform.select({
    android: 'ca-app-pub-3524383584807120/5474314105',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
  }),
  INTERSTITIAL: Platform.select({
    android: 'ca-app-pub-3524383584807120/9624655568',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
  }),
  REWARDED: Platform.select({
    android: 'ca-app-pub-3524383584807120/8311573895',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
  }),
};

// Set to false for production
const USE_TEST_ADS = __DEV__;

export const AD_UNIT_IDS = USE_TEST_ADS ? TEST_IDS : PRODUCTION_IDS;

// Ad display frequency settings
export const AD_CONFIG = {
  // Show interstitial after every N games
  INTERSTITIAL_FREQUENCY: 1,
  // Delay before showing interstitial (ms)
  INTERSTITIAL_DELAY: 1000,
  // Safety net: if this many levels/games pass without any interstitial
  // being shown, force one on the next level transition.
  MAX_LEVELS_WITHOUT_AD: 5,
};

export default {
  AD_UNIT_IDS,
  AD_CONFIG,
};
