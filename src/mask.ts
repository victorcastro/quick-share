import { DIGITS, LETTERS } from './config';
import { DIGIT_COUNT, LETTER_COUNT } from './id';

const SEPARATOR = '-';
const HASH_PREFIX = '#/';

export interface MaskOptions {
  appendSeparator?: boolean;
}

export function maskId(raw: string, { appendSeparator = true }: MaskOptions = {}): string {
  let value = raw.trim();

  const hashIndex = value.lastIndexOf(HASH_PREFIX);
  if (hashIndex !== -1) {
    value = value.slice(hashIndex + HASH_PREFIX.length);
  }

  let letters = '';
  let digits = '';

  for (const char of value) {
    if (letters.length < LETTER_COUNT) {
      if (LETTERS.includes(char)) {
        letters += char;
      }
    } else if (digits.length < DIGIT_COUNT && DIGITS.includes(char)) {
      digits += char;
    }
  }

  if (letters.length < LETTER_COUNT) {
    return letters;
  }
  if (digits.length === 0 && !appendSeparator) {
    return letters;
  }
  return `${letters}${SEPARATOR}${digits}`;
}

export function maskCaret(textBeforeCaret: string, options?: MaskOptions): number {
  return maskId(textBeforeCaret, options).length;
}
