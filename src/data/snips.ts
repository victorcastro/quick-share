import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
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
    if (isPermissionDenied(error)) {
      throw new SnipError('expired', error);
    }
    throw new SnipError('unavailable', error);
  }

  if (!snapshot.exists()) {
    throw new SnipError('not-found');
  }

  const data: Record<string, unknown> = snapshot.data();
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
