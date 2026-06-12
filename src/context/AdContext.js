import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import mobileAds, {
  RewardedAd, RewardedAdEventType, InterstitialAd, AdEventType,
  AdsConsent, AdsConsentStatus, MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, AD_CONFIG } from '../config/ads';

// ── Exponential backoff: 30s → 60s → 120s → cap at 120s ──────────────────────
const BACKOFF_BASE_MS  = 30_000;
const BACKOFF_MAX_MS   = 120_000;
const nextBackoff = (attempt) =>
  Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS);

const AdContext = createContext({
  isRewardedReady: false,
  showRewarded: (onRewarded, onClosed) => false,
  showInterstitial: (onClosed) => false,
  recordLevelPlayed: (advance) => advance?.(),
  npa: true,
});

// `ageGroup` ('kid' | 'teen' | 'adult' | null) — see CLAUDE.md §2.3.
//   - null    → user hasn't picked yet; SDK already initialized with the most
//     conservative config (G-rated, child-directed, NPA) so ads can load
//     immediately (<AdBanner> mounts before ageGroup is known).
//   - 'kid'   → <13: tagForChildDirectedTreatment=true, contextual ads only, NPA, no UMP.
//   - 'teen'  → 13-17: tagForUnderAgeOfConsent=true, force NPA, contextual only, no UMP.
//   - 'adult' → 18+: standard AdMob with UMP/GDPR consent + personalized when allowed.
export const AdProvider = ({ children, ageGroup }) => {

  const [isRewardedReady, setRewardedReady] = useState(false);
  // NPA = non-personalized ads. Default true (safe). Adult flips to false after UMP allows it.
  // Kids and teens are always NPA per CLAUDE.md §2.3.
  const [npa, setNpa] = useState(true);

  const AD_REQUEST_OPTIONS = {
    requestNonPersonalizedAdsOnly: npa,
    // Keywords drive contextual targeting. Per CLAUDE.md §2.2 the app is "Not
    // child-directed" globally, so the keyword set stays neutral — kid/teen
    // safety is enforced via tagForChildDirectedTreatment / underAgeOfConsent
    // tags applied in setRequestConfiguration above, not via keywords.
    keywords: ['math', 'education', 'puzzle', 'brain training', 'logic game'],
  };

  // ── Rewarded ──────────────────────────────────────────────────────────────
  const rewAdRef       = useRef(null);
  const rewLoadedRef   = useRef(false);
  const rewEarnedCbRef = useRef(null); // set just before show(); cleared after fired
  const rewEarnedFired = useRef(false); // guard: callback fires at most once per show
  const rewClosedCbRef = useRef(null);
  const rewRetryRef    = useRef(0);

  const loadRewarded = () => {
    if (Platform.OS === 'web') return;

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED, AD_REQUEST_OPTIONS);

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewRetryRef.current = 0;
      rewLoadedRef.current = true;
      setRewardedReady(true);
    });

    // ✅ ONLY place where reward is granted — Google has confirmed user watched
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      if (!rewEarnedFired.current) {
        rewEarnedFired.current = true;
        rewEarnedCbRef.current?.();
      }
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      rewLoadedRef.current = false;
      setRewardedReady(false);
      const cb = rewClosedCbRef.current;
      // Clear all callbacks before calling closed, so a re-entrant show() can't
      // accidentally reuse them.
      rewEarnedCbRef.current = null;
      rewClosedCbRef.current = null;
      rewEarnedFired.current = false;
      cb?.();
      loadRewarded(); // preload next immediately after dismiss
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      rewLoadedRef.current = false;
      setRewardedReady(false);
      const delay = nextBackoff(rewRetryRef.current);
      rewRetryRef.current = Math.min(rewRetryRef.current + 1, 4);
      console.log(`[AdContext] Rewarded error (retry in ${delay / 1000}s):`, error?.code ?? error);
      setTimeout(loadRewarded, delay);
    });

    ad.load();
    rewAdRef.current = ad;
  };

  // ── Interstitial ──────────────────────────────────────────────────────────
  const intAdRef       = useRef(null);
  const intLoadedRef   = useRef(false);
  const intClosedCbRef = useRef(null);
  const intRetryRef    = useRef(0);
  // Levels/games played since the last interstitial was actually shown.
  // Safety net so a mode without its own interstitial schedule (or one whose
  // schedule keeps missing, e.g. ad not ready) still surfaces ads regularly.
  const levelsSinceAdRef = useRef(0);

  const loadInterstitial = () => {
    if (Platform.OS === 'web') return;

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, AD_REQUEST_OPTIONS);

    ad.addAdEventListener(AdEventType.LOADED, () => {
      intRetryRef.current = 0;
      intLoadedRef.current = true;
    });

    ad.addAdEventListener(AdEventType.CLOSED, () => {
      intLoadedRef.current = false;
      const cb = intClosedCbRef.current;
      intClosedCbRef.current = null;
      cb?.();
      loadInterstitial();
    });

    ad.addAdEventListener(AdEventType.ERROR, (error) => {
      intLoadedRef.current = false;
      const delay = nextBackoff(intRetryRef.current);
      intRetryRef.current = Math.min(intRetryRef.current + 1, 4);
      console.log(`[AdContext] Interstitial error (retry in ${delay / 1000}s):`, error?.code ?? error);
      setTimeout(loadInterstitial, delay);
    });

    ad.load();
    intAdRef.current = ad;
  };

  const showInterstitial = (onClosed) => {
    if (Platform.OS === 'web') { onClosed?.(); return false; }
    if (!intLoadedRef.current || !intAdRef.current) {
      onClosed?.();
      return false;
    }
    levelsSinceAdRef.current = 0;
    intClosedCbRef.current = onClosed ?? null;
    intAdRef.current.show();
    return true;
  };

  // ── recordLevelPlayed ───────────────────────────────────────────────────
  // Call after a level/round finishes, right before advancing. Counts levels
  // played since the last interstitial; once AD_CONFIG.MAX_LEVELS_WITHOUT_AD
  // is reached, forces an interstitial before calling `advance`. Otherwise
  // (or if no ad is ready) just calls `advance` immediately.
  const recordLevelPlayed = (advance) => {
    if (Platform.OS === 'web') { advance?.(); return; }
    levelsSinceAdRef.current += 1;
    if (levelsSinceAdRef.current >= AD_CONFIG.MAX_LEVELS_WITHOUT_AD) {
      const shown = showInterstitial(advance);
      if (!shown) advance?.();
    } else {
      advance?.();
    }
  };

  // ── Startup: initialize SDK immediately ────────────────────────────────────
  // <AdBanner> mounts on first render. AdBanner has no retry — if its first
  // request fires before mobileAds().initialize() resolves, it fails
  // permanently for the session. So initialize the SDK ASAP.
  //
  // `ageGroup` is read from storage in App.js *before* anything renders, so
  // for returning users it's already known at mount time — use it directly
  // here so the very first setRequestConfiguration/initialize() call already
  // has the correct (less restrictive) settings for adult/teen users,
  // instead of racing against the "refine" effect below with the most
  // conservative config (G-rated, child-directed, underage). That race could
  // leave an adult session tagged as child-directed for its ad requests,
  // hurting fill rate/eCPM. Only fall back to the conservative default when
  // ageGroup is genuinely unknown (new user, still on AgeGate).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    let initRetryAttempt = 0;

    const isKid   = ageGroup === 'kid';
    const isTeen  = ageGroup === 'teen';
    const isAdult = ageGroup === 'adult';

    // If initialize() itself fails (e.g. no network at cold start), retry with
    // backoff — otherwise rewarded/interstitial would never start loading for
    // the whole session (banner has its own independent retry in AdBanner).
    const init = async () => {
      if (cancelled) return;
      try {
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: isAdult ? MaxAdContentRating.T : MaxAdContentRating.G,
          tagForChildDirectedTreatment: isKid,
          tagForUnderAgeOfConsent: !ageGroup || isKid || isTeen,
        });
        await mobileAds().initialize();
        if (cancelled) return;
        loadRewarded();
        loadInterstitial();
      } catch (e) {
        const delay = nextBackoff(initRetryAttempt);
        initRetryAttempt = Math.min(initRetryAttempt + 1, 4);
        console.log(`[AdContext] init failed (retry in ${delay / 1000}s):`, e?.message ?? e);
        setTimeout(init, delay);
      }
    };

    init();

    return () => { cancelled = true; };
  }, []);

  // ── Refine config once ageGroup is known ──────────────────────────────────
  // Per CLAUDE.md §2.3:
  //   kid   (<13)   → child-directed + NPA + contextual + no UMP.
  //   teen  (13-17) → underAgeOfConsent + NPA + contextual + no UMP.
  //   adult (18+)   → standard + UMP/GDPR + personalized when allowed.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!ageGroup) return; // wait for user to pick

    const isKid   = ageGroup === 'kid';
    const isTeen  = ageGroup === 'teen';
    const isAdult = ageGroup === 'adult';
    let cancelled = false;

    (async () => {
      try {
        // SDK config per age bucket:
        //   - tagForChildDirectedTreatment: true ONLY for <13.
        //   - tagForUnderAgeOfConsent:      true for <13 AND 13-17 (so AdMob automates
        //     under-age compliance even though the kid bucket is also child-directed).
        //   - maxAdContentRating: G for kid/teen (kid-safe), T for adult.
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: isAdult ? MaxAdContentRating.T : MaxAdContentRating.G,
          tagForChildDirectedTreatment: isKid,
          tagForUnderAgeOfConsent: isKid || isTeen,
        });

        if (isKid || isTeen) {
          // Kid/teen paths: NPA always, no UMP form (would be invalid for under-age).
          // SDK is already initialized and ads already loading from the effect
          // above (with the same NPA=true default), nothing else to do.
          return;
        }

        // Adult path: full UMP/GDPR consent flow.
        const info = await AdsConsent.requestInfoUpdate({
          tagForUnderAgeOfConsent: false,
        });

        if (info.isConsentFormAvailable && info.status === AdsConsentStatus.REQUIRED) {
          const after = await AdsConsent.showForm();
          if (after.status === AdsConsentStatus.OBTAINED && !cancelled) {
            setNpa(false);
          }
        } else if (info.status === AdsConsentStatus.OBTAINED ||
                   info.status === AdsConsentStatus.NOT_REQUIRED) {
          // Outside EEA/UK/CH or already-stored consent → personalized.
          if (!cancelled) setNpa(false);
        }
      } catch (e) {
        console.log('[AdContext] consent flow failed:', e?.message ?? e);
      }
    })();

    return () => { cancelled = true; };
  }, [ageGroup]);

  // ── Reload ads when NPA flips to false (adult consent obtained) ───────────
  // Ads already loaded by the startup effect used NPA=true. Once an adult's
  // consent allows personalized ads, reload so the new requests use it.
  const isFirstNpaRender = useRef(true);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (isFirstNpaRender.current) { isFirstNpaRender.current = false; return; }
    if (npa) return;
    loadRewarded();
    loadInterstitial();
  }, [npa]);

  // ── showRewarded ──────────────────────────────────────────────────────────
  /**
   * Returns true if ad was shown (i.e. was ready).
   * Returns false if not loaded — caller should show UI message, NOT grant reward.
   *
   * Reward is ONLY granted inside the EARNED_REWARD event above.
   */
  const showRewarded = (onRewarded, onClosed) => {
    if (Platform.OS === 'web') { onClosed?.(); return false; }
    if (!rewLoadedRef.current || !rewAdRef.current) {
      // Do NOT call onRewarded here — ad hasn't been verified by Google
      onClosed?.();
      return false;
    }
    rewEarnedCbRef.current = onRewarded ?? null;
    rewClosedCbRef.current = onClosed ?? null;
    rewEarnedFired.current = false;
    rewAdRef.current.show();
    return true;
  };

  return (
    <AdContext.Provider value={{
      isRewardedReady,
      showRewarded,
      showInterstitial,
      recordLevelPlayed,
      npa,
    }}>
      {children}
    </AdContext.Provider>
  );
};

export const useAd = () => useContext(AdContext);
