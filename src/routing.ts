import { isValidId, normalizeId } from './core/id';

const HASH_PREFIX = '#/';

export function readIdFromHash(hash: string = window.location.hash): string | null {
  if (!hash.startsWith(HASH_PREFIX)) {
    return null;
  }

  const candidate = normalizeId(hash.slice(HASH_PREFIX.length));
  return isValidId(candidate) ? candidate : null;
}

export function writeIdToHash(id: string): void {
  window.history.replaceState(null, '', `${HASH_PREFIX}${id}`);
}

export function clearHash(): void {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

export function buildShareUrl(
  id: string,
  location: Pick<Location, 'origin' | 'pathname'> = window.location,
): string {
  return `${location.origin}${location.pathname}${HASH_PREFIX}${id}`;
}
