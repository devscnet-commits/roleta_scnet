export function onlyDigits(str) {
  return String(str || '').replace(/\D/g, '');
}

export function isValidCpf(rawCpf) {
  const cpf = onlyDigits(rawCpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let check1 = (sum * 10) % 11;
  if (check1 === 10) check1 = 0;
  if (check1 !== digits[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  let check2 = (sum * 10) % 11;
  if (check2 === 10) check2 = 0;
  if (check2 !== digits[10]) return false;

  return true;
}

export function maskCpf(rawCpf) {
  const cpf = onlyDigits(rawCpf);
  if (cpf.length !== 11) return rawCpf;
  return `${cpf.slice(0, 3)}.***.**${cpf.slice(8, 9)}-${cpf.slice(9)}`;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeCity(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '');
}
