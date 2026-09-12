import { describe, expect, it } from 'vitest';
import { TTL_MINUTES } from '../../src/core/constants';
import { computeExpiresAt, isExpired, msUntilExpiry } from '../../src/core/expiration';

const now = new Date('2026-09-11T12:00:00.000Z');

describe('computeExpiresAt', () => {
  it('adds exactly TTL_MINUTES', () => {
    expect(computeExpiresAt(now).getTime() - now.getTime()).toBe(TTL_MINUTES * 60_000);
  });

  it('keeps the TTL inside the required 5 to 10 minute range', () => {
    expect(TTL_MINUTES).toBeGreaterThanOrEqual(5);
    expect(TTL_MINUTES).toBeLessThanOrEqual(10);
  });
});

describe('isExpired', () => {
  const expiresAt = new Date('2026-09-11T12:10:00.000Z');

  it('is false one millisecond before', () => {
    expect(isExpired(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(false);
  });

  it('is true exactly at expiresAt', () => {
    expect(isExpired(expiresAt, new Date(expiresAt.getTime()))).toBe(true);
  });

  it('is true one millisecond after', () => {
    expect(isExpired(expiresAt, new Date(expiresAt.getTime() + 1))).toBe(true);
  });
});

describe('msUntilExpiry', () => {
  const expiresAt = new Date('2026-09-11T12:10:00.000Z');

  it('returns the remaining milliseconds', () => {
    expect(msUntilExpiry(expiresAt, now)).toBe(10 * 60_000);
  });

  it('never returns a negative value', () => {
    expect(msUntilExpiry(expiresAt, new Date(expiresAt.getTime() + 5_000))).toBe(0);
  });
});
