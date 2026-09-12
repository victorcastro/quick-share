import { TTL_MINUTES } from './constants';

const MS_PER_MINUTE = 60_000;

export function computeExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + TTL_MINUTES * MS_PER_MINUTE);
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function msUntilExpiry(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, expiresAt.getTime() - now.getTime());
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}
