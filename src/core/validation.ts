import { MAX_CONTENT_LENGTH } from './constants';
import { SnipError } from './errors';

export function validateContent(content: string): string {
  if (content.trim().length === 0) {
    throw new SnipError('empty-content');
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    throw new SnipError('content-too-large');
  }

  return content;
}
