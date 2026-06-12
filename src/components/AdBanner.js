import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';
import { useAd } from '../context/AdContext';

// Exponential backoff: 15s -> 30s -> 60s -> cap at 120s
const BACKOFF_BASE_MS = 15_000;
const BACKOFF_MAX_MS  = 120_000;

const AdBanner = ({ style }) => {
  const { npa } = useAd();
  const [adError, setAdError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const retryAttemptRef = useRef(0);
  const retryTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(retryTimeoutRef.current), []);

  // Don't render on web
  if (Platform.OS === 'web') {
    return null;
  }

  // If ad failed to load, don't show anything (retry is scheduled separately)
  if (adError) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        key={`${retryKey}-${npa}`}
        unitId={AD_UNIT_IDS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: npa,
        }}
        onAdLoaded={() => {
          retryAttemptRef.current = 0;
        }}
        onAdFailedToLoad={(error) => {
          console.log('Ad failed to load:', error);
          setAdError(true);
          const delay = Math.min(BACKOFF_BASE_MS * 2 ** retryAttemptRef.current, BACKOFF_MAX_MS);
          retryAttemptRef.current = Math.min(retryAttemptRef.current + 1, 4);
          retryTimeoutRef.current = setTimeout(() => {
            setAdError(false);
            setRetryKey((k) => k + 1);
          }, delay);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default AdBanner;
