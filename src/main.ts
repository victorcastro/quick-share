import './style.css';
import { MAX_CONTENT_LENGTH } from './core/constants';
import { isSnipError } from './core/errors';
import { isExpired } from './core/expiration';
import { createSnip, readSnip, updateSnip, watchSnip, type Snip } from './data/snips';
import { buildShareUrl, clearHash, readIdFromHash, writeIdToHash } from './routing';
import { copyContent, initContentActions } from './ui/content-actions';
import { focusContent, initContentField, readContent, writeContent } from './ui/content-field';
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
  copyQrImage,
  initShareActions,
  isQrPopoverOpen,
  renderQrCode,
  setNewLinkVisible,
  setQrPopoverOpen,
  setShareBusy,
  setShareEnabled,
  showActionMessage,
  type ShareAction,
} from './ui/share-actions';
import { initTheme } from './ui/theme';

const UPDATE_DELAY_MS = 400;

let shareUrl = '';
let sharedContent: string | null = null;
let activeSnip: Snip | null = null;
let isBusy = false;
let updateTimer: number | undefined;
let updateQueue: Promise<void> = Promise.resolve();
let stopWatching: (() => void) | null = null;

function hasValidContent(): boolean {
  const content = readContent();
  return content.trim().length > 0 && content.length <= MAX_CONTENT_LENGTH;
}

function syncShareButtons(): void {
  setShareEnabled(!isBusy && hasValidContent());
}

function hasFreshShare(): boolean {
  return activeSnip !== null && !isExpired(activeSnip.expiresAt) && sharedContent === readContent();
}

function clearPendingUpdate(): void {
  if (updateTimer !== undefined) {
    window.clearTimeout(updateTimer);
    updateTimer = undefined;
  }
}

function stopWatchingActiveSnip(): void {
  stopWatching?.();
  stopWatching = null;
}

function invalidateShare(): void {
  clearPendingUpdate();
  stopWatchingActiveSnip();
  shareUrl = '';
  sharedContent = null;
  activeSnip = null;
  setNewLinkVisible(false);
  setQrPopoverOpen(false);
}

function activateSnip(snip: Snip, createdHere: boolean): void {
  clearPendingUpdate();
  stopWatchingActiveSnip();
  activeSnip = snip;
  shareUrl = buildShareUrl(snip.id);
  sharedContent = snip.content;
  renderQrCode(shareUrl);
  setNewLinkVisible(true);
  if (createdHere) {
    writeIdToHash(snip.id);
    setLookupValue(snip.id);
  }
  startCountdown(snip.expiresAt, () => {
    if (activeSnip?.id !== snip.id) {
      return;
    }
    if (!createdHere) {
      writeContent('');
    }
    invalidateShare();
    if (!createdHere) {
      markLookupInvalid();
    }
    syncShareButtons();
  });

  stopWatching = watchSnip(
    snip.id,
    (latest) => {
      if (activeSnip?.id !== latest.id) {
        return;
      }

      const hasLocalChanges = readContent() !== sharedContent;
      activeSnip = latest;
      sharedContent = latest.content;
      if (!hasLocalChanges && readContent() !== latest.content) {
        writeContent(latest.content);
      }
      syncShareButtons();
    },
    (error) => {
      if (activeSnip?.id !== snip.id) {
        return;
      }
      if (error.code === 'expired' || error.code === 'not-found') {
        invalidateShare();
      } else {
        showError(error);
      }
      syncShareButtons();
    },
  );

  syncShareButtons();
}

function showCreated(snip: Snip): void {
  activateSnip(snip, true);
}

function showSnip(snip: Snip): void {
  writeContent(snip.content);
  activateSnip(snip, false);
}

function persistActiveContent(): Promise<boolean> {
  clearPendingUpdate();
  const snip = activeSnip;
  const content = readContent();

  if (snip === null || isExpired(snip.expiresAt) || !hasValidContent()) {
    if (snip !== null && isExpired(snip.expiresAt)) {
      invalidateShare();
      syncShareButtons();
    }
    return Promise.resolve(false);
  }
  if (content === sharedContent) {
    return Promise.resolve(true);
  }

  const operation = updateQueue.then(async () => {
    if (activeSnip?.id !== snip.id) {
      return false;
    }
    try {
      await updateSnip(snip.id, content);
      if (activeSnip?.id === snip.id) {
        sharedContent = content;
        showActionMessage('Changes saved');
      }
      return true;
    } catch (error) {
      showError(error);
      if (isSnipError(error) && (error.code === 'expired' || error.code === 'not-found')) {
        invalidateShare();
      }
      syncShareButtons();
      return false;
    }
  });

  updateQueue = operation.then(() => undefined);
  return operation;
}

function scheduleActiveUpdate(): void {
  clearPendingUpdate();
  if (activeSnip === null || !hasValidContent() || readContent() === sharedContent) {
    return;
  }
  if (isExpired(activeSnip.expiresAt)) {
    invalidateShare();
    syncShareButtons();
    return;
  }

  updateTimer = window.setTimeout(() => {
    updateTimer = undefined;
    void persistActiveContent();
  }, UPDATE_DELAY_MS);
}

function handleContentChange(): void {
  clearError();
  syncShareButtons();
  scheduleActiveUpdate();
}

async function ensureShared(action: ShareAction): Promise<boolean> {
  if (hasFreshShare()) {
    return true;
  }

  if (activeSnip !== null && !isExpired(activeSnip.expiresAt)) {
    return persistActiveContent();
  }

  clearError();
  isBusy = true;
  setShareBusy(action);
  syncShareButtons();
  try {
    showCreated(await createSnip(readContent()));
    showActionMessage('New link created');
    return true;
  } catch (error) {
    showError(error);
    return false;
  } finally {
    isBusy = false;
    setShareBusy(null);
    syncShareButtons();
  }
}

async function handleNewLink(): Promise<void> {
  clearPendingUpdate();
  clearError();
  isBusy = true;
  setShareBusy('new');
  syncShareButtons();
  try {
    showCreated(await createSnip(readContent()));
  } catch (error) {
    showError(error);
  } finally {
    isBusy = false;
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

async function handleCopyQrImage(): Promise<void> {
  try {
    await copyQrImage();
  } catch {
    showMessage('Could not copy the QR image. Try taking a screenshot instead.');
  }
}

async function handleCopyContent(): Promise<void> {
  const content = readContent();
  if (content.length === 0) {
    return;
  }
  try {
    await copyContent(content);
  } catch {
    showMessage('Could not copy the content. Select it and copy it manually instead.');
  }
}

function handleClearContent(): void {
  clearPendingUpdate();
  clearError();
  writeContent('');
  invalidateShare();
  stopCountdown();
  clearHash();
  setLookupValue('');
  syncShareButtons();
  focusContent();
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
initContentField(handleContentChange);
initContentActions({
  onCopy: () => void handleCopyContent(),
  onClear: handleClearContent,
});
initLookupField({
  onSubmit: (rawId) => void openSnip(rawId),
  onClear: clearHash,
  onPaste: () => void handlePasteIntoLookup(),
});
initShareActions({
  onNew: () => void handleNewLink(),
  onCopy: () => void handleCopy(),
  onCopyQrImage: () => void handleCopyQrImage(),
  onQr: () => void handleQr(),
});

window.addEventListener('hashchange', consumeHash);

syncShareButtons();
consumeHash();
