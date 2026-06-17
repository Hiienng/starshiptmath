import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  PanResponder, useWindowDimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MARS_LEVELS, themeForLevel, getMarsBank, PUZZLES_TO_ADVANCE } from '../config/marsLevels';
import { solveMars } from '../utils/marsSolver';
import { playSound, loadSounds } from '../utils/soundManager';
import { FONTS } from '../constants/fonts';
import { useAd } from '../context/AdContext';

const sameCell = (a, b) => a && b && a.r === b.r && a.c === b.c;
const cellKey  = (cell) => `${cell.r}-${cell.c}`;

// 8-direction adjacency check (king move)
const isAdjacent = (a, b) => {
  if (!a || !b) return false;
  if (sameCell(a, b)) return false;
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1;
};

// True if the diagonal step from `prev` → `next` would cross an existing
// diagonal segment in `path`. Two diagonals cross when they form an X over
// the same 2×2 block of cells.
const wouldCrossDiagonal = (path, prev, next) => {
  const dr = next.r - prev.r, dc = next.c - prev.c;
  if (dr === 0 || dc === 0) return false; // not a diagonal move
  // The other two corners of this 2×2 block
  const a = { r: prev.r, c: next.c };
  const b = { r: next.r, c: prev.c };
  // Find consecutive segment a→b OR b→a anywhere in existing path
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i], q = path[i + 1];
    if ((sameCell(p, a) && sameCell(q, b)) || (sameCell(p, b) && sameCell(q, a))) {
      return true;
    }
  }
  return false;
};

// Dot at this cell? returns its 1-based number, or 0
const dotNumberAt = (cell, dots) => {
  for (let i = 0; i < dots.length; i++) {
    if (sameCell(cell, dots[i])) return i + 1;
  }
  return 0;
};

const MarsScreen = ({ route, navigation }) => {
  const { level: initLevel = 1 } = route?.params ?? {};
  const { recordLevelCleared, ensureInterstitialLoaded } = useAd();
  const idx = Math.min(Math.max(initLevel - 1, 0), MARS_LEVELS.length - 1);
  const cfg = MARS_LEVELS[idx];
  const theme = themeForLevel(cfg.level);

  // ── Question bank ────────────────────────────────────────────────────────
  // 10 puzzles per level, sorted easiest→hardest. User clears 5 to advance.
  // Pick is random without replacement until all 10 are exhausted.
  const bank = useMemo(() => getMarsBank(cfg.level), [cfg.level]);
  const [usedIndices, setUsedIndices] = useState(() => new Set());
  const [puzzleIdx, setPuzzleIdx] = useState(() => {
    // First puzzle: pick from the 5 easiest so opening feel isn't punishing.
    const easyPool = Math.min(5, bank.length);
    return Math.floor(Math.random() * easyPool);
  });
  const [solvedCount, setSolvedCount] = useState(0);
  const puzzle = bank[puzzleIdx] ?? { dots: dots };
  const dots = puzzle.dots;
  const dotCount = dots.length;

  // Cleared a level → counts toward the win streak (interstitial every Nth clear).
  const goToNextLevel = () => {
    const nextLevel = cfg.level + 1;
    recordLevelCleared(() => navigation.replace('Mars', { level: nextLevel }));
  };
  const { width: SW, height: SH } = useWindowDimensions();
  const isTablet = SW >= 768;
  // Continuous scale factor for tablets — grows with screen width so UI
  // elements don't stay phone-sized on large iPads.
  const ts = isTablet ? Math.min(SW / 480, 2.2) : 1;

  // Compute board geometry. Board takes most of width, padded.
  const BOARD_PADDING = 16;
  const boardSize = Math.min(SW - 24, SH * 0.55, isTablet ? 640 : 380);
  const cellSize  = Math.floor((boardSize - BOARD_PADDING * 2) / cfg.grid.cols);
  const innerSize = cellSize * cfg.grid.cols;
  const actualBoard = innerSize + BOARD_PADDING * 2;

  // Path: array of cells visited in order. First cell must be dot 1.
  const [path, setPath] = useState([]);
  const pathRef = useRef([]);
  const [phase, setPhase] = useState('playing'); // 'playing' | 'win'
  const [hintCells, setHintCells] = useState([]); // ghost cells showing next segment
  const boardRef = useRef(null);
  const boardOriginRef = useRef({ x: 0, y: 0 });

  // Cache full solution. Solving runs synchronously but only on demand,
  // and is fast for the levels we ship (verified offline). Cached after
  // first call so repeated Hint presses are instant.
  const solutionRef = useRef(null);
  const [solving, setSolving] = useState(false);
  const getSolution = () => {
    if (!solutionRef.current) {
      solutionRef.current = solveMars(cfg.grid.rows, cfg.grid.cols, dots);
    }
    return solutionRef.current;
  };

  // Clear cached solution + path when puzzle changes (new puzzle picked from bank).
  React.useEffect(() => {
    solutionRef.current = null;
    pathRef.current = [];
    setPath([]);
    setHintCells([]);
    setPhase('playing');
  }, [puzzleIdx]);

  // Show the next segment of the solution: from current path tail (or dot 1 if
  // empty) up to and including the next dot.
  const showHint = () => {
    const sol = getSolution();
    if (!sol) return;
    const cur = pathRef.current;
    // Find where current path matches solution prefix
    let matchLen = 0;
    while (matchLen < cur.length && matchLen < sol.length
           && sameCell(cur[matchLen], sol[matchLen])) matchLen++;
    // If user diverged from solution, reset path silently to matching prefix
    if (matchLen < cur.length) {
      const trimmed = cur.slice(0, matchLen);
      pathRef.current = trimmed;
      setPath(trimmed);
    }
    // Walk forward in solution until we hit the next dot
    const ghost = [];
    for (let i = matchLen; i < sol.length; i++) {
      ghost.push(sol[i]);
      if (dotNumberAt(sol[i], dots) > 0) break;
    }
    setHintCells(ghost);
    Haptics.selectionAsync();
    // Auto-clear hint after 3 seconds
    setTimeout(() => setHintCells([]), 3000);
  };

  // Auto-solve: fills the whole solution as the user's path.
  const autoSolve = () => {
    const sol = getSolution();
    if (!sol) return;
    pathRef.current = sol;
    setPath(sol);
    setHintCells([]);
    setPhase('win');
    playSound('complete');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSolvedCount(s => s + 1);
    setUsedIndices(prev => {
      const next = new Set(prev);
      next.add(puzzleIdx);
      return next;
    });
  };

  React.useEffect(() => {
    loadSounds();
    ensureInterstitialLoaded(); // make sure an interstitial is ready for level-clear ads
  }, []);

  // Convert absolute page coords → cell on board.
  // Board origin is measured in onLayout. PanResponder events provide pageX/pageY.
  const touchToCell = (pageX, pageY) => {
    const { x, y } = boardOriginRef.current;
    const innerX = pageX - x - BOARD_PADDING;
    const innerY = pageY - y - BOARD_PADDING;
    if (innerX < 0 || innerY < 0) return null;
    const c = Math.floor(innerX / cellSize);
    const r = Math.floor(innerY / cellSize);
    if (r < 0 || c < 0 || r >= cfg.grid.rows || c >= cfg.grid.cols) return null;
    return { r, c };
  };

  // Try to advance the path to `cell`.
  // Rules:
  //   - First cell of path MUST be dot #1.
  //   - Each new cell must be adjacent (8-dir) to the previous one.
  //   - May not revisit a cell already in path.
  //   - May not pass through a dot out of order (dot#K is allowed only if
  //     all dots 1..K-1 are already on path).
  //   - Backtrack: if user drags back onto the previous cell, pop the last.
  const tryExtendPath = (cell) => {
    if (!cell) return;
    const cur = pathRef.current;

    // Backtrack — user dragged back to previous cell
    if (cur.length >= 2 && sameCell(cell, cur[cur.length - 2])) {
      const next = cur.slice(0, -1);
      pathRef.current = next;
      setPath(next);
      return;
    }
    // Already at this cell — ignore
    if (cur.length && sameCell(cell, cur[cur.length - 1])) return;

    // First step: must start at dot 1
    if (cur.length === 0) {
      if (dotNumberAt(cell, dots) !== 1) return;
      pathRef.current = [cell];
      setPath([cell]);
      Haptics.selectionAsync();
      return;
    }

    // Subsequent steps
    const prev = cur[cur.length - 1];
    if (!isAdjacent(prev, cell)) return;
    // No revisit
    if (cur.some(p => sameCell(p, cell))) return;
    // No crossing diagonals
    if (wouldCrossDiagonal(cur, prev, cell)) return;

    // If this cell is a dot, ensure we're hitting them in order
    const dotNum = dotNumberAt(cell, dots);
    if (dotNum > 0) {
      // Count how many dots are already in current path
      const dotsHit = cur.filter(p => dotNumberAt(p, dots) > 0).length;
      // Next expected dot number = dotsHit + 1
      if (dotNum !== dotsHit + 1) return;
    }

    const next = [...cur, cell];
    pathRef.current = next;
    setPath(next);
    Haptics.selectionAsync();

    // Check win: visited the final dot
    if (dotNum === dots.length) {
      setPhase('win');
      playSound('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSolvedCount(s => s + 1);
      setUsedIndices(prev => {
        const next = new Set(prev);
        next.add(puzzleIdx);
        return next;
      });
    }
  };

  // Pick the next puzzle from the bank: random from unused indices.
  // If all 10 have been used (shouldn't normally happen since we advance at 5),
  // reset the used set so future plays still work.
  const pickNextPuzzle = () => {
    const used = new Set(usedIndices);
    used.add(puzzleIdx);
    let pool = bank.map((_, i) => i).filter(i => !used.has(i));
    if (pool.length === 0) {
      pool = bank.map((_, i) => i).filter(i => i !== puzzleIdx);
      setUsedIndices(new Set());
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    setPuzzleIdx(next);
    // win → playing transition handled by puzzleIdx-change effect.
  };


  // Measure the board's position in the window. measureInWindow returns
  // window-relative coords, which is what the gesture's page coords (g.x0 /
  // g.moveX) are too — so they pair up correctly on BOTH iOS and Android. (The
  // View.measure pageX/pageY used in onLayout is app-root-relative and can be
  // offset by the status bar / native-stack screen container in a release build,
  // shifting every touch off the board and breaking the drag.) Re-measured at the
  // start of every gesture so a stale/wrong layout value can never break drawing.
  const measureBoard = (cb) => {
    const node = boardRef.current;
    if (node && node.measureInWindow) {
      node.measureInWindow((x, y) => {
        boardOriginRef.current = { x, y };
        cb && cb();
      });
    } else {
      cb && cb();
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phase === 'playing',
    onMoveShouldSetPanResponder:  () => phase === 'playing',
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e, g) => {
      // Re-measure the board origin at the start of the gesture, then register
      // the first touch (dot 1) once the fresh origin is in.
      measureBoard(() => tryExtendPath(touchToCell(g.x0, g.y0)));
    },
    onPanResponderMove: (e, g) => {
      tryExtendPath(touchToCell(g.moveX, g.moveY));
    },
    onPanResponderRelease: () => {
      // If path didn't reach the last dot, reset.
      const cur = pathRef.current;
      const dotsHit = cur.filter(p => dotNumberAt(p, dots) > 0).length;
      if (dotsHit < dots.length) {
        pathRef.current = [];
        setPath([]);
      }
    },
  }), [phase, cfg, dots]);

  const reset = () => {
    pathRef.current = [];
    setPath([]);
    setPhase('playing');
  };

  // Build the connecting line segments between consecutive path cells.
  // Each segment is rendered as a rotated, padded line (rectangle View).
  const renderPath = () => {
    if (path.length < 2) return null;
    const segs = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const ax = a.c * cellSize + cellSize / 2;
      const ay = a.r * cellSize + cellSize / 2;
      const bx = b.c * cellSize + cellSize / 2;
      const by = b.r * cellSize + cellSize / 2;
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const thickness = Math.max(8, Math.floor(cellSize * 0.34));
      segs.push(
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: ax,
            top: ay - thickness / 2,
            width: len,
            height: thickness,
            borderRadius: thickness / 2,
            backgroundColor: theme.pathColor,
            shadowColor: theme.pathGlow,
            shadowOpacity: 0.9,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
            transform: [{ translateX: 0 }, { rotate: `${angle}deg` }],
            transformOrigin: '0% 50%',
          }}
        />
      );
    }
    return segs;
  };

  // Highlight cells along the path with subtle glow
  const isOnPath = (r, c) => path.some(p => p.r === r && p.c === c);

  // Render
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <LinearGradient colors={theme.bg} style={StyleSheet.absoluteFillObject} />

      {/* Decorative background objects — anchored off-screen at corners, fading inward */}
      <Image source={require('../../assets/star1.png')} style={styles.bgDecor1} resizeMode="contain" pointerEvents="none" />
      <Image source={require('../../assets/star2.png')} style={styles.bgDecor2} resizeMode="contain" pointerEvents="none" />

      {/* Header — X (left) + reset ↺ (right) + centred glow card (row, vertically centred).
          Constrained to the board's width so its left/right edges line up with the
          board and the helper buttons below it. */}
      <View style={[styles.headerWrap, { width: actualBoard, alignSelf: 'center' }]}>
        <TouchableOpacity style={[styles.closeBtn, isTablet && { width: 44 * Math.min(ts, 1.4), height: 44 * Math.min(ts, 1.4), borderRadius: 22 * Math.min(ts, 1.4) }]} onPress={() => navigation.navigate('Home')}>
          <Text style={[styles.closeTxt, isTablet && { fontSize: 18 * Math.min(ts, 1.4) }]}>✕</Text>
        </TouchableOpacity>
        <View style={[styles.headerCard, isTablet && { paddingVertical: 12 * Math.min(ts, 1.5), paddingHorizontal: 14 * Math.min(ts, 1.5) }, { borderColor: theme.pathColor + '55', shadowColor: theme.pathGlow }]}>
          <Text style={[styles.title, isTablet && { fontSize: 20 * Math.min(ts, 1.5) }]}>LEVEL {cfg.level}</Text>
          <Text style={[styles.subtitle, isTablet && { fontSize: 11 * Math.min(ts, 1.5) }]}>
            {theme.name.toUpperCase()} · {Math.min(solvedCount, PUZZLES_TO_ADVANCE)}/{PUZZLES_TO_ADVANCE} SOLVED
          </Text>
        </View>
        <TouchableOpacity style={[styles.resetBtn, isTablet && { width: 44 * Math.min(ts, 1.4), height: 44 * Math.min(ts, 1.4), borderRadius: 22 * Math.min(ts, 1.4) }]} onPress={reset}>
          <Text style={[styles.resetTxt, isTablet && { fontSize: 19 * Math.min(ts, 1.4) }]}>↺</Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={[styles.hint, isTablet && { fontSize: 13 * Math.min(ts, 1.4) }]}>Drag from 1 → {dots.length}</Text>

      {/* Board */}
      <View
        ref={boardRef}
        style={{
          alignSelf: 'center',
          width: actualBoard,
          height: actualBoard,
          padding: BOARD_PADDING,
          borderRadius: 20,
          backgroundColor: theme.cellBg,
          borderWidth: 1,
          borderColor: theme.cellBorder,
        }}
        onLayout={() => measureBoard()}
        {...panResponder.panHandlers}
      >
        <View style={{ width: innerSize, height: innerSize }}>
          {/* Cells grid */}
          {Array.from({ length: cfg.grid.rows }).map((_, r) =>
            Array.from({ length: cfg.grid.cols }).map((_, c) => (
              <View
                key={`${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: c * cellSize, top: r * cellSize,
                  width: cellSize, height: cellSize,
                  borderWidth: 0.5,
                  borderColor: theme.cellBorder,
                  backgroundColor: isOnPath(r, c)
                    ? theme.pathColor + '15'
                    : 'transparent',
                }}
              />
            ))
          )}

          {/* Path segments */}
          {renderPath()}

          {/* Hint ghost cells — show next-segment cells as dotted ring */}
          {hintCells.map((h, i) => {
            const cx = h.c * cellSize + cellSize / 2;
            const cy = h.r * cellSize + cellSize / 2;
            const ringSize = Math.floor(cellSize * 0.5);
            return (
              <View
                key={`hint-${i}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: cx - ringSize / 2,
                  top:  cy - ringSize / 2,
                  width: ringSize, height: ringSize,
                  borderRadius: ringSize / 2,
                  borderWidth: 2,
                  borderColor: theme.pathColor,
                  borderStyle: 'dashed',
                  opacity: 0.7,
                }}
              />
            );
          })}

          {/* Dots */}
          {dots.map((d, i) => {
            const cx = d.c * cellSize + cellSize / 2;
            const cy = d.r * cellSize + cellSize / 2;
            const dotSize = Math.floor(cellSize * 0.62);
            const visited = path.some(p => sameCell(p, d));
            return (
              <View
                key={i}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: cx - dotSize / 2,
                  top:  cy - dotSize / 2,
                  width: dotSize, height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: theme.dotColor,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: theme.pathGlow,
                  shadowOpacity: visited ? 1 : 0.5,
                  shadowRadius: visited ? 14 : 8,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: visited ? 10 : 6,
                  borderWidth: 2.5,
                  borderColor: theme.dotInner,
                }}
              >
                <Text style={{
                  fontFamily: FONTS.displayBold,
                  fontSize: dotSize * 0.45,
                  color: theme.numberColor,
                }}>{i + 1}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Helper buttons */}
      {phase === 'playing' && (
        <View style={styles.helperRow}>
          <TouchableOpacity
            style={[styles.helperBtn, isTablet && { paddingHorizontal: 16 * Math.min(ts, 1.5), paddingVertical: 10 * Math.min(ts, 1.5) }, { borderColor: theme.pathColor + '88' }]}
            onPress={showHint}
            activeOpacity={0.75}
          >
            <Text style={[styles.helperIcon, isTablet && { fontSize: 14 * Math.min(ts, 1.5) }, { color: theme.pathColor }]}>💡</Text>
            <Text style={[styles.helperLabel, isTablet && { fontSize: 12 * Math.min(ts, 1.5) }, { color: theme.pathColor }]}>HINT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.helperBtn, isTablet && { paddingHorizontal: 16 * Math.min(ts, 1.5), paddingVertical: 10 * Math.min(ts, 1.5) }, { borderColor: theme.pathColor + '88' }]}
            onPress={autoSolve}
            activeOpacity={0.75}
          >
            <Text style={[styles.helperIcon, isTablet && { fontSize: 14 * Math.min(ts, 1.5) }, { color: theme.pathColor }]}>✨</Text>
            <Text style={[styles.helperLabel, isTablet && { fontSize: 12 * Math.min(ts, 1.5) }, { color: theme.pathColor }]}>SOLVE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Win overlay */}
      {phase === 'win' && (() => {
        const levelCleared = solvedCount >= PUZZLES_TO_ADVANCE;
        const isLastLevel  = idx >= MARS_LEVELS.length - 1;
        return (
          <View style={styles.winOverlay} pointerEvents="box-none">
            <View style={styles.winCard} pointerEvents="auto">
              <Text style={styles.winEmoji}>🚀</Text>
              <Text style={styles.winTitle}>{levelCleared ? 'LEVEL UP!' : 'CLEARED!'}</Text>
              <Text style={styles.winSub}>
                Level {cfg.level} · {Math.min(solvedCount, PUZZLES_TO_ADVANCE)}/{PUZZLES_TO_ADVANCE}
              </Text>

              <View style={{ gap: 10, width: 240, marginTop: 16 }}>
                {levelCleared && !isLastLevel && (
                  <TouchableOpacity
                    style={[styles.winBtn, { backgroundColor: theme.pathColor }]}
                    onPress={goToNextLevel}
                  >
                    <Text style={styles.winBtnTxt}>Next Level →</Text>
                  </TouchableOpacity>
                )}
                {!levelCleared && (
                  <TouchableOpacity
                    style={[styles.winBtn, { backgroundColor: theme.pathColor }]}
                    onPress={pickNextPuzzle}
                  >
                    <Text style={styles.winBtnTxt}>Next Puzzle →</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.winBtn, { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' }]}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text style={styles.winBtnTxt}>Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bgDecor1: {
    position: 'absolute',
    bottom: -50, left: -55,
    width: 190, height: 218,
    opacity: 0.4,
  },
  bgDecor2: {
    position: 'absolute',
    top: -30, right: -40,
    width: 130, height: 94,
    opacity: 0.4,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 14,
    gap: 12,
  },
  closeBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  closeTxt: { color: '#fff', fontSize: 17 },
  resetBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  resetTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 35, 0.92)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 20, color: '#fff', letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: FONTS.bodySemi,
    fontSize: 11, color: 'rgba(255,255,255,0.55)',
    marginTop: 3, letterSpacing: 1.5,
  },
  hint: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', marginVertical: 16,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
  },
  helperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  helperIcon: { fontSize: 14 },
  helperLabel: {
    fontFamily: FONTS.bodyBlack,
    fontSize: 12,
    letterSpacing: 2,
  },
  winOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  winCard: {
    backgroundColor: '#0f0f2a',
    borderRadius: 24,
    paddingHorizontal: 28, paddingVertical: 28,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
    shadowColor: '#7C3AED', shadowOpacity: 0.5,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  winEmoji: { fontSize: 48, marginBottom: 4 },
  winTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 28, color: '#fff', letterSpacing: 2,
  },
  winSub: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13, color: 'rgba(255,255,255,0.55)',
    marginTop: 4, letterSpacing: 1,
  },
  winBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  winBtnTxt: {
    fontFamily: FONTS.bodyBold,
    color: '#fff', fontSize: 15,
  },
});

export default MarsScreen;
