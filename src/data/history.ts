import { isValidId } from '../core/id';
import type { Snip } from './snips';

export const HISTORY_STORAGE_KEY = 'quickshare:history';

export const HISTORY_LIMIT = 5;

export interface HistoryEntry {
  id: string;
  expiresAt: Date;
}

function parseEntries(raw: string): HistoryEntry[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  const entries: HistoryEntry[] = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const { id, expiresAt } = item as { id?: unknown; expiresAt?: unknown };
    if (typeof id !== 'string' || !isValidId(id)) {
      continue;
    }
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
      continue;
    }
    entries.push({ id, expiresAt: new Date(expiresAt) });
  }

  return entries;
}

function sortAndCap(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries]
    .sort((left, right) => right.expiresAt.getTime() - left.expiresAt.getTime())
    .slice(0, HISTORY_LIMIT);
}

function store(entries: HistoryEntry[]): HistoryEntry[] {
  const capped = sortAndCap(entries);
  const serialized = JSON.stringify(
    capped.map(({ id, expiresAt }) => ({ id, expiresAt: expiresAt.getTime() })),
  );

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, serialized);
  } catch {
    return capped;
  }

  return capped;
}

export function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw === null ? [] : sortAndCap(parseEntries(raw));
  } catch {
    return [];
  }
}

export function rememberSnip(snip: Snip): HistoryEntry[] {
  const others = readHistory().filter((entry) => entry.id !== snip.id);
  return store([{ id: snip.id, expiresAt: snip.expiresAt }, ...others]);
}

export function forgetSnip(id: string): HistoryEntry[] {
  return store(readHistory().filter((entry) => entry.id !== id));
}
