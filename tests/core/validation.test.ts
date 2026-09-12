import { describe, expect, it } from 'vitest';
import { MAX_CONTENT_LENGTH } from '../../src/core/constants';
import { SnipError } from '../../src/core/errors';
import { validateContent } from '../../src/core/validation';

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return error instanceof SnipError ? error.code : `not-a-SnipError: ${String(error)}`;
  }
  return 'did-not-throw';
}

describe('validateContent', () => {
  it('rejects an empty string', () => {
    expect(codeOf(() => validateContent(''))).toBe('empty-content');
  });

  it('rejects whitespace-only content', () => {
    expect(codeOf(() => validateContent('   \n\t  '))).toBe('empty-content');
  });

  it('accepts exactly MAX_CONTENT_LENGTH characters', () => {
    const text = 'a'.repeat(MAX_CONTENT_LENGTH);
    expect(validateContent(text)).toBe(text);
  });

  it('rejects one character over the maximum', () => {
    expect(codeOf(() => validateContent('a'.repeat(MAX_CONTENT_LENGTH + 1)))).toBe(
      'content-too-large',
    );
  });

  it('returns the content verbatim, without trimming', () => {
    expect(validateContent('  hello  ')).toBe('  hello  ');
  });

  it('treats HTML as text and leaves it untouched', () => {
    const payload = '<script>alert(1)</script>';
    expect(validateContent(payload)).toBe(payload);
  });
});
