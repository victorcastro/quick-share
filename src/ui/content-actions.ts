import { requireElement, setText } from './dom';

const COPY_SUCCESS_DURATION_MS = 1500;
const MESSAGE_DURATION_MS = 2000;

const contentActionMessage = requireElement('content-action-message', HTMLElement);
const copyContentButton = requireElement('copy-content', HTMLButtonElement);
const clearContentButton = requireElement('clear-content', HTMLButtonElement);
const clearContentConfirm = requireElement('clear-content-confirm', HTMLElement);
const clearContentConfirmButton = requireElement('clear-content-confirm-button', HTMLButtonElement);
const clearContentCancelButton = requireElement('clear-content-cancel', HTMLButtonElement);

let successTimer: number | undefined;
let messageTimer: number | undefined;

export function setContentActionsEnabled(enabled: boolean): void {
  copyContentButton.disabled = !enabled;
  clearContentButton.disabled = !enabled;
  if (!enabled) {
    setClearConfirmationOpen(false);
  }
}

function isClearConfirmationOpen(): boolean {
  return !clearContentConfirm.hidden;
}

function setClearConfirmationOpen(open: boolean): void {
  clearContentConfirm.hidden = !open;
  clearContentButton.setAttribute('aria-expanded', String(open));
}

export async function copyContent(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
  window.clearTimeout(successTimer);
  window.clearTimeout(messageTimer);
  copyContentButton.classList.remove('is-success');
  void copyContentButton.offsetWidth;
  copyContentButton.classList.add('is-success');
  setText(contentActionMessage, 'Content copied');
  successTimer = window.setTimeout(() => {
    copyContentButton.classList.remove('is-success');
  }, COPY_SUCCESS_DURATION_MS);
  messageTimer = window.setTimeout(() => {
    setText(contentActionMessage, '');
  }, MESSAGE_DURATION_MS);
}

export interface ContentActionHandlers {
  onCopy: () => void;
  onClear: () => void;
}

export function initContentActions({ onCopy, onClear }: ContentActionHandlers): void {
  copyContentButton.addEventListener('click', () => {
    setClearConfirmationOpen(false);
    onCopy();
  });
  clearContentButton.addEventListener('click', () => {
    setClearConfirmationOpen(!isClearConfirmationOpen());
  });
  clearContentConfirmButton.addEventListener('click', () => {
    setClearConfirmationOpen(false);
    window.clearTimeout(messageTimer);
    setText(contentActionMessage, '');
    onClear();
  });
  clearContentCancelButton.addEventListener('click', () => {
    setClearConfirmationOpen(false);
    clearContentButton.focus();
  });

  document.addEventListener('click', (event) => {
    if (
      event.target instanceof Node &&
      isClearConfirmationOpen() &&
      !clearContentButton.contains(event.target) &&
      !clearContentConfirm.contains(event.target)
    ) {
      setClearConfirmationOpen(false);
    }
  });
}
