# Workspace Handoff — Starship Math

Written 2026-07-21. Purpose: let a new Claude Code session (new device, new
local folder) reconstruct context fast, without depending on this machine's
local memory store — Claude's auto-memory lives at
`~/.claude/projects/<hash-of-local-path>/memory/` and is keyed to this exact
local path, so it does **not** travel with the repo or transfer to a new
machine automatically. This doc is the portable substitute: point a new
Claude session at it ("read docs/WORKSPACE_HANDOFF.md") to get the same
context in under a minute. If you also want the raw memory files, copy
`~/.claude/projects/-Users-hienem-Downloads-starshipmath/memory/` to the new
device once the new working-directory hash exists.

## Status: `otherasset/` and `versionaab/` are already gone (2026-07-21)

The parent `Downloads/starshipmath/` folder used to also hold `otherasset/`
(~38MB marketing assets) and `versionaab/` (~123MB archived `.aab` builds) —
neither was ever tracked by git. Both were deleted on 2026-07-21 as part of
workspace cleanup. Before deletion, the two pieces judged worth keeping were
rescued into this repo:

- The `versionCode 8` (v1.1.0) production AAB → **GitHub Release**, not the
  git tree (avoids bloating repo history with a 60MB binary): see
  [`android-versionCode-8`](https://github.com/Hiienng/starshiptmath/releases/tag/android-versionCode-8),
  tagged at commit `2b3c363` (the commit it was actually built from — the
  bump from versionCode 7→8 was never its own git commit).
- The mascot source art (`mascos_motion2.png`, `mascos_motion_1.png`) →
  `docs/source-art/` in this repo.

Everything else that was in those two folders (ver7/ver10/ver17 AABs,
`GROWTH_STRATEGY.md`, `PLAY_LISTING.md`, `ProductPlan for V8.docx`, screen
recordings, `unused_assets/`) is gone and was **not** backed up elsewhere —
if you need any of it, it doesn't exist anymore short of the user's own
memory/other copies.

`../CLAUDE.md` (workspace-root project instructions) is **still present**
and still not git-tracked — same risk as before. Recommended: move it into
this repo (e.g. `starshiptmath/CLAUDE.md`) and trim its "Repository layout"
section, which still describes the now-deleted sibling folders. Now that
`otherasset/`/`versionaab/` are gone, the original reason it lived a level
up (to document multiple sibling folders) mostly no longer applies.

## Repo state (as of 2026-07-21)

- Correct remote: `https://github.com/Hiienng/starshiptmath.git`
  (note the folder-matching spelling `starshiptmath`, not `starshipmath`)
- Branch `main`, pushed through commit `11275ea`
- On a new device: `git clone https://github.com/Hiienng/starshiptmath.git`
- Regenerable local caches not worth backing up: `node_modules/` (~410M,
  `npm install`), `ios/Pods/` (~383M, `pod install`), `.expo/` (~5.4M),
  `dist/` (~2.4M, build output) — all gitignored, all safe to delete anytime.

## Backlog / known issues

1. **Quick-reaction `GameScreen` is unreachable from Home.**
   `src/screens/HomeScreen.js` (~line 439) filters `expert`/`universe` out of
   the rendered difficulty cards, and those were the only nav entries into
   `GameScreen.js` (~1.4k lines, fully functional `Game` route, includes the
   live `AnimatedShip` reactions). Either re-add an entry point or formally
   retire the mode — right now it's dead code from a user's perspective even
   though it works.
2. Git `origin` was pointed at a nonexistent repo
   (`findatasolution/starshipmath`) for an unknown period — 28 commits
   (through the v1.3.3 release) existed only on the original local machine
   until this was caught and fixed on 2026-07-21. Sanity-check `git remote
   -v` occasionally, especially after cloning onto a new device.

## Done (2026-07-21 cleanup)

- Removed the abandoned mascot animation prototype: `mascot_preview.html`
  (workspace root), `src/components/AnimatedMascot.js`, `assets/mascot/*`.
  Never wired into any screen — superseded by `AnimatedShip.js`, which is
  live in `SpaceBackground.js` and reacts to answers in `GameScreen.js`.
- Removed two unrelated dead components with zero importers anywhere in the
  app: `src/components/GameOverTransition.js`, `src/components/MenuButton.js`.
- Swept every file under `src/` and every asset/sound file for actual
  references — nothing else came up dead.
- Deleted `otherasset/` and `versionaab/` from the local workspace; rescued
  the ver8 AAB (as a GitHub Release) and mascot source art (into
  `docs/source-art/`) first — see the status section above.

## Architecture quick-reference

Full detail lives in `CLAUDE.md` at the workspace root (copy it back in if
it's gone by the time you read this). Highlights:

- Game modes are themed as planets: Venus/Decimal, Jupiter, Mars, and the
  quick-reaction mode (see backlog item 1 above for its reachability issue).
- Ads: AdMob via `react-native-google-mobile-ads`, age-gated consent logic
  in `src/context/AdContext.js` — this is compliance-load-bearing (Play
  Console child-directed / consent rules), treat changes there carefully.
- Storage: per-domain `AsyncStorage` wrappers in `src/utils/`.
- i18n: `src/context/LanguageContext.js`, English is the source of truth.
- Web vs native: `.web.js` suffix convention, Metro resolves automatically.
- **Never run an EAS build/submit unless explicitly asked in that message** —
  this is a hard rule in `CLAUDE.md`, repeated here since it won't survive
  if `CLAUDE.md` is lost.
