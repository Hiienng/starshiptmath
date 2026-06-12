// Mars solver: DFS with heuristic ordering to find a non-self-crossing
// 8-direction path that visits dots in order 1 → 2 → … → N.
//
// Returns array of {r,c} on success, or null. Capped by maxNodes to avoid
// blocking the UI on very hard puzzles.

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
];

const cellKey = (r, c) => r * 1000 + c;
const edgeKey = (r1, c1, r2, c2) => {
  // Canonicalize so undirected edge has stable key
  if (r1 < r2 || (r1 === r2 && c1 <= c2)) return `${r1},${c1}-${r2},${c2}`;
  return `${r2},${c2}-${r1},${c1}`;
};

export const solveMars = (rows, cols, dots, maxNodes = 200000) => {
  if (!dots || dots.length === 0) return null;
  const target  = dots.length;
  const dotKey  = new Set(dots.map(d => cellKey(d.r, d.c)));
  const dotIdx  = new Map();        // cellKey → 0-based dot index
  dots.forEach((d, i) => dotIdx.set(cellKey(d.r, d.c), i));

  const start    = dots[0];
  const visited  = new Set([cellKey(start.r, start.c)]);
  const diagEdges = new Set();      // edges of diagonals we've drawn
  const path     = [start];
  let nextDot    = 1;
  let found      = null;
  let nodeCount  = 0;

  const dfs = (cur) => {
    if (found) return true;
    if (++nodeCount > maxNodes) return false;

    if (nextDot === target) {
      // last dot reached
      if (cur.r === dots[target - 1].r && cur.c === dots[target - 1].c) {
        found = [...path];
        return true;
      }
      return false;
    }

    // sort moves by Chebyshev distance to next target dot
    const nd = dots[nextDot];
    const moves = DIRS
      .map(([dr, dc]) => ({ dr, dc, score: Math.max(Math.abs(cur.r + dr - nd.r), Math.abs(cur.c + dc - nd.c)) }))
      .sort((a, b) => a.score - b.score);

    for (const { dr, dc } of moves) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      const k = cellKey(nr, nc);
      if (visited.has(k)) continue;

      // Diagonal step? Make sure we don't cross an earlier diagonal.
      let crossKey = null;
      if (dr !== 0 && dc !== 0) {
        crossKey = edgeKey(cur.r, nc, nr, cur.c); // the OTHER diagonal of the 2×2
        if (diagEdges.has(crossKey)) continue;
      }

      // If the cell is a dot, it MUST be exactly the next expected dot.
      const di = dotIdx.has(k) ? dotIdx.get(k) : -1;
      if (di !== -1 && di !== nextDot) continue;

      visited.add(k);
      path.push({ r: nr, c: nc });
      // Track our own diagonal so a future segment can't cross it either.
      let myDiagKey = null;
      if (dr !== 0 && dc !== 0) {
        myDiagKey = edgeKey(cur.r, cur.c, nr, nc);
        diagEdges.add(myDiagKey);
      }
      const advancedDot = di === nextDot;
      if (advancedDot) nextDot++;

      if (dfs({ r: nr, c: nc })) return true;

      if (advancedDot) nextDot--;
      if (myDiagKey) diagEdges.delete(myDiagKey);
      path.pop();
      visited.delete(k);
    }
    return false;
  };

  dfs(start);
  return found;
};
