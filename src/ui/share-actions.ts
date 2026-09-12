import { showButtonSuccess } from './button-feedback';
import { requireElement, setText } from './dom';
import { createQrElement, qrToPngBlob } from './qr';

const MESSAGE_DURATION_MS = 2000;

const actionMessage = requireElement('action-message', HTMLElement);
const newLinkAction = requireElement('new-link-action', HTMLElement);
const newLinkButton = requireElement('new-link', HTMLButtonElement);
const newLinkConfirm = requireElement('new-link-confirm', HTMLElement);
const newLinkConfirmButton = requireElement('new-link-confirm-button', HTMLButtonElement);
const newLinkCancelButton = requireElement('new-link-cancel', HTMLButtonElement);
const copyButton = requireElement('copy', HTMLButtonElement);
const qrToggle = requireElement('qr-toggle', HTMLButtonElement);
const qrPopover = requireElement('qr-popover', HTMLElement);
const qrHost = requireElement('result-qr', HTMLElement);
const copyQrImageButton = requireElement('copy-qr-image', HTMLButtonElement);

let feedbackTimer: number | undefined;
let qrImageBlob: Blob | null = null;

export type ShareAction = 'new' | 'copy' | 'qr';

const BUTTONS: ReadonlyArray<readonly [ShareAction, HTMLButtonElement]> = [
  ['new', newLinkButton],
  ['copy', copyButton],
  ['qr', qrToggle],
];

export function setShareEnabled(enabled: boolean): void {
  newLinkButton.disabled = !enabled;
  copyButton.disabled = !enabled;
  qrToggle.disabled = !enabled;
}

export function setNewLinkVisible(visible: boolean): void {
  newLinkAction.hidden = !visible;
  if (!visible) {
    setNewLinkConfirmationOpen(false);
  }
}

function isNewLinkConfirmationOpen(): boolean {
  return !newLinkConfirm.hidden;
}

function setNewLinkConfirmationOpen(open: boolean): void {
  newLinkConfirm.hidden = !open;
  newLinkButton.setAttribute('aria-expanded', String(open));
}

export function setShareBusy(action: ShareAction | null): void {
  for (const [name, button] of BUTTONS) {
    const busy = name === action;
    button.classList.toggle('is-busy', busy);
    if (busy) {
      button.setAttribute('aria-busy', 'true');
    } else {
      button.removeAttribute('aria-busy');
    }
  }
}

export function renderQrCode(url: string): void {
  qrHost.replaceChildren();
  qrImageBlob = null;
  copyQrImageButton.disabled = true;
  const qr = createQrElement(url);
  if (qr !== null) {
    qrHost.appendChild(qr);
    void qrToPngBlob(qr)
      .then((blob) => {
        if (qrHost.contains(qr)) {
          qrImageBlob = blob;
          copyQrImageButton.disabled = false;
        }
      })
      .catch(() => undefined);
  }
}

export function isQrPopoverOpen(): boolean {
  return !qrPopover.hidden;
}

export function setQrPopoverOpen(open: boolean): void {
  qrPopover.hidden = !open;
}

export function showActionMessage(message: string): void {
  window.clearTimeout(feedbackTimer);
  setText(actionMessage, message);
  feedbackTimer = window.setTimeout(() => {
    setText(actionMessage, '');
  }, MESSAGE_DURATION_MS);
}

export async function copyShareUrl(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
  showButtonSuccess(copyButton);
  showActionMessage('Link copied');
}

export async function copyQrImage(): Promise<void> {
  if (qrImageBlob === null || typeof ClipboardItem === 'undefined') {
    throw new Error('QR image clipboard support is unavailable.');
  }

  await navigator.clipboard.write([new ClipboardItem({ 'image/png': qrImageBlob })]);
  showButtonSuccess(qrToggle);
  showActionMessage('QR image copied');
}

export interface ShareActionHandlers {
  onNew: () => void;
  onCopy: () => void;
  onCopyQrImage: () => void;
  onQr: () => void;
}

export function initShareActions({ onNew, onCopy, onCopyQrImage, onQr }: ShareActionHandlers): void {
  newLinkButton.addEventListener('click', () => {
    setQrPopoverOpen(false);
    setNewLinkConfirmationOpen(!isNewLinkConfirmationOpen());
  });
  newLinkConfirmButton.addEventListener('click', () => {
    setNewLinkConfirmationOpen(false);
    onNew();
  });
  newLinkCancelButton.addEventListener('click', () => {
    setNewLinkConfirmationOpen(false);
    newLinkButton.focus();
  });
  copyButton.addEventListener('click', () => {
    setNewLinkConfirmationOpen(false);
    onCopy();
  });
  qrToggle.addEventListener('click', () => {
    setNewLinkConfirmationOpen(false);
    onQr();
  });
  copyQrImageButton.addEventListener('click', onCopyQrImage);

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (
      isNewLinkConfirmationOpen() &&
      !newLinkButton.contains(event.target) &&
      !newLinkConfirm.contains(event.target)
    ) {
      setNewLinkConfirmationOpen(false);
    }
    if (
      isQrPopoverOpen() &&
      !qrToggle.contains(event.target) &&
      !qrPopover.contains(event.target)
    ) {
      setQrPopoverOpen(false);
    }
  });
}
