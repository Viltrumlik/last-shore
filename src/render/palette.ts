// The game's limited palette (24 colours). Both the canvas renderer and the DOM UI
// (via CSS custom properties set in main.ts) use these.
export const PAL = {
  ink: '#1b1a24',
  night: '#2b2d42',
  deep: '#1f4e6b',
  sea: '#2f7a96',
  shallow: '#4fa3b5',
  foam: '#a9dbe0',
  salt: '#e6e0cf',
  seabed: '#c9bfa5',
  crack: '#9c8f73',
  sand: '#e3c98f',
  sandDark: '#c2a266',
  soil: '#8a6a42',
  soilDark: '#6b4f30',
  grass: '#6f9a4a',
  leaf: '#42683a',
  reed: '#8db255',
  cotton: '#f2efe6',
  wood: '#8b5a34',
  woodDark: '#5c3a24',
  roof: '#b5523b',
  clay: '#d9a86c',
  rust: '#a4643a',
  gold: '#f2c14e',
  danger: '#c23b3b',
} as const;

export type PalKey = keyof typeof PAL;

export const PAL_LIST: readonly string[] = Object.values(PAL);

/** Tile size in source pixels. */
export const TILE = 16;
