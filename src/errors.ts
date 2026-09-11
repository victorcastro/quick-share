export type SnipErrorCode =
  | 'empty-content'
  | 'content-too-large'
  | 'invalid-id'
  | 'not-found'
  | 'expired'
  | 'collision-limit'
  | 'unavailable';

const MESSAGES: Record<SnipErrorCode, string> = {
  'empty-content': 'The content is empty.',
  'content-too-large': 'The content exceeds the maximum allowed size.',
  'invalid-id': 'The code does not match the LLLL-NNN format.',
  'not-found': 'No QuickSnip exists with that code.',
  expired: 'This QuickSnip has expired.',
  'collision-limit':
    'Could not create the QuickSnip. This may be a run of ID collisions, ' +
    'misdeployed Firestore rules, or a device clock that is out of sync.',
  unavailable: 'Could not reach the server.',
};

export class SnipError extends Error {
  readonly code: SnipErrorCode;

  constructor(code: SnipErrorCode, cause?: unknown) {
    super(MESSAGES[code], cause === undefined ? undefined : { cause });
    this.code = code;
    this.name = 'SnipError';
  }
}

export function isSnipError(value: unknown): value is SnipError {
  return value instanceof SnipError;
}
