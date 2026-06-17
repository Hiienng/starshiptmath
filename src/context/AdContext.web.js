import React, { createContext, useContext } from 'react';

const value = {
  isRewardedReady: false,
  showRewarded: (_onRewarded, onClosed) => { onClosed?.(); return false; },
  ensureRewardedLoaded: () => {},
  showInterstitial: (onClosed) => { onClosed?.(); return false; },
  ensureInterstitialLoaded: () => {},
  recordGameOver: (advance) => advance?.(),
  recordLevelCleared: (advance) => advance?.(),
  npa: true,
};

const AdContext = createContext(value);

export const AdProvider = ({ children, ageGroup }) => (
  <AdContext.Provider value={value}>
    {children}
  </AdContext.Provider>
);

export const useAd = () => useContext(AdContext);
