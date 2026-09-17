const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeCity(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '');
}
