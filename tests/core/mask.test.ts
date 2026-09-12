import { describe, expect, it } from 'vitest';
import { isValidId, LETTERS } from '../../src/core/id';
import { maskCaret, maskId } from '../../src/core/mask';

const AMBIGUOUS = ['I', 'l', 'O', 'o'];

describe('maskId', () => {
  it('inserts the separator once four letters are in', () => {
    expect(maskId('a')).toBe('a');
    expect(maskId('aKx')).toBe('aKx');
    expect(maskId('aKxP')).toBe('aKxP-');
    expect(maskId('aKxP4')).toBe('aKxP-4');
  });

  it('builds a valid id from the bare characters', () => {
    expect(maskId('aKxP428')).toBe('aKxP-428');
    expect(isValidId(maskId('aKxP428'))).toBe(true);
  });

  it('leaves an already valid id untouched', () => {
    expect(maskId('aKxP-428')).toBe('aKxP-428');
  });

  it('drops characters that are not in the id alphabet', () => {
    for (const char of AMBIGUOUS) {
      expect(LETTERS).not.toContain(char);
      expect(maskId(`aK${char}xP428`)).toBe('aKxP-428');
    }
    expect(maskId('a K@x#P-4 2$8')).toBe('aKxP-428');
  });

  it('rejects digits while the letter slots are still open', () => {
    expect(maskId('aK12xP428')).toBe('aKxP-428');
  });

  it('rejects letters once the digit slots start', () => {
    expect(maskId('aKxP4b2c8')).toBe('aKxP-428');
  });

  it('never exceeds the LLLL-NNN length', () => {
    expect(maskId('aKxPQRST428999')).toBe('aKxP-428');
  });

  it('pulls the id out of a pasted share URL', () => {
    expect(maskId('https://quicksnip.app/#/aKxP-428')).toBe('aKxP-428');
    expect(maskId('  https://quicksnip.app/#/aKxP-428  ')).toBe('aKxP-428');
  });

  it('preserves case, since ids are case sensitive', () => {
    expect(maskId('AKXP428')).toBe('AKXP-428');
    expect(maskId('akxp428')).toBe('akxp-428');
  });

  it('lets a deletion remove the separator', () => {
    expect(maskId('aKxP', { appendSeparator: false })).toBe('aKxP');
    expect(maskId('aKxP-', { appendSeparator: false })).toBe('aKxP');
  });

  it('keeps the separator on deletion once digits exist', () => {
    expect(maskId('aKxP-42', { appendSeparator: false })).toBe('aKxP-42');
  });

  it('returns an empty string for input with nothing usable', () => {
    expect(maskId('')).toBe('');
    expect(maskId('!!!')).toBe('');
    expect(maskId('III')).toBe('');
  });
});

describe('maskCaret', () => {
  it('counts the characters that survive masking', () => {
    expect(maskCaret('')).toBe(0);
    expect(maskCaret('aK')).toBe(2);
    expect(maskCaret('aKxP')).toBe(5);
    expect(maskCaret('aKxP', { appendSeparator: false })).toBe(4);
    expect(maskCaret('aKxP42')).toBe(7);
  });

  it('ignores rejected characters when placing the caret', () => {
    expect(maskCaret('aK@#')).toBe(2);
  });
});
