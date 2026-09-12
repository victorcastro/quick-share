import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { SnipError } from '../core/errors';
import { computeExpiresAt, isExpired } from '../core/expiration';
import { generateId, isValidId, normalizeId } from '../core/id';
import { validateContent } from '../core/validation';
import { db } from './firebase';

export const MAX_CREATE_RETRIES = 5;

const COLLECTION = 'snips';

export interface Snip {
  id: string;
  content: string;
  expiresAt: Date;
}

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'permission-denied'
  );
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}

interface SnipSnapshot {
  exists: () => boolean;
  data: () => Record<string, unknown> | undefined;
}

function snipFromSnapshot(id: string, snapshot: SnipSnapshot): Snip {
  if (!snapshot.exists()) {
    throw new SnipError('not-found');
  }

  const data = snapshot.data();
  if (data === undefined) {
    throw new SnipError('not-found');
  }
  const expiresAt = toDate(data['expiresAt']);
  const content = data['content'];

  if (expiresAt === null || typeof content !== 'string') {
    throw new SnipError('not-found');
  }

  if (isExpired(expiresAt)) {
    throw new SnipError('expired');
  }

  return { id, content, expiresAt };
}

function mapReadError(error: unknown): SnipError {
  return isPermissionDenied(error)
    ? new SnipError('expired', error)
    : new SnipError('unavailable', error);
}

export async function createSnip(content: string): Promise<Snip> {
  const validated = validateContent(content);

  for (let attempt = 0; attempt < MAX_CREATE_RETRIES; attempt += 1) {
    const id = generateId();
    const expiresAt = computeExpiresAt();

    try {
      await setDoc(doc(db, COLLECTION, id), {
        content: validated,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
      });
      return { id, content: validated, expiresAt };
    } catch (error) {
      if (isPermissionDenied(error)) {
        continue;
      }
      throw new SnipError('unavailable', error);
    }
  }

  throw new SnipError('collision-limit');
}

export async function readSnip(rawId: string): Promise<Snip> {
  const id = normalizeId(rawId);

  if (!isValidId(id)) {
    throw new SnipError('invalid-id');
  }

  let snapshot;
  try {
    snapshot = await getDoc(doc(db, COLLECTION, id));
  } catch (error) {
    throw mapReadError(error);
  }

  return snipFromSnapshot(id, snapshot);
}

export async function updateSnip(rawId: string, content: string): Promise<void> {
  const id = normalizeId(rawId);
  if (!isValidId(id)) {
    throw new SnipError('invalid-id');
  }

  const validated = validateContent(content);

  try {
    await updateDoc(doc(db, COLLECTION, id), { content: validated });
  } catch (error) {
    throw mapReadError(error);
  }
}

export function watchSnip(
  rawId: string,
  onChange: (snip: Snip) => void,
  onError: (error: SnipError) => void,
): Unsubscribe {
  const id = normalizeId(rawId);
  if (!isValidId(id)) {
    throw new SnipError('invalid-id');
  }

  return onSnapshot(
    doc(db, COLLECTION, id),
    (snapshot) => {
      try {
        onChange(snipFromSnapshot(id, snapshot));
      } catch (error) {
        onError(error instanceof SnipError ? error : new SnipError('unavailable', error));
      }
    },
    (error) => onError(mapReadError(error)),
  );
}
