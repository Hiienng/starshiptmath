import React, { createContext, useContext } from 'react';

const noop = (cb) => { cb?.(); return false; };

const AdContext = createContext({
  isRewardedReady: false,
  showRewarded: (_onRewarded, onClosed) => { onClosed?.(); return false; },
  showInterstitial: (onClosed) => { onClosed?.(); return false; },
  recordLevelPlayed: (advance) => advance?.(),
  npa: true,
});

export const AdProvider = ({ children, ageGroup }) => (
  <AdContext.Provider value={{
    isRewardedReady: false,
    showRewarded: (_onRewarded, onClosed) => { onClosed?.(); return false; },
    showInterstitial: (onClosed) => { onClosed?.(); return false; },
    recordLevelPlayed: (advance) => advance?.(),
    npa: true,
  }}>
    {children}
  </AdContext.Provider>
);

export const useAd = () => useContext(AdContext);
