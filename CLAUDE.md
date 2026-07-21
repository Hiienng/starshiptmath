# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

> ⚠️ **Do NOT build an AAB/APK (any `eas-cli build`) unless the user directly and explicitly asks for it in that message.** Never kick off a build on your own initiative — not to "verify", not after a fix, not because a release seems ready. Make and commit the code changes, then stop and let the user request the build. The same applies to `eas-cli submit` (publishing to Play Console).

- `npm install` — install dependencies
- `npx expo start` — start dev server (scan QR with Expo Go)
- `npx expo start --web` — run the web build (uses `.web.js` platform overrides)
- `npx expo-doctor` — validate Expo config / dependency versions before a release build
- `npx eas-cli build --platform android --profile production --non-interactive` — production AAB build (app-bundle, EAS remote credentials)
- `npx eas-cli build --platform android --profile preview` — internal APK for quick device testing
- `npx eas-cli build:view <id>` — check status/logs of a build (builds run remotely and can sit `in queue` for a while)
- `npx eas-cli submit --platform android --profile production` — submit the AAB to Play Console (production track, uses `play-store-credentials.json`)

There is no lint/test script configured (`package.json` only has `start`/`android`/`ios`/`web`).

Archived production `.aab` build artifacts are attached as GitHub Releases (e.g. [`android-versionCode-8`](https://github.com/Hiienng/starshiptmath/releases/tag/android-versionCode-8)), not committed into the repo — see `docs/WORKSPACE_HANDOFF.md` for the history of why.

### Versioning before a release build

Two places must be bumped together (EAS `appVersionSource: local`, and `android/` is a native folder so `app.json`'s android block is otherwise ignored by EAS Build):

- `app.json` → `expo.version`, `expo.runtimeVersion`, `expo.android.versionCode`
- `android/app/build.gradle` → `defaultConfig.versionCode`, `defaultConfig.versionName`

Check the current "Active" version code on Play Console (App bundles page) and bump past it.

## Architecture

### Entry point & global setup (`App.js`)
- Loads two font families (Nunito body / Fredoka display) via `@expo-google-fonts/*`, then monkey-patches `Text.render` so every `<Text>` gets the right Nunito weight by default — components opt into Fredoka by setting `fontFamily` explicitly. See `src/constants/fonts.js`.
- Reads the stored age group (`src/utils/ageGroupStorage.js`) before rendering anything; if unset, the stack's initial route is `AgeGate`, otherwise `Home`.
- Wraps the app in `LanguageProvider` → `AdProvider` → `MobileFrame` (a phone-frame wrapper, web-only) → `NavigationContainer`.
- `BottomNav` (Home/Store/Settings tabs + `AdBanner`) is rendered as a fixed overlay outside the navigation stack so it never animates with screen transitions.

### Game modes ("planets")
Difficulty levels are themed as planets (see `LANGUAGES`/`TRANSLATIONS` in `LanguageContext.js`: `easy → Venus`, `medium → Jupiter`, etc.):
- **Venus / Decimal** — `DecimalMapScreen.js` + `src/utils/decimalGenerator.js` + `src/utils/progressStorage.js` (stage unlock progression, mid-stage resume snapshot).
- **Jupiter** — `JupiterScreen.js` + `src/config/jupiterLevels.js` (10 levels, falling-tile "good"/"bad" bucket pools) + `src/config/jupiterThemes.js`.
- **Mars** — `MarsScreen.js` + `src/config/marsLevels.js` (connect-the-dots puzzles, 8-directional, non-crossing path) + `src/utils/marsSolver.js` / `marsBankGenerator.js`.
- **Quick reaction mode** — `GameScreen.js` (largest screen, ~1.4k lines) → `ResultScreen.js`, driven by `src/utils/mathGenerator.js`. Currently unreachable from Home — see `docs/WORKSPACE_HANDOFF.md` backlog.

### Ads (AdMob via `react-native-google-mobile-ads`)
- `src/context/AdContext.js` (native) vs `AdContext.web.js` (no-op stub for web) — preloads rewarded + interstitial ads, handles retry/backoff on load errors, and refines AdMob `RequestConfiguration` once the user's age group is known.
- `src/components/AdBanner.js` (native, with retry/backoff) vs `AdBanner.web.js` (renders nothing).
- `src/stubs/react-native-google-mobile-ads.js` — stub used so the web bundle doesn't pull in the native ad SDK.
- `src/config/ads.js` — test vs production AdMob unit IDs (`__DEV__` switches automatically); **do not ship test IDs in production**.
- Reward/coin economy lives in `src/utils/itemStorage.js` (coins, store items, ship skins) and `src/utils/streakStorage.js` (daily streak + rewarded-ad daily bonus, capped at 3/day).

### Storage
All persistence is `AsyncStorage` via small per-domain wrapper modules in `src/utils/`: `storage.js` (high scores/settings), `itemStorage.js` (coins/items/skins), `progressStorage.js` (Venus stage unlocks), `streakStorage.js` (daily streak), `ageGroupStorage.js` (age-gate result).

### i18n
`src/context/LanguageContext.js` auto-detects device locale (`expo-localization`) and maps it to one of `en, es, pt-BR, fil, hi, id`. English is the source of truth for translation keys; other locales fall back to English for missing keys.

### Web vs native
Platform-specific files use the `.web.js` suffix convention (Metro picks the right one automatically): `AdBanner.web.js`, `AdContext.web.js`, plus the `MobileFrame` wrapper in `App.js` that renders a phone-shaped frame only on web.

## Design rules

### Typography
Constraint: do not use more than 2 font families. For children learning math, fonts must not be too rigid or have excessive tracking (letter spacing), as this hinders word recognition speed.

1. **Main title (STARSHIP MATH / SELECT CHALLENGE)** — Fredoka / Fredoka One, all caps, pink-blue gradient. Chunky rounded-corner block style, visually stimulating for kids.
2. **Subtitle (QUICK REACTION MATH)** — Nunito Bold, default letter spacing (do not expand). Small text needs clean, legible lines.
3. **Level name (Venus, Jupiter, Mars)** — Fredoka SemiBold, sentence case, sized 2-4pt larger than surrounding UI to highlight it next to the planet icon.
4. **Challenge description (Addition, Subtract, Multiply & Divide)** — Nunito Regular, translucent white/light grey, 13-14pt. Regular weight maximizes internal letter shapes (o, a, e, p) for quick scanning.

`src/constants/fonts.js` and the `Text.render` patch in `App.js` implement this system — use `FONTS.display*` / `FONTS.body*` constants instead of hardcoding family strings.

## Target audience & compliance

1. **Google Play Console**: target audience is set to 13-17 and 18+.
2. **AdMob**: app-level setting is "Not child-directed" (it's not exclusively for children). If a user is identified as a child via the Age Gate, AdMob must be configured to show only non-personalized, contextual ads with sensitive categories blocked.
3. **Age Gate** (`AgeGateScreen.js`, shown once on first launch; result stored via `ageGroupStorage.js` as `kid` / `teen` / `adult`):
   - **`kid` (<13)**: no PII collection, contextual ads only (block alcohol/tobacco/gambling/adult/weight-loss categories), `tagForChildDirectedTreatment = true`, no ATT prompt on iOS.
   - **`teen` (13-17)**: no PII collection, force non-personalized + contextual ads only (same blocked categories), `tagForUnderAgeOfConsent = true` in AdMob/Firebase.
   - **`adult` (18+)**: standard operation (full UMP/GDPR consent flow, personalized ads when allowed).
4. **Third-party SDKs**: audit all SDKs (Analytics, Firebase, Facebook, etc.) to ensure they restrict data collection for underage users, consistent with the age-gate result.

This logic is implemented in `src/context/AdContext.js` — refer to it (and its inline comments) as the canonical implementation when changing ad/consent behavior.
