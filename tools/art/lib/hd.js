// Rampart Riot — HD showcase atlases for the hero screen.
// The hero screen draws one hero large (up to ~530 device px tall on HiDPI screens), far beyond the battle sprites
// (rendered at scale 1.6, ~85 px tall). These atlases re-render the same rigs and portrait art, unchanged, at a much
// higher scale. Frame names are prefixed so they never collide with the battle atlases:
//   hd_<id>/<idle|attack|special>/<n>   full-body animations shown on the pedestal
//   hd_portrait/<id>                      the big portrait above it
// One atlas per hero (sets/hd_<id>.js) so the screen only downloads the hero being viewed.
import { jobs as heroJobs } from '../sets/heroes.js';
import { jobs as portraitJobs } from '../sets/portraits.js';

export const BODY_SCALE = 10;    // battle atlas: 1.6  (Brannoc ~85 px -> ~520 px tall)
export const PORTRAIT_SCALE = 6; // portraits atlas: 2  (128 units -> 768 px)
// The griffin is wide, so the screen fits it by width and draws it smaller: ~600 device px wide at most.
const BODY_SCALE_FOR = { aerin: 7.5 };
const SHOW = ['idle', 'attack', 'special'];  // what the hero screen plays

export function hdJobs(id) {
  const body = heroJobs().find(j => j.name === 'h_' + id);
  const face = portraitJobs().find(j => j.name === 'portrait/' + id);
  if (!body) throw new Error('no hero job for ' + id);
  const out = [{ ...body, name: 'hd_' + id, scale: BODY_SCALE_FOR[id] || BODY_SCALE, anims: Object.fromEntries(SHOW.filter(a => body.anims[a]).map(a => [a, body.anims[a]])) }];
  if (face) out.push({ ...face, name: 'hd_portrait/' + id, scale: PORTRAIT_SCALE });
  return out;
}
