// Tile themes for Jupiter mode — rotates every 120s during play

export const JUPITER_THEMES = [
  {
    id: 'neon',
    name: 'Neon',
    // Colors per bucket
    goodColor: '#34D399',
    badColor:  '#F87171',
    mulColor:  '#FBBF24',
    divColor:  '#A78BFA',
    // Visual style identifier — JupiterScreen uses this to pick render
    style: 'neon',     // glow border + dark glass
  },
  {
    id: 'bubble',
    name: 'Bubble',
    goodColor: '#7DD3FC',
    badColor:  '#FB7185',
    mulColor:  '#FDE047',
    divColor:  '#C4B5FD',
    style: 'bubble',   // round + soft gradient + highlight dot
  },
  {
    id: 'ice',
    name: 'Ice',
    goodColor: '#67E8F9',
    badColor:  '#F472B6',
    mulColor:  '#E0F2FE',
    divColor:  '#A5F3FC',
    style: 'ice',      // crystal-like frosty edges
  },
  {
    id: 'lava',
    name: 'Lava',
    goodColor: '#FB923C',
    badColor:  '#DC2626',
    mulColor:  '#FACC15',
    divColor:  '#9A3412',
    style: 'lava',     // hot ember glow, orange rim
  },
];

// Returns theme for current elapsed ms (rotates every 120s)
export const themeForElapsed = (elapsedMs) => {
  const idx = Math.floor(elapsedMs / 120000) % JUPITER_THEMES.length;
  return JUPITER_THEMES[idx];
};

// Returns theme based on real wall-clock time — rotates every 120s
// regardless of level boundaries, so even short levels get visible rotation
export const themeForNow = () => {
  const idx = Math.floor(Date.now() / 120000) % JUPITER_THEMES.length;
  return JUPITER_THEMES[idx];
};
