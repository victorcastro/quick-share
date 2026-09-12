import { MAX_CONTENT_LENGTH } from '../core/constants';
import { setContentActionsEnabled } from './content-actions';
import { requireElement, setText } from './dom';
import { initTypewriter } from './typewriter';

const contentInput = requireElement('content', HTMLTextAreaElement);
const contentLimit = requireElement('content-limit', HTMLElement);

let notifyChange: () => void = () => undefined;

function formatCharacterCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

function grow(): void {
  contentInput.style.height = 'auto';
  contentInput.style.height = `${String(contentInput.scrollHeight)}px`;
}

export function readContent(): string {
  return contentInput.value;
}

export function refreshContentField(notify = true): void {
  const overLimit = contentInput.value.length > MAX_CONTENT_LENGTH;
  const characterCount = contentInput.value.length;

  setContentActionsEnabled(characterCount > 0);
  contentInput.classList.toggle('is-invalid', overLimit);
  contentInput.toggleAttribute('aria-invalid', overLimit);
  contentLimit.classList.toggle('text-danger', overLimit);
  contentLimit.classList.toggle('text-muted', !overLimit);
  setText(
    contentLimit,
    `${formatCharacterCount(characterCount)} / ${formatCharacterCount(MAX_CONTENT_LENGTH)}`,
  );
  if (overLimit) {
    const excess = characterCount - MAX_CONTENT_LENGTH;
    contentLimit.setAttribute(
      'aria-label',
      `Too long by ${String(excess)} characters. Maximum ${String(MAX_CONTENT_LENGTH)}.`,
    );
  } else {
    contentLimit.setAttribute(
      'aria-label',
      `${String(characterCount)} of ${String(MAX_CONTENT_LENGTH)} characters used.`,
    );
  }

  grow();
  if (notify) {
    notifyChange();
  }
}

export function writeContent(value: string): void {
  contentInput.value = value;
  refreshContentField(false);
}

export function focusContent(): void {
  contentInput.focus();
}

export function initContentField(onChange: () => void): void {
  notifyChange = onChange;
  contentInput.addEventListener('input', () => refreshContentField());
  initTypewriter(contentInput);
}
