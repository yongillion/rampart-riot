// Rampart Riot — the films: opening, chapter interludes and the ending. Painted procedurally with js/cine/kit.js.
// Timings of the opening and ending are locked to the cue sheet of their scores (assets/audio/music.json).
import * as K from './kit.js';
import { OPENING } from './film_opening.js';
import { INTERLUDES } from './film_interludes.js';
import { ENDING } from './film_ending.js';

export const FILMS = Object.assign({ opening: OPENING, ending: ENDING }, INTERLUDES);
export { K };
