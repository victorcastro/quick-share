// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildShareUrl, clearHash, readIdFromHash, writeIdToHash } from '../src/routing';

const pagesLocation = {
  origin: 'https://victorcastro.github.io',
  pathname: '/quick-snip/',
};

describe('readIdFromHash', () => {
  it('extracts the ID from a valid hash', () => {
    expect(readIdFromHash('#/aKxP-428')).toBe('aKxP-428');
  });

  it('preserves case', () => {
    expect(readIdFromHash('#/AkXp-428')).toBe('AkXp-428');
  });

  it('accepts the ID without a hyphen', () => {
    expect(readIdFromHash('#/aKxP428')).toBe('aKxP-428');
  });

  it.each([
    ['an empty hash', ''],
    ['a bare hash mark', '#'],
    ['a missing slash', '#aKxP-428'],
    ['garbage', '#/not-an-id'],
    ['an ID with an ambiguous letter', '#/aKOP-428'],
  ])('returns null for %s', (_name, hash) => {
    expect(readIdFromHash(hash)).toBeNull();
  });

  it('reads from window when no hash is passed', () => {
    window.location.hash = '#/mZpR-042';
    expect(readIdFromHash()).toBe('mZpR-042');
  });
});

describe('buildShareUrl', () => {
  it('builds from location, with no hardcoded domain', () => {
    expect(buildShareUrl('aKxP-428', pagesLocation)).toBe(
      'https://victorcastro.github.io/quick-snip/#/aKxP-428',
    );
  });

  it('works the same on localhost', () => {
    expect(buildShareUrl('aKxP-428', { origin: 'http://localhost:5173', pathname: '/' })).toBe(
      'http://localhost:5173/#/aKxP-428',
    );
  });

  it('round-trips: the ID survives intact, case included', () => {
    const id = 'AkXp-731';
    const url = buildShareUrl(id, pagesLocation);
    expect(readIdFromHash(`#${url.split('#')[1] ?? ''}`)).toBe(id);
  });
});

describe('writeIdToHash', () => {
  it('puts the ID in the address bar without adding history entries', () => {
    const before = window.history.length;
    writeIdToHash('QrTa-731');

    expect(window.location.hash).toBe('#/QrTa-731');
    expect(window.history.length).toBe(before);
  });
});

describe('clearHash', () => {
  it('removes the hash from the address bar without adding history entries', () => {
    writeIdToHash('QrTa-731');
    const before = window.history.length;
    clearHash();

    expect(window.location.hash).toBe('');
    expect(window.history.length).toBe(before);
  });
});
