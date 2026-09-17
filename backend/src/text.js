const COMBINING_MARKS = /[̀-ͯ]/g;

const UF_CODES = new Set([
  'ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb',
  'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to',
]);

export function normalizeCity(name) {
  let value = String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    // treat hyphens/slashes/commas as word separators (e.g. "maravilha-sc")
    .replace(/[-/,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // drop a trailing UF abbreviation, e.g. "maravilha sc" -> "maravilha"
  const parts = value.split(' ');
  if (parts.length > 1 && UF_CODES.has(parts[parts.length - 1])) {
    parts.pop();
    value = parts.join(' ');
  }

  return value;
}
