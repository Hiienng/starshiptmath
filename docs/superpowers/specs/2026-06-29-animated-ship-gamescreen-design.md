# Animated Ship — GameScreen

**Date:** 2026-06-29
**Scope:** GameScreen (Quick Reaction Math) only. Jupiter intentionally excluded (its per-frame
`PanResponder` spring loop makes added effects risky to perf — deferred).

## Goal

Turn the decorative starship in `GameScreen` into a living 2D character that reacts to play,
using **programmatic animation only** — no new art frames, no AI-generated assets. The existing
ship skin PNG is kept as-is; everything animates around and on top of it.

## Current state

- The in-game ship is purely decorative: `MainStarship` inside
  `src/components/SpaceBackground.js`, rendered top-right at `SHIP_SIZE = 88`, `opacity: 0.65`,
  `pointerEvents="none"`, with a gentle sine bob on `translateY`.
- `SpaceBackground` receives `shipSource` (active skin PNG) from `GameScreen` and renders it.
- `GameScreen` already drives a `shakeAnim` and calls `shakeAnimation()` on wrong answers
  (around lines 398 / 443).
- The player does **not** control this ship (the quick-reaction mode is tap-the-answer).
- A full warp/boost sequence already exists in `RoundTransition.js` (ship accelerates bottom→top,
  rainbow exhaust, warp stars). **Boost is out of scope — already covered there.**

## Design

Create a reusable component `src/components/AnimatedShip.js` that replaces `MainStarship`.
Pure React Native `Animated` + `View` (layered Views/gradient for the flame). **No new deps.**

It takes the active skin `source` plus a `state` prop:

| `state`     | Trigger                  | Effect                                                                 |
|-------------|--------------------------|-----------------------------------------------------------------------|
| `cruise`    | default while playing    | gentle bob + flickering tail flame + auto-sway tilt (±4°)             |
| `celebrate` | correct answer           | glowing halo + small bounce, then auto-return to `cruise`            |
| `hit`       | wrong answer             | shake/jolt (reuse existing `shakeAnim` semantics), then back to `cruise` |
| `idle`      | screen loading / waiting | hover in place, tiny flame, minimal motion                           |

### Wiring

- `SpaceBackground` gains a `shipState` prop and forwards it to `AnimatedShip`.
- `GameScreen` holds a `shipState` value and sets it from existing flow:
  - loading → `idle`
  - correct-answer handler → `celebrate` (then back to `cruise`)
  - wrong-answer handler (where `shakeAnimation()` is already called) → `hit` (then back to `cruise`)
  - otherwise `cruise`.
- Active skin PNG continues to flow through `shipSource` unchanged.

### Out of scope

- Boost / light-speed (#4) — already in `RoundTransition.js`. Optional future polish only.
- Jupiter, Mars, Decimal screens.
- Any new art / AI-generated frames.

## Testing / verification

No test runner is configured. Verify by running the web build (`npx expo start --web`) and
observing: continuous tail flame + sway in `cruise`, halo on a correct answer, shake on a wrong
answer, calm `idle` during load. Confirm the ship PNG and existing background (stars, floating
objects, RoundTransition warp) are unchanged.
