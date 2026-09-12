import { requireElement } from './dom';
import { createQrElement } from './qr';

const COPIED_FEEDBACK_MS = 1500;

const copyButton = requireElement('copy', HTMLButtonElement);
const copyFeedback = requireElement('copy-feedback', HTMLElement);
const qrToggle = requireElement('qr-toggle', HTMLButtonElement);
const qrPopover = requireElement('qr-popover', HTMLElement);
const qrHost = requireElement('result-qr', HTMLElement);

let feedbackTimer: number | undefined;

export type ShareAction = 'copy' | 'qr';

const BUTTONS: ReadonlyArray<readonly [ShareAction, HTMLButtonElement]> = [
  ['copy', copyButton],
  ['qr', qrToggle],
];

export function setShareEnabled(enabled: boolean): void {
  copyButton.disabled = !enabled;
  qrToggle.disabled = !enabled;
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
  const qr = createQrElement(url);
  if (qr !== null) {
    qrHost.appendChild(qr);
  }
}

export function isQrPopoverOpen(): boolean {
  return !qrPopover.hidden;
}

export function setQrPopoverOpen(open: boolean): void {
  qrPopover.hidden = !open;
}

function flashCopied(): void {
  window.clearTimeout(feedbackTimer);
  copyFeedback.classList.remove('opacity-0');
  feedbackTimer = window.setTimeout(() => {
    copyFeedback.classList.add('opacity-0');
  }, COPIED_FEEDBACK_MS);
}

export async function copyShareUrl(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
  flashCopied();
}

export interface ShareActionHandlers {
  onCopy: () => void;
  onQr: () => void;
}

export function initShareActions({ onCopy, onQr }: ShareActionHandlers): void {
  copyButton.addEventListener('click', onCopy);
  qrToggle.addEventListener('click', onQr);

  document.addEventListener('click', (event) => {
    if (!isQrPopoverOpen() || !(event.target instanceof Node)) {
      return;
    }
    if (!qrToggle.contains(event.target) && !qrPopover.contains(event.target)) {
      setQrPopoverOpen(false);
    }
  });
}
