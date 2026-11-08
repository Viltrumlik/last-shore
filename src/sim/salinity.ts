// Salinity and salt dust.
import { BAL, diff } from './config';
import { isLand, isSeabed, isWater, n8 } from './grid';
import { modMult } from './rules';
import type { GameState } from './types';

/**
 * Wind blows from the east (the sea) to the west (the town). Each exposed seabed tile
 * throws salt dust into the wind; dust settles on dry land downwind. A saxaul belt absorbs
 * most of the dust and shelters the next `saxaulShelter` tiles downwind completely.
 * Returns the total dust deposited on land.
 */
export function spreadDust(s: GameState, strength: number): number {
  let total = 0;
  for (const t of s.tiles) t.dust = 0;
  if (strength <= 0) return 0;
  for (let y = 0; y < s.h; y++) {
    let carried = 0;
    let shelter = 0;
    for (let x = s.w - 1; x >= 0; x--) {
      const i = y * s.w + x;
      const t = s.tiles[i]!;
      if (isWater(s, i)) {
        carried *= BAL.waterAbsorb;
        if (shelter > 0) shelter--;
        continue;
      }
      if (t.terrain === 'river') {
        carried *= 0.85;
        if (shelter > 0) shelter--;
        continue;
      }
      const b = t.b?.id;
      if (isSeabed(s, i)) {
        let em = BAL.dustEmit * strength * Math.max(0.3, t.sal / 100);
        if (b === 'reeds' || b === 'saxaul') em *= 0.1;
        if (t.b && t.b.id === 'wreck') em *= 0.8;
        carried += em;
      }
      if (b === 'saxaul') {
        const eff = t.b!.age >= 2 ? 1 : 0.5;
        carried *= 1 - BAL.saxaulBlock * eff;
        shelter = eff >= 1 ? BAL.saxaulShelter : Math.ceil(BAL.saxaulShelter / 2);
        continue;
      }
      if (shelter > 0) {
        shelter--;
        continue;
      }
      if (isLand(s, i)) {
        const dep = carried * BAL.dustDeposit;
        t.sal = Math.min(100, t.sal + dep);
        t.dust = dep;
        carried -= dep;
        total += dep;
      } else {
        // seabed: a little settles back
        carried *= 0.97;
      }
    }
  }
  return total;
}

export function dustStrength(s: GameState, season: number, storm: boolean): number {
  const d = diff(s.difficulty);
  const base = BAL.dustSeason[season % 4]! * d.dust * modMult(s, 'dust');
  return storm ? base * d.storm : base;
}

/**
 * Local salinity changes from land use. `fieldSat` maps a tile to the water satisfaction of
 * an irrigated field (0 if dry); `reedOk` tells whether reed beds were watered this season.
 */
export function landSalinity(s: GameState, season: number, fieldSat: (i: number) => number, reedOk: (i: number) => boolean): void {
  const so = season % 4;
  const growing = so < 3;
  const delta = new Float32Array(s.tiles.length);
  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i]!;
    const b = t.b?.id;
    if (b === 'cotton' && growing) {
      const w = fieldSat(i);
      delta[i]! += BAL.cottonSalSelf * (0.4 + 0.6 * w);
      for (const n of n8(s, i)) if (isLand(s, n)) delta[n]! += BAL.cottonSalNeighbour * (0.4 + 0.6 * w);
    } else if ((b === 'wheat' || b === 'melon') && growing) {
      delta[i]! += BAL.fieldSalSelf * fieldSat(i);
    } else if (b === 'reeds' && so !== 3 && reedOk(i)) {
      delta[i]! -= BAL.reedSalSelf;
      for (const n of n8(s, i)) delta[n]! -= BAL.reedSalNeighbour;
    } else if (b === 'saxaul') {
      delta[i]! -= BAL.saxaulSalSelf;
    } else if (!b && t.terrain === 'soil' && so === 0) {
      delta[i]! -= BAL.naturalLeach * 3;
    }
    if (isSeabed(s, i) && b !== 'reeds' && b !== 'saxaul') delta[i]! += BAL.seabedCreep;
  }
  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i]!;
    if (t.terrain === 'river') continue;
    if (t.terrain === 'sea' && isWater(s, i)) continue;
    t.sal = Math.max(0, Math.min(100, t.sal + delta[i]!));
  }
}
