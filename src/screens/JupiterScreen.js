import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated,
  TouchableOpacity, Image, StatusBar, PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { JUPITER_LEVELS } from '../config/jupiterLevels';
import { JUPITER_THEMES, themeForElapsed, themeForNow } from '../config/jupiterThemes';
import { playSound, loadSounds } from '../utils/soundManager';
import { getActiveSkin, SHIP_SKINS } from '../utils/itemStorage';
import { useAd } from '../context/AdContext';

const TILE_W = 88;
const TILE_H = 56;
const SHIP_W = 68;
const SHIP_H = 84;
const CATCH_R = 50; // catch radius px

const STARS = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  lp: ((i * 0.618033) % 1) * 100,
  tp: ((i * 0.381966) % 1) * 100,
  r:  i % 5 === 0 ? 2 : 1,
  o:  0.12 + (i % 6) * 0.08,
}));

const applyOp = (score, op) => {
  if (op.isMultiplier) return Math.floor(score * op.value);
  if (op.isDivisor)    return Math.max(1, Math.floor(score / op.value));
  return Math.max(0, score + op.value);
};

const tileColor = (op, theme) => {
  if (op.isMultiplier) return theme.mulColor;
  if (op.isDivisor)    return theme.divColor;
  return op.value < 0  ? theme.badColor : theme.goodColor;
};

const pickRandom = (pool) => pool[Math.floor(Math.random() * pool.length)];

// Weighted bucket pick — { good: 1, bad: 1.5 } means bad is 1.5× as likely
const pickBucket = (weights) => {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, w] of Object.entries(weights)) {
    if ((r -= w) <= 0) return k;
  }
  return Object.keys(weights)[0];
};

// ── Theme-aware tile renderer ────────────────────────────────────────────
const renderThemedTile = (t) => {
  // Comet — special: red-orange streak, fire trail, much bigger glow
  if (t.isComet) {
    return (
      <View style={{
        width: TILE_W, height: TILE_H, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {/* trailing flame above */}
        <View style={{
          position: 'absolute', bottom: TILE_H - 6, alignSelf: 'center',
          width: 30, height: 70, borderRadius: 18,
          backgroundColor: '#FBBF24', opacity: 0.45,
        }} />
        <View style={{
          position: 'absolute', bottom: TILE_H - 4, alignSelf: 'center',
          width: 16, height: 90, borderRadius: 10,
          backgroundColor: '#F97316', opacity: 0.7,
        }} />
        <View style={{
          position: 'absolute', bottom: TILE_H - 2, alignSelf: 'center',
          width: 6, height: 110, borderRadius: 4,
          backgroundColor: '#FFFFFF', opacity: 0.5,
        }} />
        {/* core */}
        <View style={{
          width: TILE_W, height: TILE_H, borderRadius: 14,
          backgroundColor: '#FF1744',
          borderWidth: 2.5, borderColor: '#FDE047',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#FF3366', shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1, shadowRadius: 20, elevation: 12,
        }}>
          <Text style={{
            color: '#fff', fontSize: 22, fontWeight: '900',
            textShadowColor: '#7C2D12', textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
          }}>{t.label}</Text>
        </View>
      </View>
    );
  }

  const c = t.color;
  const style = t.theme?.style ?? 'neon';

  if (style === 'bubble') {
    // Glass soap-bubble: transparent core, iridescent rim, big specular
    return (
      <View style={{
        width: TILE_W, height: TILE_W, borderRadius: TILE_W / 2,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: c, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
      }}>
        {/* iridescent outer ring (purple/pink/cyan) */}
        <View style={{
          position: 'absolute', width: TILE_W, height: TILE_W,
          borderRadius: TILE_W / 2,
          borderWidth: 2, borderColor: 'rgba(186, 230, 253, 0.55)',
        }} />
        <View style={{
          position: 'absolute', width: TILE_W - 4, height: TILE_W - 4,
          top: 2, left: 2, borderRadius: (TILE_W - 4) / 2,
          borderWidth: 1, borderColor: 'rgba(244, 114, 182, 0.45)',
        }} />
        {/* glass body — translucent tint of the bucket color */}
        <View style={{
          position: 'absolute', width: TILE_W - 8, height: TILE_W - 8,
          top: 4, left: 4, borderRadius: (TILE_W - 8) / 2,
          backgroundColor: c, opacity: 0.18,
        }} />
        {/* big specular highlight top-left */}
        <View style={{
          position: 'absolute', top: 8, left: 12,
          width: 22, height: 14, borderRadius: 11,
          backgroundColor: 'rgba(255,255,255,0.85)',
          transform: [{ rotate: '-30deg' }],
        }} />
        {/* tiny specular bottom-right */}
        <View style={{
          position: 'absolute', bottom: 14, right: 14,
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.7)',
        }} />
        {/* label */}
        <Text style={{
          color: '#fff', fontSize: 22, fontWeight: '800',
          textShadowColor: 'rgba(30, 27, 75, 0.85)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}>{t.label}</Text>
      </View>
    );
  }

  if (style === 'ice') {
    return (
      <View style={{
        width: TILE_W, height: TILE_H, borderRadius: 8,
        backgroundColor: 'rgba(186,230,253,0.15)',
        borderWidth: 2, borderColor: c,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: c, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7, shadowRadius: 10, elevation: 6,
        // crystal-like clipped corners via transform
        transform: [{ skewX: '-4deg' }],
      }}>
        <Text style={{ color: c, fontSize: 22, fontWeight: '800',
          letterSpacing: 0.5, textShadowColor: 'rgba(255,255,255,0.6)',
          textShadowRadius: 4, transform: [{ skewX: '4deg' }] }}>{t.label}</Text>
      </View>
    );
  }

  if (style === 'lava') {
    return (
      <View style={{
        width: TILE_W, height: TILE_H, borderRadius: 14,
        backgroundColor: c,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#F97316', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9, shadowRadius: 16, elevation: 10,
        borderWidth: 2, borderColor: '#FDE047',
      }}>
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: 14, backgroundColor: 'rgba(255,200,80,0.25)',
        }} />
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900',
          textShadowColor: '#7C2D12', textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4 }}>{t.label}</Text>
      </View>
    );
  }

  // default: neon (glass + glow)
  return (
    <>
      <View style={{
        position: 'absolute', top: 4, left: 4, right: 4, bottom: 4,
        borderRadius: 18, opacity: 0.25, backgroundColor: c,
      }} />
      <View style={{
        width: TILE_W, height: TILE_H, borderRadius: 16,
        backgroundColor: 'rgba(15, 10, 35, 0.85)',
        borderWidth: 1.5, borderColor: c,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: c, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
      }}>
        <Text style={{ color: c, fontSize: 22, fontWeight: '800',
          letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.6)',
          textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{t.label}</Text>
      </View>
    </>
  );
};

const pickFromBucket = (pool, bucket) => {
  const filtered = pool.filter(p => p.bucket === bucket);
  return filtered.length ? pickRandom(filtered) : pickRandom(pool);
};

let _tid = 0;

// Memoized ship. JupiterScreen re-renders very frequently (falling tiles,
// score, per-second clock, tile catches). Its ship uses a native-driven
// translateX; reconciling that view on every parent re-render made it
// jitter/snap horizontally each frame. Isolating it behind React.memo with
// stable props (the Animated.Value, a fixed top, the skin image) stops the
// re-renders so the native animation stays smooth.
const Ship = React.memo(({ shipAnim, top, imgSrc }) => (
  <Animated.View style={[styles.ship, { top, transform: [{ translateX: shipAnim }] }]}>
    <Image source={imgSrc} style={{ width: SHIP_W, height: SHIP_H }} resizeMode="contain" />
  </Animated.View>
));

export default function JupiterScreen({ route, navigation }) {
  const { level: initLevel = 1 } = route?.params ?? {};
  const { recordGameOver, recordLevelCleared, ensureInterstitialLoaded } = useAd();
  const idx = Math.min(Math.max(initLevel - 1, 0), JUPITER_LEVELS.length - 1);
  const cfg = JUPITER_LEVELS[idx];

  // Cleared a level → counts toward the win streak (interstitial every Nth clear).
  const goToNextLevel = () => {
    const nextLevel = initLevel + 1;
    recordLevelCleared(() => navigation.replace('Jupiter', { level: nextLevel }));
  };

  // Failed the level → game-over: try an interstitial, then retry the same level.
  const retryLevel = () => {
    recordGameOver(() => navigation.replace('Jupiter', { level: initLevel }));
  };
  const numCols = cfg.cols;            // 2 or 3

  // layout
  const [layout,   setLayout]   = useState(null);
  const layoutRef  = useRef(null);
  const rootRef    = useRef(null);
  const rootOriginX = useRef(0); // root view's X in the window — for tap→column mapping

  // game state
  const scoreRef   = useRef(cfg.startsAt ?? 0);
  const [score,    setScore]    = useState(cfg.startsAt ?? 0);
  const [timeLeft, setTimeLeft] = useState(Math.round(cfg.duration / 1000));
  const timeLeftRef = useRef(Math.round(cfg.duration / 1000));
  // Persist session start across level transitions (component remounts)
  if (!globalThis.__jupiterSessionStart) {
    globalThis.__jupiterSessionStart = Date.now();
  }
  const sessionStartRef = useRef(globalThis.__jupiterSessionStart);
  const initialTheme = themeForElapsed(Date.now() - sessionStartRef.current);
  const [theme, setTheme] = useState(initialTheme);
  const themeRef = useRef(initialTheme);
  const [tiles,    setTiles]    = useState([]);
  const [phase,    setPhase]    = useState('playing');
  const [paused,   setPaused]   = useState(false);
  const [passed,   setPassed]   = useState(false);
  const [skinImg,  setSkinImg]  = useState(null);

  // ship: which col it's on (0..numCols-1)
  const shipCol    = useRef(0);
  const shipAnim   = useRef(new Animated.Value(0)).current; // stores left-edge px

  const phaseRef   = useRef('playing');
  const spawnTimer = useRef(null);
  const cometTimer = useRef(null);
  const catchTimer = useRef(null);
  const clockTimer = useRef(null);
  const touchStartX = useRef(0);
  const started    = useRef(false);
  const lastCometRef = useRef(0);

  // ── skin ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadSounds();
    ensureInterstitialLoaded(); // make sure an interstitial is ready for game-over
    getActiveSkin().then(id => {
      setSkinImg(id && SHIP_SKINS[id]?.image ? SHIP_SKINS[id].image : require('../../assets/mainobj.png'));
    });
  }, []);

  // ── helpers ───────────────────────────────────────────────────────────────
  const colCentreX = (col, W) => {
    const colW = W / numCols;
    return colW * col + colW / 2;
  };

  const shipTargetLeft = (col, W) => colCentreX(col, W) - SHIP_W / 2;

  // ── move ship ─────────────────────────────────────────────────────────────
  const moveShip = (col) => {
    if (shipCol.current === col) return;
    shipCol.current = col;
    const W = layoutRef.current?.width ?? 375;
    Animated.spring(shipAnim, {
      toValue: shipTargetLeft(col, W),
      speed: 55, bounciness: 7, useNativeDriver: true,
    }).start();
    Haptics.selectionAsync();
  };

  // ── PanResponder: tap or swipe to move ship ───────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        touchStartX.current = e.nativeEvent.pageX;
      },
      onPanResponderRelease: (e, g) => {
        if (phaseRef.current !== 'playing') return;
        const W = layoutRef.current?.width ?? 375;
        const colW = W / numCols;
        if (Math.abs(g.dx) > 25) {
          const next = Math.max(0, Math.min(numCols - 1, shipCol.current + (g.dx > 0 ? 1 : -1)));
          moveShip(next);
        } else {
          // Use absolute pageX (minus the root's window origin), NOT locationX:
          // on release, locationX is relative to whatever child view the finger
          // is over (ship, divider, bg planet…), so a right-side tap can read a
          // tiny value and snap the ship to column 0. pageX is unambiguous.
          const tapX = e.nativeEvent.pageX - rootOriginX.current;
          const tapped = Math.floor(tapX / colW);
          moveShip(Math.max(0, Math.min(numCols - 1, tapped)));
        }
      },
    })
  ).current;

  // ── adaptive difficulty: compare actual score vs expected-by-now ─────────
  const adaptiveBucketWeights = () => {
    const base   = cfg.bucketWeights ?? { good: 1, bad: 1 };
    const target = cfg.scoreThreshold;

    // Time-elapsed ratio: 0 at start, 1 at end
    const elapsed = Math.min(1, (cfg.duration - timeLeftRef.current * 1000) / cfg.duration);
    // Where user *should* be by now to finish on target
    const expected = Math.max(1, target * elapsed);
    // Pace: actual / expected. <1 = behind, >1 = ahead
    const pace = scoreRef.current / expected;

    // Behind  (pace < 0.7)         → flood goods, kill bads
    // OnTrack (0.7 ≤ pace ≤ 1.2)   → normal
    // Ahead   (1.2 < pace ≤ 2)     → push some bads
    // Dominating (pace > 2)        → heavy bads
    let goodMul = 1, badMul = 1;
    if (pace < 0.5)       { goodMul = 2.5; badMul = 0.2; }
    else if (pace < 0.7)  { goodMul = 1.8; badMul = 0.4; }
    else if (pace <= 1.2) { goodMul = 1;   badMul = 1;   }
    else if (pace <= 2)   { goodMul = 0.8; badMul = 1.5; }
    else                  { goodMul = 0.4; badMul = 2.5; }

    return { good: base.good * goodMul, bad: base.bad * badMul };
  };

  // ── spawn one tile per col ────────────────────────────────────────────────
  const spawnRow = () => {
    if (phaseRef.current !== 'playing') return;
    const W = layoutRef.current?.width  ?? 375;
    const H = layoutRef.current?.height ?? 812;
    const colW = W / numCols;

    // Pick ONE bucket for this whole row → all cols share it
    const bucket = pickBucket(adaptiveBucketWeights());

    // Stagger window: each tile starts falling at a random offset
    // up to 60% of spawnInterval — so tiles don't form a horizontal line
    const maxJitter = Math.floor(cfg.spawnInterval * 0.6);

    const newTiles = Array.from({ length: numCols }, (_, col) => {
      const op    = pickFromBucket(cfg.pools[col], bucket);
      const id    = _tid++;
      const yAnim = new Animated.Value(-TILE_H);
      const delay = Math.floor(Math.random() * maxJitter);

      setTimeout(() => {
        if (phaseRef.current !== 'playing') return;
        Animated.timing(yAnim, {
          toValue: H + TILE_H,
          duration: cfg.fallDuration,
          // JS-driven: catchTimer reads yAnim.__getValue() every 40ms for
          // collision detection — the native driver doesn't sync that back.
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) setTiles(p => p.filter(t => t.id !== id));
        });
      }, delay);

      const tileTheme = themeRef.current;
      return {
        id, col, op, yAnim,
        x: colW * col + (colW - TILE_W) / 2,
        label: op.label,
        color: tileColor(op, tileTheme),
        theme: tileTheme,
      };
    });

    setTiles(p => [...p, ...newTiles]);
  };

  // ── COMET: aimed at ship's current column when user is dominating ────────
  const spawnComet = () => {
    if (phaseRef.current !== 'playing') return;
    const W = layoutRef.current?.width  ?? 375;
    const H = layoutRef.current?.height ?? 812;
    const colW = W / numCols;

    // pick worse op based on score size
    const op = scoreRef.current > 500
      ? { label: '÷3',  value: 3,  isDivisor: true, bucket: 'bad' }
      : { label: '−50', value: -50,                  bucket: 'bad' };

    const targetCol = shipCol.current;
    const id    = _tid++;
    const yAnim = new Animated.Value(-TILE_H);

    // very fast — about 1/3 of normal fall duration, capped at 1500ms
    const cometDuration = Math.max(900, Math.floor(cfg.fallDuration / 3));

    Animated.timing(yAnim, {
      toValue: H + TILE_H,
      duration: cometDuration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setTiles(p => p.filter(t => t.id !== id));
    });

    const cometTile = {
      id, col: targetCol, op, yAnim,
      x: colW * targetCol + (colW - TILE_W) / 2,
      label: op.label,
      color: '#FF3366',
      theme: themeRef.current,
      isComet: true,
    };
    setTiles(p => [...p, cometTile]);

    // warning haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Decide whether to spawn a comet — called every 2s
  const checkComet = () => {
    if (phaseRef.current !== 'playing') return;
    // Comets only from Level 3 onward — give beginners breathing room
    if (cfg.level < 3) return;
    const target = cfg.scoreThreshold;
    const elapsed = Math.min(1, (cfg.duration - timeLeftRef.current * 1000) / cfg.duration);
    const expected = Math.max(1, target * elapsed);
    const pace = scoreRef.current / expected;

    // dominating: pace > 2 → 70% chance per check; pace > 3 → 100%
    if (pace > 3) {
      spawnComet();
    } else if (pace > 2 && Math.random() < 0.7) {
      spawnComet();
    } else if (pace > 1.5 && Math.random() < 0.3) {
      spawnComet();
    }
  };

  // ── pause / resume ────────────────────────────────────────────────────────
  // Tile fall animations use the native driver, so to pause we capture each
  // tile's current Y, stop the animation, then on resume re-issue Animated.timing
  // from the captured Y with a duration scaled to the remaining distance.
  const pauseGame = () => {
    if (phaseRef.current !== 'playing') return;
    phaseRef.current = 'paused';
    setPaused(true);
    // Snapshot each tile's current Y and stop its animation.
    setTiles(prev => prev.map(t => {
      let y = -TILE_H;
      t.yAnim.stopAnimation((v) => { y = v; });
      // stopAnimation callback fires synchronously for native driver values too,
      // but be defensive: also read via __getValue for the immediate snapshot.
      try { y = t.yAnim.__getValue(); } catch {}
      return { ...t, pausedY: y };
    }));
  };

  const resumeGame = () => {
    if (phaseRef.current !== 'paused') return;
    phaseRef.current = 'playing';
    setPaused(false);
    const H = layoutRef.current?.height ?? 812;
    // Re-issue the fall animation from current Y with proportionally less time.
    setTiles(prev => prev.map(t => {
      const y = t.pausedY ?? -TILE_H;
      const remaining = Math.max(60, ((H + TILE_H - y) / (H + TILE_H * 2)) * cfg.fallDuration);
      Animated.timing(t.yAnim, {
        toValue: H + TILE_H,
        duration: remaining,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setTiles(p => p.filter(x => x.id !== t.id));
      });
      return t;
    }));
  };

  const exitToHome = () => {
    phaseRef.current = 'result';
    clearInterval(spawnTimer.current);
    clearInterval(cometTimer.current);
    clearInterval(catchTimer.current);
    clearInterval(clockTimer.current);
    navigation.navigate('Home');
  };

  // ── end game ──────────────────────────────────────────────────────────────
  const endGame = () => {
    if (phaseRef.current === 'result') return;
    phaseRef.current = 'result';
    clearInterval(spawnTimer.current);
    clearInterval(cometTimer.current);
    clearInterval(catchTimer.current);
    clearInterval(clockTimer.current);
    const ok = scoreRef.current >= cfg.scoreThreshold;
    setPassed(ok);
    setPhase('result');
    playSound(ok ? 'complete' : 'gameOver');
  };

  // ── start everything once layout measured ─────────────────────────────────
  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    layoutRef.current = { width, height };
    setLayout({ width, height });
    // Cache the root's window X so taps map via absolute pageX (see panResponder).
    if (rootRef.current?.measureInWindow) {
      rootRef.current.measureInWindow((x) => { rootOriginX.current = x; });
    }
    if (started.current) return;
    started.current = true;

    // init ship to centre of col 0
    shipAnim.setValue(shipTargetLeft(0, width));

    // countdown clock + theme rotation
    let remaining = cfg.duration;
    clockTimer.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      remaining -= 1000;
      const tl = Math.max(0, Math.round(remaining / 1000));
      timeLeftRef.current = tl;
      setTimeLeft(tl);

      // rotate theme every 120s of total play time (across levels)
      const sessionElapsed = Date.now() - sessionStartRef.current;
      const next = themeForElapsed(sessionElapsed);
      if (next.id !== themeRef.current.id) {
        themeRef.current = next;
        setTheme(next);
      }

      if (remaining <= 0) endGame();
    }, 1000);

    // catch loop — coords are inside playArea (which starts at top:160)
    catchTimer.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      const col  = shipCol.current;
      const H    = layoutRef.current?.height ?? 812;
      // ship is at absolute y = H - 170; playArea starts at y = 160
      const shipY = (H - 170) - 160;
      setTiles(prev => {
        let hit = false;
        const next = prev.filter(t => {
          if (t.col !== col) return true;
          const y = t.yAnim.__getValue();
          if (Math.abs((y + TILE_H / 2) - shipY) < CATCH_R) {
            hit = true;
            t.yAnim.stopAnimation();
            const ns = applyOp(scoreRef.current, t.op);
            scoreRef.current = ns;
            setScore(ns);
            playSound('tap');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return false;
          }
          return true;
        });
        return hit ? next : prev;
      });
    }, 40);

    // spawn
    spawnRow();
    spawnTimer.current = setInterval(spawnRow, cfg.spawnInterval);
    cometTimer.current = setInterval(checkComet, 2500);
  };

  useEffect(() => () => {
    clearInterval(spawnTimer.current);
    clearInterval(cometTimer.current);
    clearInterval(catchTimer.current);
    clearInterval(clockTimer.current);
  }, []);

  // ── result screen ─────────────────────────────────────────────────────────
  if (phase === 'result') {
    const isLast = idx >= JUPITER_LEVELS.length - 1;
    return (
      <LinearGradient colors={['#000008', '#04001c', '#080038']} style={styles.resultWrap}>
        <StatusBar hidden />
        <Text style={styles.resEmoji}>{passed ? '🚀' : '💫'}</Text>
        <Text style={styles.resTitle}>{passed ? 'CLEARED!' : 'TRY AGAIN'}</Text>
        <Text style={styles.resScore}>{scoreRef.current}</Text>
        <Text style={styles.resTarget}>Target: {cfg.scoreThreshold}</Text>
        <View style={{ gap: 12, width: 240, marginTop: 20 }}>
          {passed && !isLast && (
            <TouchableOpacity style={[styles.resBtn, { backgroundColor: '#7C3AED' }]}
              onPress={goToNextLevel}>
              <Text style={styles.resBtnTxt}>Next Level →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.resBtn, { backgroundColor: '#1e293b' }]}
            onPress={retryLevel}>
            <Text style={styles.resBtnTxt}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.resBtn, { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' }]}
            onPress={() => navigation.navigate('Home')}>
            <Text style={styles.resBtnTxt}>Home</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── game UI ───────────────────────────────────────────────────────────────
  const W   = layout?.width  ?? 375;
  const H   = layout?.height ?? 812;
  // Cap the background-planet sizing basis so they stay phone-proportioned
  // (and don't overlap/blow up) on wide tablet viewports.
  const BW  = Math.min(W, 500);
  const pct = Math.min(scoreRef.current / cfg.scoreThreshold, 1);
  const shipY = H - 170;
  const imgSrc = skinImg ?? require('../../assets/mainobj.png');
  const colW = W / numCols;

  return (
    <View ref={rootRef} style={styles.root} onLayout={onLayout} {...panResponder.panHandlers}>
      <StatusBar hidden />

      {/* bg */}
      <LinearGradient colors={['#000008', '#04001c', '#080038']} style={StyleSheet.absoluteFillObject} />

      {/* Background planets — top-down light, faded into the backdrop */}
      <View style={[styles.bgPlanetTopLeft, { width: BW * 0.55, height: (BW * 0.55) / 0.869, top: H * 0.10, left: -BW * 0.18, opacity: 0.4 }]}>
        <Image source={require('../../assets/star1.png')} style={styles.bgPlanetImg} resizeMode="contain" />
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,8,0.65)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[styles.bgPlanetMidRight, { width: BW * 0.46, height: (BW * 0.46) / 1.39, top: H * 0.56, right: -BW * 0.05, opacity: 0.4 }]}>
        <Image source={require('../../assets/star2.png')} style={styles.bgPlanetImg} resizeMode="contain" />
        {/* Top-down light: keep the top edge bright */}
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(8,0,28,0.55)']}
          locations={[0, 0.35, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Sink the bottom-right corner into the backdrop */}
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(8,0,28,0.7)']}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[styles.bgPlanetBottomRight, { width: BW * 0.6, height: (BW * 0.6) / 0.96, bottom: -H * 0.18, right: -BW * 0.28, opacity: 0.4 }]}>
        <Image source={require('../../assets/star5.png')} style={styles.bgPlanetImg} resizeMode="contain" />
        {/* Top-down light: visible top-left corner stays brightest, fades fast toward the cut-off edges */}
        <LinearGradient
          colors={['transparent', 'rgba(8,0,28,0.45)', 'rgba(8,0,28,0.85)']}
          locations={[0, 0.2, 0.6]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Soften the right edge into the backdrop too */}
        <LinearGradient
          colors={['transparent', 'rgba(8,0,28,0.5)']}
          locations={[0.35, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {STARS.map(s => (
        <View key={s.id} style={{
          position: 'absolute',
          left: `${s.lp}%`, top: `${s.tp}%`,
          width: s.r * 2, height: s.r * 2,
          backgroundColor: '#fff', borderRadius: s.r, opacity: s.o,
        }} />
      ))}

      {/* col dividers */}
      {Array.from({ length: numCols - 1 }, (_, i) => (
        <View key={i} style={[styles.divider, { left: colW * (i + 1) }]} />
      ))}

      {/* tile play area — clipped, sits BELOW HUD */}
      <View style={styles.playArea} pointerEvents="none">
        {tiles.map(t => (
          <Animated.View key={t.id} style={[
            styles.tileWrap,
            { left: t.x, transform: [{ translateY: t.yAnim }] },
          ]}>
            {renderThemedTile(t)}
          </Animated.View>
        ))}
      </View>

      {/* Header — ✕ + HUD card + pause, in one row so the side buttons stay
          vertically centred with the board. box-none lets falling-tile touches
          pass through everything except the two buttons. */}
      <View style={[styles.headerWrap, W >= 768 && { paddingHorizontal: (W - Math.min(W * 0.85, 600)) / 2 }]} pointerEvents="box-none">
        {/* back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backTxt}>✕</Text>
        </TouchableOpacity>

        {/* HUD card — 3-row board, lets touches pass through */}
        <View style={styles.hudCard} pointerEvents="none">
          <View style={styles.hudRow}>
            <Text style={styles.hudLvl}>{cfg.title} · {theme.name}</Text>
            <View style={styles.hudTimeWrap}>
              <Text style={styles.hudTime}>{timeLeft}</Text>
              <Text style={styles.hudTimeUnit}>s</Text>
            </View>
          </View>
          <View style={styles.hudScoreRow}>
            <View style={styles.hudCol}>
              <Text style={styles.hudLabel}>SCORE</Text>
              <Text style={styles.hudScore}>{score}</Text>
            </View>
            <View style={styles.hudDivider} />
            <View style={styles.hudCol}>
              <Text style={styles.hudLabel}>TARGET</Text>
              <Text style={styles.hudTarget}>{cfg.scoreThreshold}</Text>
            </View>
          </View>
          <View style={styles.progBar}>
            <View style={[styles.progFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>

        {/* pause */}
        <TouchableOpacity style={styles.pauseBtn} onPress={pauseGame}>
          <View style={styles.pauseBars}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ship — memoized so frequent re-renders don't jitter the native transform */}
      <Ship shipAnim={shipAnim} top={shipY - SHIP_H / 2} imgSrc={imgSrc} />

      {/* pause overlay */}
      {paused && (
        <View style={styles.pauseOverlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>PAUSED</Text>
            <Text style={styles.pauseSub}>Level {cfg.level} · {theme.name}</Text>
            <View style={{ height: 18 }} />
            <TouchableOpacity style={[styles.pauseAction, { backgroundColor: '#7C3AED' }]} onPress={resumeGame}>
              <Text style={styles.pauseActionTxt}>▶  Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pauseAction, { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }]}
              onPress={exitToHome}
            >
              <Text style={styles.pauseActionTxt}>Quit to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#000' },
  bgPlanetTopLeft: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 9999,
  },
  bgPlanetMidRight: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 9999,
  },
  bgPlanetBottomRight: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 9999,
  },
  bgPlanetImg: {
    width: '100%',
    height: '100%',
  },
  divider:    { position: 'absolute', top: 160, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  playArea: {
    position: 'absolute',
    top: 160, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  headerWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 14,
    gap: 12,
    zIndex: 100,
    elevation: 20,
  },
  hudCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 35, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hudLvl: {
    color: 'rgba(200,180,255,0.85)',
    fontSize: 12, fontWeight: '700', letterSpacing: 2,
  },
  hudTimeWrap: { flexDirection: 'row', alignItems: 'baseline' },
  hudTime: {
    color: '#fff', fontSize: 18, fontWeight: 'bold',
  },
  hudTimeUnit: {
    color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 1,
  },
  hudScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hudCol: { flex: 1, alignItems: 'center' },
  hudDivider: {
    width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  hudLabel: {
    color: 'rgba(200,180,255,0.5)',
    fontSize: 9, letterSpacing: 2, fontWeight: '600',
    marginBottom: 2,
  },
  hudScore: {
    color: '#FFD700', fontSize: 22, fontWeight: 'bold',
  },
  hudTarget: {
    color: '#A78BFA', fontSize: 22, fontWeight: 'bold',
  },
  progBar: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2,
    overflow: 'hidden',
  },
  progFill: { height: 4, backgroundColor: '#7C3AED', borderRadius: 2 },
  tileWrap: {
    position: 'absolute', top: 0,
    width: TILE_W, height: TILE_H,
    alignItems: 'center', justifyContent: 'center',
  },
  tileGlow: {
    position: 'absolute',
    top: 4, left: 4, right: 4, bottom: 4,
    borderRadius: 18,
    opacity: 0.25,
  },
  tileInner: {
    width: TILE_W, height: TILE_H,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 10, 35, 0.85)',
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  tileTxt: {
    fontSize: 22, fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ship:      { position: 'absolute', left: 0 },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 110,
  },
  backTxt:   { color: '#fff', fontSize: 17 },

  pauseBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 110,
  },
  pauseBars: { flexDirection: 'row', gap: 4 },
  pauseBar:  { width: 4, height: 15, borderRadius: 2, backgroundColor: '#fff' },

  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  },
  pauseCard: {
    backgroundColor: 'rgba(15, 10, 35, 0.96)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.45)',
    paddingHorizontal: 28, paddingVertical: 26,
    width: 260, alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 14,
  },
  pauseTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 4 },
  pauseSub:   { color: 'rgba(184,184,212,0.6)', fontSize: 12, letterSpacing: 1, marginTop: 6 },
  pauseAction: {
    width: '100%', borderRadius: 14, paddingVertical: 13, alignItems: 'center',
    marginTop: 10,
  },
  pauseActionTxt: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  resultWrap:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  resEmoji:  { fontSize: 64, marginBottom: 8 },
  resTitle:  { color: '#fff', fontSize: 34, fontWeight: 'bold', letterSpacing: 4 },
  resScore:  { color: '#FFD700', fontSize: 48, fontWeight: 'bold', marginTop: 8 },
  resTarget: { color: 'rgba(200,180,255,0.5)', fontSize: 15 },
  resBtn:    { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  resBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
