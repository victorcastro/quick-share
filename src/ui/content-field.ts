import { MAX_CONTENT_LENGTH } from '../core/constants';
import { requireElement, setText } from './dom';
import { initTypewriter } from './typewriter';

const contentInput = requireElement('content', HTMLTextAreaElement);
const contentLimit = requireElement('content-limit', HTMLElement);

let notifyChange: () => void = () => undefined;

function grow(): void {
  contentInput.style.height = 'auto';
  contentInput.style.height = `${String(contentInput.scrollHeight)}px`;
}

export function readContent(): string {
  return contentInput.value;
}

export function refreshContentField(notify = true): void {
  const overLimit = contentInput.value.length > MAX_CONTENT_LENGTH;

  contentInput.classList.toggle('is-invalid', overLimit);
  contentInput.toggleAttribute('aria-invalid', overLimit);
  contentLimit.hidden = !overLimit;
  if (overLimit) {
    const excess = contentInput.value.length - MAX_CONTENT_LENGTH;
    setText(
      contentLimit,
      `Too long by ${String(excess)} characters (max ${String(MAX_CONTENT_LENGTH)}).`,
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

export function initContentField(onChange: () => void): void {
  notifyChange = onChange;
  contentInput.addEventListener('input', () => refreshContentField());
  initTypewriter(contentInput);
}
