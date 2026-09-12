// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetSnip,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  readHistory,
  rememberSnip,
} from '../../src/data/history';
import type { Snip } from '../../src/data/snips';

const base = new Date('2026-09-11T12:00:00.000Z');

function snip(id: string, minutesFromBase: number): Snip {
  return {
    id,
    content: 'secret',
    expiresAt: new Date(base.getTime() + minutesFromBase * 60_000),
  };
}

function stored(): { id: string; expiresAt: number }[] {
  const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
  return raw === null ? [] : (JSON.parse(raw) as { id: string; expiresAt: number }[]);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readHistory', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(readHistory()).toEqual([]);
  });

  it('returns an empty list for corrupt JSON', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '{not json');
    expect(readHistory()).toEqual([]);
  });

  it('returns an empty list when the payload is not an array', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '{"id":"aKxP-428"}');
    expect(readHistory()).toEqual([]);
  });

  it('drops entries with an invalid id or timestamp', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        { id: 'nope', expiresAt: base.getTime() },
        { id: 'aKxP-428', expiresAt: 'soon' },
        { id: 'bQrt-113', expiresAt: base.getTime() },
        null,
      ]),
    );

    expect(readHistory()).toEqual([{ id: 'bQrt-113', expiresAt: base }]);
  });

  it('restores the expiry as a Date', () => {
    rememberSnip(snip('aKxP-428', 10));
    const [entry] = readHistory();

    expect(entry?.expiresAt).toBeInstanceOf(Date);
    expect(entry?.expiresAt.getTime()).toBe(base.getTime() + 10 * 60_000);
  });

  it('returns an empty list when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(readHistory()).toEqual([]);
  });
});

describe('rememberSnip', () => {
  it('stores only the id and the expiry', () => {
    rememberSnip(snip('aKxP-428', 10));

    expect(stored()).toEqual([{ id: 'aKxP-428', expiresAt: base.getTime() + 10 * 60_000 }]);
  });

  it('puts the entry that expires last first', () => {
    rememberSnip(snip('aKxP-428', 10));
    rememberSnip(snip('bQrt-113', 12));
    rememberSnip(snip('cLmn-907', 11));

    expect(readHistory().map((entry) => entry.id)).toEqual(['bQrt-113', 'cLmn-907', 'aKxP-428']);
  });

  it('keeps a single entry per id and refreshes its expiry', () => {
    rememberSnip(snip('aKxP-428', 10));
    rememberSnip(snip('aKxP-428', 20));

    expect(readHistory()).toEqual([{ id: 'aKxP-428', expiresAt: new Date(base.getTime() + 20 * 60_000) }]);
  });

  it('keeps at most HISTORY_LIMIT entries, dropping the oldest', () => {
    const letters = 'ABCDEFG';
    for (let index = 0; index < letters.length; index += 1) {
      rememberSnip(snip(`aKx${letters.charAt(index)}-42${index % 10}`, index));
    }

    const entries = readHistory();
    expect(entries).toHaveLength(HISTORY_LIMIT);
    expect(entries[0]?.id).toBe('aKxG-426');
    expect(entries[HISTORY_LIMIT - 1]?.id).toBe('aKxC-422');
  });

  it('still returns the list when localStorage rejects the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(rememberSnip(snip('aKxP-428', 10))).toEqual([
      { id: 'aKxP-428', expiresAt: new Date(base.getTime() + 10 * 60_000) },
    ]);
  });
});

describe('forgetSnip', () => {
  it('removes only the given id', () => {
    rememberSnip(snip('aKxP-428', 10));
    rememberSnip(snip('bQrt-113', 12));

    expect(forgetSnip('bQrt-113').map((entry) => entry.id)).toEqual(['aKxP-428']);
    expect(readHistory().map((entry) => entry.id)).toEqual(['aKxP-428']);
  });

  it('is a no-op for an unknown id', () => {
    rememberSnip(snip('aKxP-428', 10));

    expect(forgetSnip('cLmn-907').map((entry) => entry.id)).toEqual(['aKxP-428']);
  });
});
