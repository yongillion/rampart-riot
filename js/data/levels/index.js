// Rampart Riot — stage registry (4 chapters x 8 stages)
import CH1 from './ch1.js';
import CH2 from './ch2.js';
import CH3 from './ch3.js';
import CH4 from './ch4.js';

export const CHAPTERS = [CH1, CH2, CH3, CH4];
export const STAGES = [...CH1, ...CH2, ...CH3, ...CH4];
const BY_ID = new Map(STAGES.map(s => [s.id, s]));

export function getLevel(id) { return BY_ID.get(id) || STAGES[0]; }
export function chapterOf(id) { return +String(id).split('-')[0]; }
export function stageOrder(id) { return STAGES.findIndex(s => s.id === id); }
export function nextStageId(id) { const i = stageOrder(id); return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1].id : null; }
export function isUnlocked(slot, id) {
  const i = stageOrder(id);
  if (i < 0) return false;
  if (i === 0) return true;
  const prev = STAGES[i - 1];
  return !!(slot && slot.stages[prev.id] && slot.stages[prev.id].done);
}
