import { DIGITS, LETTERS } from './config';

export const ID_PATTERN = new RegExp(`^[${LETTERS}]{4}-[${DIGITS}]{3}$`);

export const LETTER_COUNT = 4;
export const DIGIT_COUNT = 3;

function randomIndex(size: number): number {
  const limit = Math.floor(256 / size) * size;
  const buffer = new Uint8Array(1);
  for (;;) {
    const [byte] = crypto.getRandomValues(buffer);
    if (byte !== undefined && byte < limit) {
      return byte % size;
    }
  }
}

function randomChar(alphabet: string): string {
  return alphabet.charAt(randomIndex(alphabet.length));
}

export function generateId(): string {
  let letters = '';
  for (let i = 0; i < LETTER_COUNT; i += 1) {
    letters += randomChar(LETTERS);
  }

  let digits = '';
  for (let i = 0; i < DIGIT_COUNT; i += 1) {
    digits += randomChar(DIGITS);
  }

  return `${letters}-${digits}`;
}

export function isValidId(raw: string): boolean {
  return ID_PATTERN.test(raw);
}

export function normalizeId(raw: string): string {
  let value = raw.trim();

  const hashIndex = value.lastIndexOf('#/');
  if (hashIndex !== -1) {
    value = value.slice(hashIndex + 2).trim();
  }

  if (!value.includes('-') && value.length === LETTER_COUNT + DIGIT_COUNT) {
    value = `${value.slice(0, LETTER_COUNT)}-${value.slice(LETTER_COUNT)}`;
  }

  return value;
}
