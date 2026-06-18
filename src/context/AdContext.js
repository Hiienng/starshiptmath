import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, Modal, StyleSheet, Image } from 'react-native';
import mobileAds, {
  RewardedAd, RewardedAdEventType, InterstitialAd, AdEventType,
  AdsConsent, AdsConsentStatus, MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, AD_CONFIG } from '../config/ads';
import { getCoins, spendCoins } from '../utils/itemStorage';

const COIN_IMG = require('../../assets/coin.png');

// ── Exponential backoff: 30s → 60s → 120s → cap at 120s ──────────────────────
const BACKOFF_BASE_MS  = 30_000;
const BACKOFF_MAX_MS   = 120_000;
const nextBackoff = (attempt) =>
  Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS);

const AdContext = createContext({
  isRewardedReady: false,
  showRewarded: (onRewarded, onClosed) => false,
  ensureRewardedLoaded: () => {},
  showInterstitial: (onClosed) => false,
  ensureInterstitialLoaded: () => {},
  recordGameOver: (advance) => advance?.(),
  recordLevelCleared: (advance) => advance?.(),
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
  // When an interstitial is about to show and the player can afford the skip,
  // we render a modal offering "pay coins to skip" vs "watch ad". Holds the
  // pending `advance` callback (and the coin balance, for display) while open.
  const [skipPrompt, setSkipPrompt] = useState(null); // { advance, coins } | null

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
  const rewLoadingRef  = useRef(false); // a load() is in flight — avoid duplicates
  const rewEarnedCbRef = useRef(null); // set just before show(); cleared after fired
  const rewEarnedFired = useRef(false); // guard: callback fires at most once per show
  const rewClosedCbRef = useRef(null);
  const rewRetryRef    = useRef(0);

  const loadRewarded = () => {
    if (Platform.OS === 'web') return;
    if (rewLoadingRef.current) return; // already loading; don't stack requests
    rewLoadingRef.current = true;

    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED, AD_REQUEST_OPTIONS);

    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewRetryRef.current = 0;
      rewLoadingRef.current = false;
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
      rewLoadingRef.current = false;
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

  // Kick a fresh rewarded load if one isn't ready and isn't already in flight.
  // Called when the user opens a screen that needs a rewarded ad (e.g. Store),
  // so they don't have to wait out a long error-backoff before "Earn Coin" works.
  const ensureRewardedLoaded = () => {
    if (Platform.OS === 'web') return;
    if (rewLoadedRef.current || rewLoadingRef.current) return;
    rewRetryRef.current = 0; // user-initiated: retry immediately
    loadRewarded();
  };

  // ── Interstitial ──────────────────────────────────────────────────────────
  const intAdRef       = useRef(null);
  const intLoadedRef   = useRef(false);
  const intLoadingRef  = useRef(false); // a load() is in flight — avoid duplicates
  const intClosedCbRef = useRef(null);
  const intRetryRef    = useRef(0);
  // Consecutive level/stage clears with no game-over in between. Drives the
  // win-streak interstitial for the level-based modes (see recordLevelCleared).
  const winStreakRef = useRef(0);

  // Ground-truth readiness: ask the ad instance itself (library sets `loaded`
  // internally on the native LOADED event, independent of our JS listeners), so
  // a missed/mis-mapped listener can't leave us thinking a loaded ad isn't ready.
  const isInterstitialReady = () => !!(intAdRef.current && intAdRef.current.loaded);

  const loadInterstitial = () => {
    if (Platform.OS === 'web') return;
    if (intLoadingRef.current) return; // already loading; don't stack requests
    intLoadingRef.current = true;

    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, AD_REQUEST_OPTIONS);

    ad.addAdEventListener(AdEventType.LOADED, () => {
      intRetryRef.current = 0;
      intLoadingRef.current = false;
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
      intLoadingRef.current = false;
      intLoadedRef.current = false;
      const delay = nextBackoff(intRetryRef.current);
      intRetryRef.current = Math.min(intRetryRef.current + 1, 4);
      console.log(`[AdContext] Interstitial error (retry in ${delay / 1000}s):`, error?.code ?? error);
      setTimeout(loadInterstitial, delay);
    });

    ad.load();
    intAdRef.current = ad;
  };

  // Kick a fresh interstitial load if one isn't ready and isn't already in
  // flight. Called when a game screen mounts so interstitials are reliably
  // loaded even if the one-shot load in the init effect was slow/failed —
  // mirrors ensureRewardedLoaded (without this, interstitials could never load).
  const ensureInterstitialLoaded = () => {
    if (Platform.OS === 'web') return;
    if (isInterstitialReady() || intLoadingRef.current) return;
    intRetryRef.current = 0; // entering a game: retry immediately
    loadInterstitial();
  };

  const showInterstitial = (onClosed) => {
    if (Platform.OS === 'web') { onClosed?.(); return false; }
    if (!isInterstitialReady()) {
      ensureInterstitialLoaded(); // not ready now — start loading for next time
      onClosed?.();
      return false;
    }
    winStreakRef.current = 0;
    intClosedCbRef.current = onClosed ?? null;
    try {
      intAdRef.current.show();
      return true;
    } catch (e) {
      // show() throws if the native ad isn't actually loaded — never strand the
      // user: drop the callback, advance, and reload for next time.
      console.log('[AdContext] interstitial show failed:', e?.message ?? e);
      intClosedCbRef.current = null;
      ensureInterstitialLoaded();
      onClosed?.();
      return false;
    }
  };

  // ── maybeShowInterstitial ─────────────────────────────────────────────────
  // The single decision point for an "ad moment":
  //   • no ad ready          → advance now (and kick a load for next time)
  //   • ad ready + can afford → open the "pay AD_SKIP_COST coins to skip / watch
  //                             ad" modal; `advance` runs after the user chooses
  //   • ad ready + can't pay  → show the interstitial (advance after it closes)
  // Either branch calls `advance` exactly once, so callers never call it again.
  const maybeShowInterstitial = async (advance) => {
    if (Platform.OS === 'web') { advance?.(); return; }
    if (!isInterstitialReady()) {
      ensureInterstitialLoaded();
      advance?.();
      return;
    }
    let coins = 0;
    try { coins = await getCoins(); } catch {}
    if (coins >= AD_CONFIG.AD_SKIP_COST) {
      setSkipPrompt({ advance, coins });
    } else {
      showInterstitial(advance);
    }
  };

  // ── recordGameOver ───────────────────────────────────────────────────────
  // Call when a game/run ENDS (quick-reaction game-over, or a run finishing).
  // Offers an interstitial on every game-over. Resets the win streak.
  const recordGameOver = (advance) => {
    if (Platform.OS === 'web') { advance?.(); return; }
    winStreakRef.current = 0;
    maybeShowInterstitial(advance);
  };

  // ── recordLevelCleared ───────────────────────────────────────────────────
  // Call when a level/stage is CLEARED and we're advancing to the next one.
  // Counts toward the win streak; every AD_CONFIG.WIN_STREAK_FOR_AD consecutive
  // clears, offer an interstitial. Otherwise advance immediately.
  const recordLevelCleared = (advance) => {
    if (Platform.OS === 'web') { advance?.(); return; }
    winStreakRef.current += 1;
    if (winStreakRef.current >= AD_CONFIG.WIN_STREAK_FOR_AD) {
      winStreakRef.current = 0;
      maybeShowInterstitial(advance);
    } else {
      advance?.();
    }
  };

  // Choices for the "skip ad with coins" modal.
  const onSkipWithCoins = async () => {
    const advance = skipPrompt?.advance;
    setSkipPrompt(null);
    try { await spendCoins(AD_CONFIG.AD_SKIP_COST); } catch {}
    advance?.();
  };
  const onWatchAdInstead = () => {
    const advance = skipPrompt?.advance;
    setSkipPrompt(null);
    showInterstitial(advance);
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
      ensureRewardedLoaded,
      showInterstitial,
      ensureInterstitialLoaded,
      recordGameOver,
      recordLevelCleared,
      npa,
    }}>
      {children}

      {/* "Pay coins to skip the ad" prompt — shown when an interstitial is ready
          and the player can afford AD_CONFIG.AD_SKIP_COST. */}
      <Modal visible={!!skipPrompt} transparent animationType="fade" onRequestClose={onWatchAdInstead}>
        <View style={adStyles.overlay}>
          <View style={adStyles.card}>
            <Text style={adStyles.title}>Skip the ad?</Text>
            <Text style={adStyles.sub}>Use coins to skip, or watch a quick ad.</Text>

            <View style={adStyles.balanceRow}>
              <Image source={COIN_IMG} style={adStyles.coinIcon} resizeMode="contain" />
              <Text style={adStyles.balanceTxt}>{skipPrompt?.coins ?? 0}</Text>
            </View>

            <TouchableOpacity style={adStyles.payBtn} onPress={onSkipWithCoins} activeOpacity={0.85}>
              <Image source={COIN_IMG} style={adStyles.payIcon} resizeMode="contain" />
              <Text style={adStyles.payTxt}>Pay {AD_CONFIG.AD_SKIP_COST} — Skip ad</Text>
            </TouchableOpacity>

            <TouchableOpacity style={adStyles.watchBtn} onPress={onWatchAdInstead} activeOpacity={0.85}>
              <Text style={adStyles.watchTxt}>▶  Watch ad</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdContext.Provider>
  );
};

const adStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%', maxWidth: 320,
    backgroundColor: '#16172e',
    borderRadius: 22,
    paddingHorizontal: 24, paddingVertical: 26,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', marginTop: 6,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 4 },
  coinIcon: { width: 20, height: 20 },
  balanceTxt: { fontSize: 18, fontWeight: '800', color: '#FFD700' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', marginTop: 16,
    backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 13,
  },
  payIcon: { width: 18, height: 18 },
  payTxt: { fontSize: 15, fontWeight: '800', color: '#1a1200' },
  watchBtn: {
    width: '100%', marginTop: 10,
    backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 13,
    alignItems: 'center',
  },
  watchTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

export const useAd = () => useContext(AdContext);
