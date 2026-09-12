import { showButtonSuccess } from './button-feedback';
import { requireElement, setText } from './dom';

const MESSAGE_DURATION_MS = 2000;

const contentActions = requireElement('content-actions', HTMLElement);
const contentActionMessage = requireElement('content-action-message', HTMLElement);
const copyContentButton = requireElement('copy-content', HTMLButtonElement);
const downloadContentButton = requireElement('download-content', HTMLButtonElement);
const clearContentButton = requireElement('clear-content', HTMLButtonElement);
const clearContentConfirm = requireElement('clear-content-confirm', HTMLElement);
const clearContentConfirmButton = requireElement('clear-content-confirm-button', HTMLButtonElement);
const clearContentCancelButton = requireElement('clear-content-cancel', HTMLButtonElement);

let messageTimer: number | undefined;

export function setContentActionsEnabled(enabled: boolean): void {
  contentActions.hidden = !enabled;
  copyContentButton.disabled = !enabled;
  downloadContentButton.disabled = !enabled;
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

function showContentActionMessage(message: string): void {
  window.clearTimeout(messageTimer);
  setText(contentActionMessage, message);
  messageTimer = window.setTimeout(() => {
    setText(contentActionMessage, '');
  }, MESSAGE_DURATION_MS);
}

export async function copyContent(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
  showButtonSuccess(copyContentButton);
  showContentActionMessage('Content copied');
}

export function downloadContent(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showContentActionMessage('Content downloaded');
}

export interface ContentActionHandlers {
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
}

export function initContentActions({ onCopy, onDownload, onClear }: ContentActionHandlers): void {
  copyContentButton.addEventListener('click', () => {
    setClearConfirmationOpen(false);
    onCopy();
  });
  downloadContentButton.addEventListener('click', () => {
    setClearConfirmationOpen(false);
    onDownload();
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
