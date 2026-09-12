import './style.css';
import { isSnipError } from './core/errors';
import { createSnip, readSnip, type Snip } from './data/snips';
import { buildShareUrl, clearHash, readIdFromHash, writeIdToHash } from './routing';
import { initContentField, readContent, writeContent } from './ui/content-field';
import { startCountdown, stopCountdown } from './ui/countdown';
import { clearError, showError, showMessage } from './ui/error-banner';
import {
  clearLookupInvalid,
  initLookupField,
  markLookupInvalid,
  pasteIntoLookup,
  setLookupBusy,
  setLookupValue,
} from './ui/lookup-field';
import {
  copyShareUrl,
  initShareActions,
  isQrPopoverOpen,
  renderQrCode,
  setQrPopoverOpen,
  setShareBusy,
  setShareEnabled,
  type ShareAction,
} from './ui/share-actions';
import { initTheme } from './ui/theme';

let shareUrl = '';
let sharedContent: string | null = null;
let isCreating = false;

function syncShareButtons(): void {
  setShareEnabled(!isCreating && readContent().trim().length > 0);
}

function hasFreshShare(): boolean {
  return shareUrl !== '' && sharedContent === readContent();
}

function invalidateShare(): void {
  shareUrl = '';
  sharedContent = null;
  setQrPopoverOpen(false);
}

function showCreated(snip: Snip): void {
  shareUrl = buildShareUrl(snip.id);
  sharedContent = snip.content;
  renderQrCode(shareUrl);
  writeIdToHash(snip.id);
  setLookupValue(snip.id);
  startCountdown(snip.expiresAt, invalidateShare);
}

function showSnip(snip: Snip): void {
  writeContent(snip.content);
  shareUrl = buildShareUrl(snip.id);
  sharedContent = snip.content;
  renderQrCode(shareUrl);
  startCountdown(snip.expiresAt, () => {
    writeContent('');
    invalidateShare();
    markLookupInvalid();
  });
}

async function ensureShared(action: ShareAction): Promise<boolean> {
  if (hasFreshShare()) {
    return true;
  }

  clearError();
  isCreating = true;
  setShareBusy(action);
  syncShareButtons();
  try {
    showCreated(await createSnip(readContent()));
    return true;
  } catch (error) {
    showError(error);
    return false;
  } finally {
    isCreating = false;
    setShareBusy(null);
    syncShareButtons();
  }
}

async function openSnip(rawId: string): Promise<void> {
  clearError();
  clearLookupInvalid();
  writeContent('');
  invalidateShare();
  stopCountdown();
  setLookupBusy(true);
  try {
    showSnip(await readSnip(rawId));
  } catch (error) {
    markLookupInvalid();
    if (!isSnipError(error)) {
      console.error(error);
    }
  } finally {
    setLookupBusy(false);
  }
}

async function handleCopy(): Promise<void> {
  if (!(await ensureShared('copy'))) {
    return;
  }
  try {
    await copyShareUrl(shareUrl);
  } catch {
    showMessage('Could not copy the link. Copy it from the address bar instead.');
  }
}

async function handleQr(): Promise<void> {
  const wasShared = hasFreshShare();
  if (!(await ensureShared('qr'))) {
    return;
  }
  setQrPopoverOpen(wasShared ? !isQrPopoverOpen() : true);
}

async function handlePasteIntoLookup(): Promise<void> {
  try {
    pasteIntoLookup(await navigator.clipboard.readText());
  } catch {
    showMessage('Could not read the clipboard. Paste the code with Ctrl+V instead.');
  }
}

function consumeHash(): void {
  const id = readIdFromHash();
  if (id === null) {
    return;
  }
  setLookupValue(id);
  void openSnip(id);
}

initTheme();
initContentField(syncShareButtons);
initLookupField({
  onSubmit: (rawId) => void openSnip(rawId),
  onClear: clearHash,
  onPaste: () => void handlePasteIntoLookup(),
});
initShareActions({
  onCopy: () => void handleCopy(),
  onQr: () => void handleQr(),
});

window.addEventListener('hashchange', consumeHash);

syncShareButtons();
consumeHash();
