import { describe, expect, it } from 'vitest';
import { DIGITS, LETTERS } from '../src/config';
import { generateId, isValidId, normalizeId } from '../src/id';

const AMBIGUOUS = ['I', 'l', 'O', 'o'];

describe('LETTERS', () => {
  it('contains no ambiguous characters', () => {
    for (const char of AMBIGUOUS) {
      expect(LETTERS).not.toContain(char);
    }
  });

  it('has no duplicate characters', () => {
    expect(new Set(LETTERS).size).toBe(LETTERS.length);
  });

  it('holds the 48 letters the keyspace assumes', () => {
    expect(LETTERS.length).toBe(48);
    expect(DIGITS.length).toBe(10);
  });
});

describe('generateId', () => {
  const samples = Array.from({ length: 500 }, () => generateId());

  it('always produces the LLLL-NNN format', () => {
    for (const id of samples) {
      expect(id).toMatch(/^[A-HJ-NP-Za-kmnp-z]{4}-[0-9]{3}$/);
      expect(isValidId(id)).toBe(true);
    }
  });

  it('never emits ambiguous letters', () => {
    const letters = samples.map((id) => id.slice(0, 4)).join('');
    for (const char of AMBIGUOUS) {
      expect(letters).not.toContain(char);
    }
  });

  it('mixes upper and lower case', () => {
    const letters = samples.map((id) => id.slice(0, 4)).join('');
    expect(/[A-Z]/.test(letters)).toBe(true);
    expect(/[a-z]/.test(letters)).toBe(true);
  });

  it('does not repeat an ID across 500 draws', () => {
    expect(new Set(samples).size).toBeGreaterThan(490);
  });
});

describe('isValidId', () => {
  it('accepts a well-formed ID', () => {
    expect(isValidId('aKxP-428')).toBe(true);
  });

  it.each([
    ['an empty string', ''],
    ['a missing hyphen', 'aKxP428'],
    ['too few letters', 'aKx-428'],
    ['too many letters', 'aKxPQ-428'],
    ['too few digits', 'aKxP-42'],
    ['too many digits', 'aKxP-4283'],
    ['letters in the digit section', 'aKxP-4a8'],
    ['digits in the letter section', 'aK1P-428'],
    ['the ambiguous letter I', 'aKIP-428'],
    ['the ambiguous letter l', 'aKlP-428'],
    ['the ambiguous letter O', 'aKOP-428'],
    ['the ambiguous letter o', 'aKoP-428'],
    ['surrounding whitespace', ' aKxP-428 '],
  ])('rejects %s', (_name, value) => {
    expect(isValidId(value)).toBe(false);
  });
});

describe('normalizeId', () => {
  it('NEVER changes case', () => {
    expect(normalizeId('aKxP-428')).toBe('aKxP-428');
    expect(normalizeId('AkXp-428')).toBe('AkXp-428');
    expect(normalizeId('aKxP-428')).not.toBe(normalizeId('AkXp-428'));
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeId('  aKxP-428  ')).toBe('aKxP-428');
  });

  it('inserts the hyphen when it is missing', () => {
    expect(normalizeId('aKxP428')).toBe('aKxP-428');
  });

  it('extracts the ID from a pasted full URL', () => {
    expect(normalizeId('https://victorcastro.github.io/quick-snip/#/aKxP-428')).toBe('aKxP-428');
  });

  it('leaves unrecognised input alone so isValidId can reject it', () => {
    expect(isValidId(normalizeId('not an id'))).toBe(false);
  });
});
