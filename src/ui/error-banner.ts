import { isSnipError } from '../core/errors';
import { requireElement, setText } from './dom';

const FALLBACK_MESSAGE = 'Something went wrong. Check the console for details.';

const errorBox = requireElement('error', HTMLElement);

export function showError(error: unknown): void {
  setText(errorBox, isSnipError(error) ? error.message : FALLBACK_MESSAGE);
  if (!isSnipError(error)) {
    console.error(error);
  }
}

export function clearError(): void {
  setText(errorBox, '');
}
