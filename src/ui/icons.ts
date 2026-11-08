// Tiny pixel icons for the DOM UI, drawn from character matrices with the game palette.
import { PAL } from '../render/palette';
import { CHARMAP } from '../render/pixels';

const M: Record<string, string[]> = {
  pop: ['..kk..', '.kyyk.', '.kyyk.', '..kk..', '.kRRk.', 'kRRRRk', 'kRRRRk', 'kkkkkk'],
  food: ['..k.....', '.kGk..k.', 'kGGGk.kk', 'kGGGGkGk', 'kGGGGGGk', '.kGGGkGk', '..kkk.kk', '......k.'],
  water: ['...k...', '..kSk..', '.kShSk.', '.kShSk.', 'kSShSSk', 'kSSSSSk', '.kSSSk.', '..kkk..'],
  money: ['.kkkk.', 'kGGGGk', 'kGkkGk', 'kGkGGk', 'kGkkGk', 'kGGGGk', '.kkkk.'],
  health: ['.kk.kk.', 'kxxkxxk', 'kxxxxxk', 'kxxxxxk', '.kxxxk.', '..kxk..', '...k...'],
  hope: ['...G...', '.G.G.G.', '..GGG..', 'GGGwGGG', '..GGG..', '.G.G.G.', '...G...'],
  sea: ['........', '.ff..ff.', 'fSSffSSf', 'SSSSSSSS', 'DSSDSSDS', 'DDDDDDDD'],
  salt: ['..ss..', '.swws.', 'swwwws', 'swwwws', '.swws.', '..ss..'],
  labour: ['kkkk...', 'kccck..', 'kkkkk..', '..kdk..', '..kdk..', '..kdk..', '..kdk..', '..kkk..'],
  cotton: ['.kkk.', 'kwwwk', 'kwswk', 'kwwwk', '.klk.', '..l..', '..l..'],
  reeds: ['r.r.r', 'r.r.r', 'rlrlr', 'lrlrl', '.lll.', '.lll.'],
  season0: ['...g...', '..ggg..', '.g.g.g.', '...g...', '..lgl..', '.l.g.l.', '...l...'],
  season1: ['...G...', '.G.G.G.', '..GGG..', 'GGGGGGG', '..GGG..', '.G.G.G.', '...G...'],
  season2: ['...uu..', '..uGGu.', '.uGGGu.', 'uGGuGu.', 'uGuGGu.', '.uuuu..', 'u......'],
  season3: ['...f...', '.f.f.f.', '..fff..', 'fffffff', '..fff..', '.f.f.f.', '...f...'],
  quota: ['kkkkk.', 'kwwwkk', 'kwkkwk', 'kwwwwk', 'kwkkwk', 'kwwwwk', 'kkkkkk'],
  dike: ['......', 'cccccc', 'cbcbcb', 'bcbcbc', 'cccccc', 'SSSSSS'],
  danger: ['...x...', '..xkx..', '..xkx..', '.xxkxx.', '.xxxxx.', 'xxxkxxx', 'xxxxxxx'],
  ok: ['......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....'],
  no: ['x....x', '.x..x.', '..xx..', '..xx..', '.x..x.', 'x....x'],
  gear: ['..k.k..', '.kkkkk.', 'kkcccck', '.kc.ck.', 'kkcccck', '.kkkkk.', '..k.k..'],
  sound: ['...k..', '..kk.k', 'kkck..', 'kcck.k', 'kkck..', '..kk.k', '...k..'],
  mute: ['...k...', '..kk...', 'kkck.x.x', 'kcck..x.', 'kkck.x.x', '..kk...', '...k...'],
  help: ['.kkkk.', 'kGGGGk', '....Gk', '...Gk.', '..Gk..', '......', '..Gk..'],
  fish: ['........', '.hhh..h.', 'hhkhhhh.', 'hhhhhhh.', '.hhh..h.'],
  tile: ['kkkkkk', 'kaaaak', 'kaAaak', 'kaaAak', 'kaaaak', 'kkkkkk'],
};

const cache = new Map<string, string>();

/** Data URL of a named icon (rendered once at 1:1, scaled up crisply by CSS). */
export function iconUrl(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const rows = M[name] ?? M.tile!;
  const w = Math.max(...rows.map((r) => r.length));
  const hgt = rows.length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = hgt;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const k = CHARMAP[row[x]!];
      if (!k) continue;
      g.fillStyle = PAL[k];
      g.fillRect(x, y, 1, 1);
    }
  });
  const url = c.toDataURL();
  cache.set(name, url);
  return url;
}

export function icon(name: string, cls = 'ico'): HTMLImageElement {
  const img = document.createElement('img');
  img.className = cls;
  img.src = iconUrl(name);
  img.alt = '';
  img.draggable = false;
  const rows = M[name] ?? M.tile!;
  img.style.setProperty('--iw', String(Math.max(...rows.map((r) => r.length))));
  img.style.setProperty('--ih', String(rows.length));
  return img;
}
