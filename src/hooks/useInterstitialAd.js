import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, AD_CONFIG } from '../config/ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GAME_COUNT_KEY = 'game_count_for_ads';

const useInterstitialAd = () => {
  const [interstitialAd, setInterstitialAd] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Don't load ads on web
    if (Platform.OS === 'web') return;

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setIsLoaded(false);
      // Reload ad for next time
      ad.load();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('Interstitial ad error:', error);
      setIsLoaded(false);
    });

    // Start loading the ad
    ad.load();
    setInterstitialAd(ad);

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  const showAd = useCallback(async (force = false) => {
    if (Platform.OS === 'web') return false;

    try {
      const countStr = await AsyncStorage.getItem(GAME_COUNT_KEY);
      let count = countStr ? parseInt(countStr, 10) : 0;
      count++;
      await AsyncStorage.setItem(GAME_COUNT_KEY, count.toString());

      const shouldShow = force || (count % AD_CONFIG.INTERSTITIAL_FREQUENCY === 0);
      if (shouldShow && isLoaded && interstitialAd) {
        await new Promise(resolve => setTimeout(resolve, AD_CONFIG.INTERSTITIAL_DELAY));
        interstitialAd.show();
        return true;
      }
    } catch (error) {
      console.log('Error showing interstitial:', error);
    }
    return false;
  }, [isLoaded, interstitialAd]);

  return { showAd, isLoaded };
};

export default useInterstitialAd;
