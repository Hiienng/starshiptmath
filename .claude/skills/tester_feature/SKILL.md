---
name: tester_feature
description: Full end-to-end functional test of the Starship Math app. Use this whenever the user wants to verify the whole app still works — "test the app", "check every feature", "regression test", "did I break anything", "test full flow", before a release, or after a refactor that touches multiple screens. Walks every screen and game mode (Age Gate, Home, Venus/Decimal, Jupiter, Mars, Quick-Reaction, Result, Store, Settings), the coin/streak economy, i18n, and persistence — combining a code trace with a live web-preview walkthrough — then reports PASS/FAIL/WARN per feature in chat. Does NOT cover ad-serving correctness; that belongs to the tester_ads skill.
---

# tester_feature — full functional test of Starship Math

You are verifying that **every user-facing feature still works**. Two evidence sources, used together:

1. **Code trace** — read the screen/util and confirm the logic is intact and wired.
2. **Live web preview** — actually drive the app in the browser (`npx expo start --web`) and observe the behaviour.

Web can exercise all gameplay/UI/persistence. It **cannot** exercise ads (they no-op on web) — that's `tester_ads`' job, not yours. Note where a feature depends on native-only behaviour and mark it accordingly.

All app code lives at the repo root — every path below is relative to it.

## Output (chat only — do NOT write a report file)

End with a compact summary table, one row per feature area:

```
FEATURE                 RESULT   NOTE
Age Gate                PASS     stores kid/teen/adult, routes to Home
Quick-Reaction (Game)   WARN     screen works but no entry from Home (expert/universe filtered)
...
```

- **PASS** — verified working (say *how* you verified: preview / code / both).
- **FAIL** — broken. Give `file.js:line` and the concrete symptom. FAIL is a blocker.
- **WARN** — works but risky/surprising (dead entry point, silent fallback, edge case).

Never mark PASS on assumption. If you couldn't verify something (e.g. native-only), mark it **UNVERIFIED** and say why. Under-claiming is fine; a false PASS is not.

## Setup

1. Start the web preview (prefer the preview tooling; else `npx expo start --web`). First bundle takes ~30–60s.
2. The app opens on **Age Gate** on a fresh profile, else **Home**. To reset to first-launch, clear the browser's storage for localhost, or long-press the version text on Home in `__DEV__` (`AsyncStorage.clear()`, see `HomeScreen.js`).
3. Check `preview_console_logs` (level=error) after each major step — React errors surface there.

## Test checklist

Create a todo per area so none is skipped. For each: state what you verified and by which method.

### 1. Age Gate (`src/screens/AgeGateScreen.js`, `src/utils/ageGroupStorage.js`)
- Shows on first launch only; the three choices store `kid`/`teen`/`adult` and route to Home.
- On next launch it does **not** reappear (result persisted). Verify the stored value via `ageGroupStorage`.
- This value drives ad-compliance downstream — confirm it is actually written (code trace of `onResolved`).

### 2. Home (`src/screens/HomeScreen.js`)
- Planet cards render (Venus/Jupiter/Mars) and navigate to the right screen (`DecimalMap` / `Jupiter` / `Mars`).
- Coin balance shows and matches `itemStorage.getCoins()`; the `+` opens Store.
- **Known WARN to confirm:** `expert` and `universe` are filtered out (`HomeScreen.js` ~line 439), so the **Quick-Reaction `GameScreen` has no entry point** from Home. Flag it — the mode exists but users can't reach it.
- Bottom nav (Home/Store/Settings) switches screens.

### 3. Venus / Decimal (`src/screens/DecimalMapScreen.js`, `src/utils/decimalGenerator.js`, `src/utils/progressStorage.js`)
- Stage map renders; only unlocked stages are playable; clearing a stage unlocks the next (`progressStorage`).
- Mid-stage resume snapshot restores progress after leaving and returning.
- Questions from `decimalGenerator` are well-formed (no NaN/undefined, answer is correct).

### 4. Jupiter (`src/screens/JupiterScreen.js`, `src/config/jupiterLevels.js`, `src/config/jupiterThemes.js`)
- Falling "good/bad" tiles spawn from the correct weighted pools; ship moves left/right via tap/swipe (`PanResponder`).
- Catching good vs bad updates score/lives correctly; level-clear advances to the next level; game-over restarts at the initial level.
- All 10 levels load their config without error.

### 5. Mars (`src/screens/MarsScreen.js`, `src/utils/marsSolver.js`, `src/utils/marsBankGenerator.js`)
- Connect-the-dots puzzle renders; drawing via drag builds a non-crossing 8-directional path.
- A correct `1→N` path is accepted and clears the level; an invalid/crossing path is rejected.
- The solver/bank produces solvable puzzles (spot-check a couple of levels).

### 6. Quick-Reaction (`src/screens/GameScreen.js`)
- (No Home entry — reach it for testing by temporarily setting the `Game` route as initial in `App.js`, or navigate programmatically. **Revert any such temporary change afterward.**)
- Timer counts down; correct answer scores + advances; wrong/timeout shakes + costs a life; lives reaching 0 → game-over → Result.
- Score popup, round transition, and skin picker work. Question generation (`mathGenerator`) is well-formed.

### 7. Result (`src/screens/ResultScreen.js`)
- Correct final score, best-score record, per-question breakdown.
- "Keep playing" (recover lives with coins) and the rewarded-ad bonus button render. (Ad *serving* is `tester_ads`; here just confirm the UI/flow doesn't crash and the coin path is right.)

### 8. Store (`src/screens/StoreScreen.js`, `src/utils/itemStorage.js`)
- Coin balance correct; buying a skin/item deducts the right amount and persists ownership; owned items can be equipped (active skin applied in game).
- Can't buy without enough coins. Ship-skin switch reflects in `getActiveSkin`.
- "Earn coins" / daily-bonus buttons render (ad serving → `tester_ads`).

### 9. Settings (`src/screens/SettingsScreen.js`)
- Toggles (sound, language, etc.) persist via `storage.js` and take effect.

### 10. Streak & daily economy (`src/utils/streakStorage.js`)
- Daily streak increments once per day; `isStreakAtRisk` logic correct.
- Daily challenge awards +3 coins once/day (`completeDailyChallenge`).
- Daily rewarded-bonus counter caps at **3/day** (`recordDailyBonus`) — confirm the 4th is refused. (This cap is also revenue/abuse-relevant; `tester_ads` re-checks it.)

### 11. i18n (`src/context/LanguageContext.js`)
- Device locale maps to one of `en, es, pt-BR, fil, hi, id`; unknown locale falls back to English.
- Switching language updates visible strings; missing keys fall back to English (no blank labels).

### 12. Persistence (`src/utils/*Storage.js`)
- Coins, skins, Venus progress, streak, age group, settings all survive a reload.
- No unhandled promise rejections from AsyncStorage (check console).

### 13. Fonts & platform files
- Nunito/Fredoka load; the `Text.render` patch in `App.js` applies default weights; titles use Fredoka (`src/constants/fonts.js`).
- `.web.js` overrides resolve on web (`AdBanner.web.js`, `AdContext.web.js`, `MobileFrame`) without crashing.

## Finishing

- Undo any temporary edits made purely to reach a screen (e.g. changed initial route). Confirm the tree is clean.
- Give the summary table. Lead with any **FAIL** (blockers), then **WARN**, then the PASS list.
- If you started a preview server for the test, leave it running unless the user asked otherwise, and tell them it's up.
