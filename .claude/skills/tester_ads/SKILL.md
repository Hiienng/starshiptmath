---
name: tester_ads
description: CRITICAL revenue-protection audit of the Starship Math ad stack. Use this whenever anything touches ads, monetization, consent, or the coin/reward economy — "test the ads", "check ad flow", "did I break monetization", "will this lose ad revenue", "is this AdMob-compliant", before ANY release build, or after editing AdContext, ads config, AdBanner, ResultScreen/StoreScreen reward paths, or the streak/coin economy. Traces every ad path for revenue-loss and account-ban risks (test IDs in production, reward fraud/invalid traffic, missed impressions, interstitial frequency/placement, child-directed/consent compliance), runs an AdMob/Play policy checklist, and REQUIRES a live native verification build before it will pass. Reports PASS/FAIL/WARN with severity in chat. Treat findings as high-stakes: a false PASS here can cost 100% of ad revenue via account suspension.
---

# tester_ads — revenue-protection audit (CRITICAL: no errors, no omissions)

The user's standard for this skill is **zero misses**. The stakes are asymmetric: the worst outcome is not a few skipped impressions — it is **AdMob suspending the account (100% revenue loss)** for a policy violation or invalid traffic, or **shipping test ad IDs (0 revenue)**. Audit for those first.

Work in three phases, **in order**. Phase 3 (live native) is **mandatory** — you may not conclude an overall PASS from code reading alone, because ads no-op entirely on web and only a real device proves fill, reward integrity, and frequency.

All paths are relative to the repo root. Canonical files:
- `src/context/AdContext.js` — SDK init, load/retry, rewarded, interstitial, consent, skip-modal.
- `src/config/ads.js` — test vs production unit IDs, `AD_CONFIG`.
- `src/components/AdBanner.js` (+ `.web.js`) — banner.
- Call sites: `ResultScreen.js`, `StoreScreen.js` (rewarded); `GameScreen.js`, `JupiterScreen.js`, `MarsScreen.js` (interstitial via `recordGameOver`/`recordLevelCleared`); `AdBanner` (banner).
- `src/utils/streakStorage.js`, `src/utils/itemStorage.js` — coin/reward economy.

## Output (chat only — do NOT write a report file)

Group findings by severity. **Every item must cite `file.js:line` and say why it risks revenue.**

- **🔴 BLOCKER** — will lose revenue or risk account ban if shipped (test IDs in prod, reward granted without a verified view, interstitial mid-gameplay, missing/incorrect child-directed tags, ads that never load with no recovery). Any BLOCKER ⇒ overall **FAIL**.
- **🟠 WARN** — degrades revenue or is policy-adjacent (aggressive frequency, banner near tap targets, coin-skip cannibalizing impressions, silent NPA fallback).
- **🟢 PASS** — verified correct; state the evidence.

Overall verdict is **PASS only if**: zero BLOCKERs AND Phase 3 live verification was actually completed. If the live build was not run, the verdict is **INCOMPLETE — not passed** (never PASS on code audit alone).

---

## Phase 1 — Static / logic audit (always run)

Trace each path in `AdContext.js` and confirm the following. Read the code; don't assume.

### 1.1 Unit IDs & build gating — BLOCKER surface
- `USE_TEST_ADS = __DEV__` (`ads.js:36`). A **production** build must resolve `AD_UNIT_IDS` to `PRODUCTION_IDS`. Confirm nothing forces `__DEV__`/test IDs into a release path.
- `PRODUCTION_IDS` Android values must be **real** unit IDs, not the Google sample `ca-app-pub-3940256099942544/...` and not `XXXX` placeholders. iOS placeholders are acceptable **only** if iOS is not shipped (this app is Android-only per CLAUDE.md) — otherwise BLOCKER.
- The AdMob **App ID** must be present in the native config (`app.json` / `AndroidManifest`). A missing/incorrect App ID = SDK never serves.

### 1.2 Rewarded integrity — reward fraud = invalid traffic = account ban
- Reward is granted **only** inside the `EARNED_REWARD` listener (`AdContext.js:80`). Confirm **no other code path** credits coins/lives for "watching" an ad.
- `showRewarded` returns `false` and calls only `onClosed` (never `onRewarded`) when the ad isn't loaded (`AdContext.js:396`). Confirm both callers honour this:
  - `ResultScreen.js:234` — reward only via the `onRewarded` callback, not on a `false` return.
  - `StoreScreen.js:206-212` — on not-ready it must wait/preload and **not** grant.
- `rewEarnedFired` guards against double-grant per show (`AdContext.js:61,81`). Confirm it's reset per show and can't fire twice.
- Daily rewarded-bonus cap: `recordDailyBonus` refuses past **3/day** (`streakStorage.js`). Confirm the UI can't bypass the cap (e.g. rapid taps, re-entry).

### 1.3 Impression capture — missed impressions = lost revenue
- Load lifecycle: ads load on SDK init (`AdContext.js:303-304`), **reload on CLOSED** (`:97`, `:157`), and **retry on ERROR with backoff** (`:100-108`, `:160-167`). Confirm none of these were removed/short-circuited.
- `ensureRewardedLoaded` / `ensureInterstitialLoaded` recover from a stuck/backed-off state on user intent. Confirm they're called where needed: Store (`StoreScreen.js:186,189,206,212`), game screens on mount (`GameScreen.js:198`, `JupiterScreen.js:278`, `MarsScreen.js:168`).
- `isInterstitialReady()` uses the ad instance's own `loaded` flag as ground truth (`AdContext.js:137`) — not just a JS boolean. Confirm interstitial show decisions use it.
- **`advance` is called exactly once on every branch** of `maybeShowInterstitial` / `showInterstitial` / `recordGameOver` / `recordLevelCleared` (`AdContext.js:184-252`). Never zero (user stranded) and never twice (double navigation / skipped screen). Trace all branches: web, not-ready, ready+afford (skip modal), ready+can't-afford, show throws.

### 1.4 Interstitial frequency & placement — policy → account ban
- Interstitials fire only at natural breaks: **every game-over** (`recordGameOver`) and every **`WIN_STREAK_FOR_AD` (=2)** consecutive clears (`recordLevelCleared`, `AD_CONFIG` `ads.js:44`). Confirm **no interstitial during active gameplay**, on app launch, or on app return.
- No two interstitials back-to-back and no interstitial immediately after a rewarded ad. `winStreakRef` resets to 0 after a shown interstitial and on game-over (`AdContext.js:191,235,247`).
- The "pay coins to skip" modal (`AD_CONFIG.AD_SKIP_COST=9`) only appears when an interstitial is **ready and affordable**; choosing "watch ad" still shows the ad. This trades an impression for a coin sink — confirm it's intentional and doesn't silently suppress ads (WARN if the skip is too cheap/too frequent).

### 1.5 Consent, NPA & child-directed — compliance = revenue continuity
Cross-check against CLAUDE.md §2.3. Wrong tags here are both a legal risk and an account-ban risk.
- Before age is known (`ageGroup === null`): most conservative config — `tagForChildDirectedTreatment` handling, `tagForUnderAgeOfConsent: true`, `maxAdContentRating: G`, NPA (`AdContext.js:296-300`).
- **kid (<13):** `tagForChildDirectedTreatment: true`, `tagForUnderAgeOfConsent: true`, `G`, NPA, **no UMP form** (`:339-350`).
- **teen (13-17):** `tagForUnderAgeOfConsent: true`, `tagForChildDirectedTreatment: false`, `G`, NPA, no UMP (`:339-350`).
- **adult (18+):** UMP/GDPR `requestInfoUpdate` → `showForm`; `npa` flips to `false` only on `OBTAINED`/`NOT_REQUIRED` (`:352-366`); `maxAdContentRating: T`.
- On `npa` flip, ads reload so new requests use personalized settings (`:378-385`).
- `AD_REQUEST_OPTIONS.requestNonPersonalizedAdsOnly` tracks `npa` (`:48`).
- **GAP to flag:** CLAUDE.md requires blocking sensitive categories (alcohol/tobacco/gambling/adult/weight-loss) for kid/teen. The code enforces safety via `maxAdContentRating` + tags but does **not** show explicit per-category blocking — that is configured in the AdMob dashboard. Explicitly report whether this is handled in-code or must be verified in the AdMob console, and mark WARN if unconfirmed.

### 1.6 Banner (`AdBanner.js`)
- Has its own retry/backoff (SDK must be initialized before its first request — `AdContext` init comment at `:267-283`).
- Placement does not overlap tappable content or sit flush against buttons (accidental-click policy). Confirm via the layout and Phase 3 screenshot.
- `AdBanner.web.js` renders nothing (no crash on web).

### 1.7 Platform gating
- Every ad entry point early-returns on `Platform.OS === 'web'` (init, load, show, consent). Confirm no ad code throws on web (it can't earn there, but it must not crash the app).

---

## Phase 2 — AdMob / Play policy checklist

These are the rules whose violation gets an account suspended. Verify each and report PASS/WARN/BLOCKER:

- [ ] **Test IDs never in production** (Phase 1.1). Google's own sample IDs shipped live = policy strike.
- [ ] **Rewarded is strictly opt-in** — user must tap to watch (Result/Store), never auto-played, reward only after completion.
- [ ] **No incentivized/accidental clicks** — banner not under a finger path; no "tap here" near ads.
- [ ] **Interstitial cadence** not excessive; never interrupts gameplay or fires on launch/close.
- [ ] **Families / child-directed** tags correct for kid & teen; no personalized ads to under-age users; no PII collection for kid/teen.
- [ ] **UMP/GDPR** consent gathered for adult EEA/UK/CH users before personalized ads.
- [ ] **One SDK init**, App ID matches the AdMob account, and unit IDs belong to that account.
- [ ] **App-ads.txt / store data-safety** consistent with actual ad behaviour (note if out of scope, but flag if obviously mismatched).

---

## Phase 3 — Live native verification (MANDATORY — web cannot do this)

Ads are entirely stubbed on web, so a real device/emulator build is the **only** way to prove ads actually serve, rewards fire only after a completed view, and frequency behaves. This phase is required for a PASS.

> ⚠️ **Build authorization gate.** The repo forbids kicking off any `eas build` unless the user explicitly authorizes it in the moment (see `CLAUDE.md`). So: **stop and ask the user to confirm** before building. Offer the fastest sufficient path. Do **not** run a build silently. If the user declines or no test build is available, the verdict is **INCOMPLETE — not passed**, not PASS.

Once authorized:

1. **Get a native build that serves TEST ads — never test on real units.**
   - ⚠️ **Do NOT use the `preview` or `production` EAS profiles for ad testing.** Both are release builds (`eas.json` has no `developmentClient` on them), so `__DEV__ === false` and `ads.js:36` resolves `AD_UNIT_IDS` to **PRODUCTION** units. Generating impressions/clicks against your own live units = invalid traffic = the exact account-ban risk this skill exists to prevent.
   - ✅ **Use the `development` profile** (`npx eas-cli build --platform android --profile development`, or a local dev-client run) — `developmentClient: true` ⇒ `__DEV__ === true` ⇒ **test** unit IDs. Test ads always fill and are safe to click.
   - ✅ **Alternative:** if you must run a release build, first register the device as an AdMob **test device** (`RequestConfiguration.testDeviceIdentifiers`) so requests are treated as test traffic. Without this, do not tap the ads.
   - Install on a device/emulator.
2. **Enable AdMob Ad Inspector** (shake / debug menu, or `mobileAds().openAdInspector()` if wired) to watch live requests, fill, and mediation.
3. **Watch logcat** for the app's ad logs: `adb logcat | grep -i "AdContext\|Ads\|Rewarded\|Interstitial"`. The code logs load errors/retries with `[AdContext]` prefixes.

Verify on-device, per ad type:
- **Banner** shows on Home and is not overlapping/adjacent to buttons; recovers after a failed load.
- **Interstitial** shows on game-over and after 2 consecutive clears — and **not** during play. After it closes, gameplay resumes exactly once (no double-advance, no stuck screen).
- **Rewarded** (Result + Store): plays only on tap; the coin/life reward lands **only after the ad completes** (close it early → **no** reward). Confirm the 3/day bonus cap blocks the 4th.
- **Fill**: Ad Inspector shows requests filling (test ads always fill; a persistent "no fill" with test IDs indicates a wiring/App-ID problem).
- **Consent**: with an adult profile in an EEA locale, the UMP form appears once; kid/teen profiles get NPA and no form.
- **No crashes / no ANRs** across the ad transitions.

Report exactly what you observed on device. If a step couldn't be run (no device, build declined), say so and mark the overall verdict INCOMPLETE.

---

## Finishing

- Undo any temporary code changes made for testing; confirm the tree is clean.
- Give the severity-grouped summary. Lead with 🔴 BLOCKERs. State plainly whether Phase 3 ran.
- State the final verdict on its own line: **PASS** (zero BLOCKERs + live verification done), **FAIL** (≥1 BLOCKER), or **INCOMPLETE — not passed** (live verification not completed). When in doubt, do not PASS.
