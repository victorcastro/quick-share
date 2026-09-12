import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_CONTENT_LENGTH } from '../../src/core/constants';
import { SnipError } from '../../src/core/errors';

const harness = vi.hoisted(() => {
  class FakeTimestamp {
    constructor(private readonly value: Date) {}
    static fromDate(date: Date): FakeTimestamp {
      return new FakeTimestamp(date);
    }
    toDate(): Date {
      return this.value;
    }
  }

  const store = new Map<string, Record<string, unknown>>();
  const listeners = new Map<string, Set<(snapshot: ReturnType<typeof snapshotFor>) => void>>();
  const idQueue: string[] = [];
  let idCounter = 0;
  let denyEveryWrite = false;

  const generateId = vi.fn((): string => {
    const queued = idQueue.shift();
    if (queued !== undefined) {
      return queued;
    }
    idCounter += 1;
    return `Test-${String(idCounter).padStart(3, '0')}`;
  });

  const doc = vi.fn((_db: unknown, _collection: string, id: string) => ({ id }));

  function snapshotFor(id: string) {
    const data = store.get(id);
    return {
      exists: () => data !== undefined,
      data: () => data,
    };
  }

  function notify(id: string): void {
    for (const listener of listeners.get(id) ?? []) {
      listener(snapshotFor(id));
    }
  }

  const setDoc = vi.fn((ref: { id: string }, data: Record<string, unknown>) => {
    if (denyEveryWrite || store.has(ref.id)) {
      return Promise.reject(Object.assign(new Error('PERMISSION_DENIED'), {
        code: 'permission-denied',
      }));
    }
    store.set(ref.id, data);
    return Promise.resolve();
  });

  const getDoc = vi.fn((ref: { id: string }) => {
    return Promise.resolve(snapshotFor(ref.id));
  });

  const updateDoc = vi.fn((ref: { id: string }, data: Record<string, unknown>) => {
    const existing = store.get(ref.id);
    if (denyEveryWrite || existing === undefined) {
      return Promise.reject(Object.assign(new Error('PERMISSION_DENIED'), {
        code: 'permission-denied',
      }));
    }
    store.set(ref.id, { ...existing, ...data });
    notify(ref.id);
    return Promise.resolve();
  });

  const onSnapshot = vi.fn(
    (
      ref: { id: string },
      onChange: (snapshot: ReturnType<typeof snapshotFor>) => void,
    ) => {
      const callbacks = listeners.get(ref.id) ?? new Set();
      callbacks.add(onChange);
      listeners.set(ref.id, callbacks);
      onChange(snapshotFor(ref.id));
      return () => callbacks.delete(onChange);
    },
  );

  const serverTimestamp = vi.fn(() => 'SERVER_TIMESTAMP');

  return {
    FakeTimestamp,
    store,
    idQueue,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    generateId,
    reset(): void {
      store.clear();
      idQueue.length = 0;
      idCounter = 0;
      denyEveryWrite = false;
      listeners.clear();
      vi.clearAllMocks();
    },
    denyAllWrites(): void {
      denyEveryWrite = true;
    },
  };
});

vi.mock('../../src/data/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: harness.doc,
  setDoc: harness.setDoc,
  updateDoc: harness.updateDoc,
  getDoc: harness.getDoc,
  onSnapshot: harness.onSnapshot,
  serverTimestamp: harness.serverTimestamp,
  Timestamp: harness.FakeTimestamp,
}));

vi.mock('../../src/core/id', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/id')>();
  return { ...actual, generateId: harness.generateId };
});

const { createSnip, readSnip, updateSnip, watchSnip, MAX_CREATE_RETRIES } = await import(
  '../../src/data/snips'
);

function seed(id: string, content: string, expiresAt: Date): void {
  harness.store.set(id, {
    content,
    createdAt: 'SERVER_TIMESTAMP',
    expiresAt: harness.FakeTimestamp.fromDate(expiresAt),
  });
}

function inMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

async function codeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    return error instanceof SnipError ? error.code : `not-a-SnipError: ${String(error)}`;
  }
  return 'did-not-throw';
}

beforeEach(() => {
  harness.reset();
});

describe('createSnip', () => {
  it('stores the three fields and returns the generated ID', async () => {
    const snip = await createSnip('hello world');

    expect(snip.id).toBe('Test-001');
    expect(harness.setDoc).toHaveBeenCalledTimes(1);

    const stored = harness.store.get('Test-001');
    expect(Object.keys(stored ?? {}).sort()).toEqual(['content', 'createdAt', 'expiresAt']);
    expect(stored?.['content']).toBe('hello world');
    expect(stored?.['createdAt']).toBe('SERVER_TIMESTAMP');
  });

  it('retries on collision and does NOT overwrite existing content', async () => {
    seed('Choq-001', 'original content', inMinutes(5));
    seed('Choq-002', 'other content', inMinutes(5));
    harness.idQueue.push('Choq-001', 'Choq-002', 'Free-003');

    const snip = await createSnip('new content');

    expect(snip.id).toBe('Free-003');
    expect(harness.setDoc).toHaveBeenCalledTimes(3);
    expect(harness.store.get('Choq-001')?.['content']).toBe('original content');
    expect(harness.store.get('Choq-002')?.['content']).toBe('other content');
  });

  it('throws collision-limit once the retries run out', async () => {
    harness.denyAllWrites();

    expect(await codeOf(() => createSnip('text'))).toBe('collision-limit');
    expect(harness.setDoc).toHaveBeenCalledTimes(MAX_CREATE_RETRIES);
  });

  it('rejects empty content without hitting the network', async () => {
    expect(await codeOf(() => createSnip('   '))).toBe('empty-content');
    expect(harness.setDoc).not.toHaveBeenCalled();
  });

  it('rejects oversized content without hitting the network', async () => {
    expect(await codeOf(() => createSnip('a'.repeat(MAX_CONTENT_LENGTH + 1)))).toBe(
      'content-too-large',
    );
    expect(harness.setDoc).not.toHaveBeenCalled();
  });

  it('maps a network failure to unavailable', async () => {
    harness.setDoc.mockRejectedValueOnce(new Error('offline'));
    expect(await codeOf(() => createSnip('text'))).toBe('unavailable');
  });
});

describe('readSnip', () => {
  it('returns the content of a live snip', async () => {
    seed('aKxP-428', 'secret text', inMinutes(5));

    const snip = await readSnip('aKxP-428');

    expect(snip.content).toBe('secret text');
    expect(snip.id).toBe('aKxP-428');
  });

  it('accepts the ID without a hyphen and a full URL', async () => {
    seed('aKxP-428', 'secret text', inMinutes(5));

    expect((await readSnip('aKxP428')).content).toBe('secret text');
    expect(
      (await readSnip('https://victorcastro.github.io/quick-share/#/aKxP-428')).content,
    ).toBe('secret text');
  });

  it('is case-sensitive: a differently cased ID is a different document', async () => {
    seed('aKxP-428', 'secret text', inMinutes(5));

    expect(await codeOf(() => readSnip('AkXp-428'))).toBe('not-found');
  });

  it('rejects a malformed ID without hitting the network', async () => {
    expect(await codeOf(() => readSnip('not-an-id'))).toBe('invalid-id');
    expect(harness.getDoc).not.toHaveBeenCalled();
  });

  it('throws not-found when the document does not exist', async () => {
    expect(await codeOf(() => readSnip('aKxP-428'))).toBe('not-found');
  });

  it('throws expired and does NOT return the content of a stale snip', async () => {
    seed('aKxP-428', 'text that should no longer be visible', inMinutes(-1));

    expect(await codeOf(() => readSnip('aKxP-428'))).toBe('expired');
  });

  it('treats expiresAt exactly equal to now as expired', async () => {
    seed('aKxP-428', 'text', new Date(Date.now()));

    expect(await codeOf(() => readSnip('aKxP-428'))).toBe('expired');
  });

  it('reads a permission-denied from the rules as expired', async () => {
    harness.getDoc.mockRejectedValueOnce(
      Object.assign(new Error('PERMISSION_DENIED'), { code: 'permission-denied' }),
    );

    expect(await codeOf(() => readSnip('aKxP-428'))).toBe('expired');
  });

  it('treats a malformed document as non-existent', async () => {
    harness.store.set('aKxP-428', { content: 42, expiresAt: 'tomorrow' });

    expect(await codeOf(() => readSnip('aKxP-428'))).toBe('not-found');
  });

  it('maps a network failure to unavailable', async () => {
    harness.getDoc.mockRejectedValueOnce(new Error('offline'));

    expect(await codeOf(() => readSnip('aKxP-428'))).toBe('unavailable');
  });
});

describe('updateSnip', () => {
  it('updates only the content of an existing snip', async () => {
    const expiresAt = inMinutes(5);
    seed('aKxP-428', 'original', expiresAt);

    await updateSnip('aKxP-428', 'updated');

    expect(harness.updateDoc).toHaveBeenCalledWith({ id: 'aKxP-428' }, { content: 'updated' });
    expect(harness.store.get('aKxP-428')).toEqual({
      content: 'updated',
      createdAt: 'SERVER_TIMESTAMP',
      expiresAt: harness.FakeTimestamp.fromDate(expiresAt),
    });
  });

  it('validates content before updating Firestore', async () => {
    seed('aKxP-428', 'original', inMinutes(5));

    expect(await codeOf(() => updateSnip('aKxP-428', '   '))).toBe('empty-content');
    expect(harness.updateDoc).not.toHaveBeenCalled();
  });

  it('maps a denied update to expired', async () => {
    expect(await codeOf(() => updateSnip('aKxP-428', 'updated'))).toBe('expired');
  });
});

describe('watchSnip', () => {
  it('emits the current value and subsequent content updates', async () => {
    seed('aKxP-428', 'original', inMinutes(5));
    const values: string[] = [];
    const stop = watchSnip(
      'aKxP-428',
      (snip) => values.push(snip.content),
      () => undefined,
    );

    await updateSnip('aKxP-428', 'updated');
    stop();
    await updateSnip('aKxP-428', 'ignored');

    expect(values).toEqual(['original', 'updated']);
  });
});
