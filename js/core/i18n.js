// Rampart Riot — localization (Korean default, English)
import KO from '../data/lang_ko.js';
import EN from '../data/lang_en.js';

const TABLES = { ko: KO, en: EN };
let lang = 'ko';

export function setLang(l) { lang = TABLES[l] ? l : 'ko'; }
export function getLang() { return lang; }

// t('key', {n: 3}) -> string with {n} replaced. Falls back to English, then to the key itself.
export function t(key, vars) {
  let s = TABLES[lang][key];
  if (s === undefined) s = TABLES.en[key];
  if (s === undefined) s = TABLES.ko[key];
  if (s === undefined) return key;
  if (Array.isArray(s)) s = s.join('\n');
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}
export function has(key) { return TABLES[lang][key] !== undefined || TABLES.en[key] !== undefined; }
// raw value (arrays allowed)
export function tr(key) { const v = TABLES[lang][key]; return v !== undefined ? v : TABLES.en[key]; }
// pick the current language from an inline {ko, en} object (strings pass through)
export function L(o) { if (o == null) return ''; if (typeof o === 'string') return o; return o[lang] ?? o.en ?? o.ko ?? ''; }
