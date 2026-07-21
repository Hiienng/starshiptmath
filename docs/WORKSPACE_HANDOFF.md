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

## Read this before deleting the local `Downloads/starshipmath` folder

Only this folder (`starshiptmath/`) is a git repo. Its parent
`Downloads/starshipmath/` also contains three things that are **not tracked
anywhere** and will be **permanently lost** if you delete the parent folder
without backing them up first:

- `../CLAUDE.md` — the project instructions Claude Code reads for this repo
  (layout, build commands, versioning steps, architecture map, design rules,
  Play Store / AdMob age-gate compliance rules). Copy it into this repo (or
  into the new workspace root) before deleting.
- `../otherasset/` (~38MB) — marketing/store-listing images, screen
  recordings, `GROWTH_STRATEGY.md`, `PLAY_LISTING.md`, `ProductPlan for
  V8.docx`, plus an `unused_assets/` subfolder of already-retired icons.
- `../versionaab/` (~123MB) — archived `.aab` build artifacts (ver7, ver8,
  ver10, ver17), reference-only, not reproducible without rebuilding from
  historical commits/tags (no tags currently exist for these).

**Recommendation:** zip `otherasset/`, `versionaab/`, and `CLAUDE.md`
somewhere durable (cloud drive, external disk) before deleting the parent
folder, or at minimum copy `CLAUDE.md` into this repo and commit it.

## Repo state (as of 2026-07-21)

- Correct remote: `https://github.com/Hiienng/starshiptmath.git`
  (note the folder-matching spelling `starshiptmath`, not `starshipmath`)
- Branch `main`, pushed through commit `15ea66d`
- On a new device: `git clone https://github.com/Hiienng/starshiptmath.git`

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
