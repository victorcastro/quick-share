import './style.css';
import { MAX_CONTENT_LENGTH } from './config';
import { isSnipError } from './errors';
import { msUntilExpiry } from './expiration';
import { maskCaret, maskId } from './mask';
import { createQrElement } from './qr';
import { buildShareUrl, clearHash, readIdFromHash, writeIdToHash } from './routing';
import { createSnip, readSnip, type Snip } from './snip';
import { initTheme } from './theme';
import { initTypewriter } from './typewriter';

function required<T extends Element>(id: string, ctor: abstract new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof ctor)) {
    throw new Error(`Missing #${id} element in index.html`);
  }
  return element;
}

const contentInput = required('content', HTMLTextAreaElement);
const contentLimit = required('content-limit', HTMLElement);
const resultCountdown = required('result-countdown', HTMLElement);
const resultQr = required('result-qr', HTMLElement);
const copyButton = required('copy', HTMLButtonElement);
const copyFeedback = required('copy-feedback', HTMLElement);
const qrToggle = required('qr-toggle', HTMLButtonElement);
const qrPopover = required('qr-popover', HTMLElement);
const lookupInput = required('lookup', HTMLInputElement);
const lookupClear = required('lookup-clear', HTMLButtonElement);
const readButton = required('read', HTMLButtonElement);
const errorBox = required('error', HTMLElement);
const themeToggle = required('theme-toggle', HTMLButtonElement);
const lookupField = required('lookup-field', HTMLElement);

function setText(element: HTMLElement, text: string): void {
  element.textContent = text;
}

function showError(error: unknown): void {
  const message = isSnipError(error)
    ? error.message
    : 'Something went wrong. Check the console for details.';
  setText(errorBox, message);
  if (!isSnipError(error)) {
    console.error(error);
  }
}

function clearError(): void {
  setText(errorBox, '');
}

function markLookupInvalid(): void {
  lookupField.classList.remove('is-invalid');
  void lookupField.offsetWidth;

  lookupField.classList.add('is-invalid');
  lookupInput.setAttribute('aria-invalid', 'true');
}

function clearLookupInvalid(): void {
  lookupField.classList.remove('is-invalid');
  lookupInput.removeAttribute('aria-invalid');
}

function syncLookupClear(): void {
  const empty = lookupInput.value.length === 0;
  lookupClear.hidden = empty;
  readButton.hidden = empty;
  readButton.disabled = empty;
}

function handleLookupClear(): void {
  lookupInput.value = '';
  clearLookupInvalid();
  syncLookupClear();
  clearHash();
  lookupInput.focus();
}

function growContent(): void {
  contentInput.style.height = 'auto';
  contentInput.style.height = `${String(contentInput.scrollHeight)}px`;
}

let lastKnownContent: string | null = null;
let isCreating = false;

function syncButtons(): void {
  const disabled = isCreating || contentInput.value.trim().length === 0;
  copyButton.disabled = disabled;
  qrToggle.disabled = disabled;
}

function updateContentValidity(): void {
  const overLimit = contentInput.value.length > MAX_CONTENT_LENGTH;

  contentInput.classList.toggle('is-invalid', overLimit);
  contentInput.toggleAttribute('aria-invalid', overLimit);
  contentLimit.hidden = !overLimit;
  if (overLimit) {
    setText(
      contentLimit,
      `Too long by ${String(contentInput.value.length - MAX_CONTENT_LENGTH)} characters (max ${String(MAX_CONTENT_LENGTH)}).`,
    );
  }
  growContent();
  syncButtons();
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

const URGENT_THRESHOLD_MS = 60_000;

const timers = new Map<HTMLElement, number>();

function clearTimer(target: HTMLElement): void {
  const handle = timers.get(target);
  if (handle !== undefined) {
    window.clearInterval(handle);
    timers.delete(target);
  }
}

function stopCountdown(target: HTMLElement): void {
  clearTimer(target);
  target.classList.remove('is-urgent');
  setText(target, '');
}

function startCountdown(target: HTMLElement, snip: Snip, onExpire?: () => void): void {
  stopCountdown(target);

  const tick = (): void => {
    const remaining = msUntilExpiry(snip.expiresAt);
    if (remaining === 0) {
      stopCountdown(target);
      onExpire?.();
      return;
    }
    target.classList.toggle('is-urgent', remaining < URGENT_THRESHOLD_MS);
    setText(target, `Expires in ${formatRemaining(remaining)}`);
  };

  tick();
  timers.set(target, window.setInterval(tick, 1000));
}

let shareUrl = '';

function invalidateShare(): void {
  shareUrl = '';
  lastKnownContent = null;
  qrPopover.hidden = true;
}

function showCreated(snip: Snip): void {
  shareUrl = buildShareUrl(snip.id);

  resultQr.replaceChildren();
  const qr = createQrElement(shareUrl);
  if (qr !== null) {
    resultQr.appendChild(qr);
  }

  startCountdown(resultCountdown, snip, invalidateShare);
  writeIdToHash(snip.id);
  lookupInput.value = snip.id;
  syncLookupClear();
  lastKnownContent = contentInput.value;
}

function showSnip(snip: Snip): void {
  contentInput.value = snip.content;
  updateContentValidity();
  shareUrl = buildShareUrl(snip.id);
  lastKnownContent = snip.content;
  startCountdown(resultCountdown, snip, () => {
    contentInput.value = '';
    updateContentValidity();
    invalidateShare();
    markLookupInvalid();
  });
}

async function generate(): Promise<boolean> {
  if (shareUrl !== '' && lastKnownContent === contentInput.value) {
    return true;
  }
  clearError();
  isCreating = true;
  syncButtons();
  try {
    showCreated(await createSnip(contentInput.value));
    return true;
  } catch (error) {
    showError(error);
    return false;
  } finally {
    isCreating = false;
    syncButtons();
  }
}

async function handleRead(rawId: string): Promise<void> {
  clearError();
  clearLookupInvalid();
  contentInput.value = '';
  updateContentValidity();
  invalidateShare();
  stopCountdown(resultCountdown);
  readButton.disabled = true;
  try {
    showSnip(await readSnip(rawId));
  } catch (error) {
    markLookupInvalid();
    if (!isSnipError(error)) {
      console.error(error);
    }
  } finally {
    readButton.disabled = false;
  }
}

let copyFeedbackTimer: number | undefined;

async function handleCopy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(shareUrl);
    window.clearTimeout(copyFeedbackTimer);
    copyFeedback.classList.remove('opacity-0');
    copyFeedbackTimer = window.setTimeout(() => {
      copyFeedback.classList.add('opacity-0');
    }, 1500);
  } catch {
    showError(new Error('Could not copy automatically.'));
  }
}

async function handleCopyClick(): Promise<void> {
  if (await generate()) {
    await handleCopy();
  }
}

async function handleQrClick(): Promise<void> {
  const alreadyShared = shareUrl !== '' && lastKnownContent === contentInput.value;
  if (!(await generate())) {
    return;
  }
  qrPopover.hidden = alreadyShared ? !qrPopover.hidden : false;
}

function consumeHash(): void {
  const id = readIdFromHash();
  if (id === null) {
    return;
  }
  lookupInput.value = id;
  syncLookupClear();
  void handleRead(id);
}

readButton.addEventListener('click', () => void handleRead(lookupInput.value));
copyButton.addEventListener('click', () => void handleCopyClick());
qrToggle.addEventListener('click', () => void handleQrClick());
lookupClear.addEventListener('click', handleLookupClear);
contentInput.addEventListener('input', updateContentValidity);

document.addEventListener('click', (event) => {
  if (qrPopover.hidden || !(event.target instanceof Node) || qrToggle.contains(event.target)) {
    return;
  }
  if (!qrPopover.contains(event.target)) {
    qrPopover.hidden = true;
  }
});

function applyLookupMask(event: Event): void {
  clearLookupInvalid();
  syncLookupClear();

  const isDeletion = event instanceof InputEvent && event.inputType.startsWith('delete');
  const options = { appendSeparator: !isDeletion };

  const caret = lookupInput.selectionStart ?? lookupInput.value.length;
  const textBeforeCaret = lookupInput.value.slice(0, caret);
  const masked = maskId(lookupInput.value, options);

  if (masked === lookupInput.value) {
    return;
  }

  lookupInput.value = masked;
  const nextCaret = Math.min(maskCaret(textBeforeCaret, options), masked.length);
  lookupInput.setSelectionRange(nextCaret, nextCaret);
}

lookupInput.addEventListener('input', applyLookupMask);

lookupInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    void handleRead(lookupInput.value);
  }
});

window.addEventListener('hashchange', consumeHash);

initTheme(themeToggle);
initTypewriter(contentInput);
syncButtons();
consumeHash();
