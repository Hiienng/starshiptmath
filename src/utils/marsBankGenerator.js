// Generate a deterministic bank of 10 puzzles for each Mars level.
// Each bank is sorted by path-length (proxy for difficulty), so puzzle 0 is
// the easiest variant in that level and puzzle 9 is the hardest.
//
// We seed the RNG so the bank is identical across launches — important for
// progression consistency (a user mid-level shouldn't see a different puzzle
// after restarting the app).

// ── Seeded RNG (mulberry32) ──────────────────────────────────────────────────
const makeRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Puzzle generator ────────────────────────────────────────────────────────
// Strategy: build a random non-crossing 8-directional walk, then sample N
// indices along it as dots in walk-order. This produces a puzzle that is
// solvable by construction (the walk itself is the solution). Difficulty is
// proxied by walk length — longer walks mean more cells between consecutive
// dots, which forces the player to plan more turns.
const DIRS_8 = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
];

// Build a random non-self-crossing 8-directional walk by repeated DFS extension.
// Returns the path as an array of cells (length = walkLen on success), or null.
// Capped by `nodeCap` total recursion calls so it can never block the UI.
const randomWalk = (rows, cols, walkLen, rng, nodeCap = 8000) => {
  const start = { r: Math.floor(rng() * rows), c: Math.floor(rng() * cols) };
  const visited = new Set([start.r * 1000 + start.c]);
  const diagEdges = new Set();
  const path = [start];
  let nodes = 0;

  const edgeKey = (r1, c1, r2, c2) =>
    (r1 < r2 || (r1 === r2 && c1 <= c2))
      ? `${r1},${c1}-${r2},${c2}`
      : `${r2},${c2}-${r1},${c1}`;

  const shuffleDirs = () => {
    const a = DIRS_8.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const extend = () => {
    if (path.length >= walkLen) return true;
    if (++nodes > nodeCap) return false;
    const cur = path[path.length - 1];
    const dirs = shuffleDirs();
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      const k = nr * 1000 + nc;
      if (visited.has(k)) continue;
      let myDiag = null;
      if (dr !== 0 && dc !== 0) {
        const cross = edgeKey(cur.r, nc, nr, cur.c);
        if (diagEdges.has(cross)) continue;
        myDiag = edgeKey(cur.r, cur.c, nr, nc);
      }
      visited.add(k);
      if (myDiag) diagEdges.add(myDiag);
      path.push({ r: nr, c: nc });
      if (extend()) return true;
      if (nodes > nodeCap) return false;
      path.pop();
      if (myDiag) diagEdges.delete(myDiag);
      visited.delete(k);
    }
    return false;
  };

  return extend() ? path : null;
};

// Generate a puzzle by *constructing* a valid path first, then sampling dots
// along it. Solvable by construction. Then verify with solveMars to compute
// the path length the solver actually finds (which may equal walkLen).
const tryGenerate = (rows, cols, dotCount, rng) => {
  // Pick walk length. Longer walks give "harder-feeling" puzzles since dots
  // are spread further apart along the path. Density (dotCount/cells) shrinks
  // headroom — at very dense ratios, walks past ~1.3× dotCount become hard to
  // build without dead-ends, so we shrink the upper bound there.
  const cells = rows * cols;
  const density = dotCount / cells;
  const headroom = density >= 0.2
    ? Math.floor(cells * 0.15)            // cramped: at most +15% of cells
    : Math.floor(cells * 0.6);            // sparse: full headroom
  const minWalk = dotCount;
  const maxWalk = Math.min(cells, dotCount + headroom);
  const walkLen = minWalk + Math.floor(rng() * Math.max(1, maxWalk - minWalk + 1));

  const walk = randomWalk(rows, cols, walkLen, rng);
  if (!walk) return null;

  // Sample `dotCount` indices from the walk, including index 0 and the last.
  // Sorted ascending so dots remain in walk-order.
  const idxs = new Set([0, walk.length - 1]);
  let guard = 0;
  while (idxs.size < dotCount && guard++ < 200) {
    idxs.add(Math.floor(rng() * walk.length));
  }
  if (idxs.size < dotCount) return null;
  const sortedIdxs = [...idxs].sort((a, b) => a - b);
  const dots = sortedIdxs.map(i => walk[i]);

  // Solvable by construction (the walk itself is a valid path). Use walk length
  // as a difficulty proxy — verifying via solveMars on dense grids (e.g. 14 dots
  // on 8×8) can be very slow, and we don't need an optimal solver path here.
  return { dots, pathLength: walk.length };
};

// Generate up to `size` verified puzzles for a single level configuration.
// May return fewer if the grid is too cramped. Caller is expected to fall back
// to a hand-designed puzzle when the bank ends up empty.
export const generateBank = ({ level, rows, cols, dotCount, size = 10, seed }) => {
  const rng = makeRng(seed ?? (level * 9301 + 49297));
  const bank = [];
  // Time budget so we never block UI for too long.
  const t0 = Date.now();
  const maxMs = 1500;
  let attempts = 0;
  const maxAttempts = size * 60;
  while (bank.length < size && attempts++ < maxAttempts) {
    if (Date.now() - t0 > maxMs) break;
    const p = tryGenerate(rows, cols, dotCount, rng);
    if (p) bank.push(p);
  }
  bank.sort((a, b) => a.pathLength - b.pathLength);
  return bank.map(p => ({ dots: p.dots }));
};
