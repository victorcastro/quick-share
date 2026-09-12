import { formatRemaining, msUntilExpiry } from '../core/expiration';
import type { HistoryEntry } from '../data/history';
import { buildShareUrl } from '../routing';
import { showButtonSuccess } from './button-feedback';
import { requireElement, setText } from './dom';
import { createQrElement } from './qr';

const TICK_MS = 1000;
const URGENT_THRESHOLD_MS = 60_000;
const ACTION_SELECTORS = ['[data-copy]', '[data-share]', '[data-qr]'] as const;

export const HISTORY_OPEN_STORAGE_KEY = 'quickshare:history-open';

const list = requireElement('history-list', HTMLElement);
const template = requireElement('history-card', HTMLTemplateElement);
const toggle = requireElement('history-toggle', HTMLButtonElement);
const toggleLabel = requireElement('history-toggle-label', HTMLElement);
const count = requireElement('history-count', HTMLElement);

const cards = new Map<string, HTMLElement>();

let handle: number | undefined;
let isOpen = readStoredOpen();

function readStoredOpen(): boolean {
  try {
    return localStorage.getItem(HISTORY_OPEN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function storeOpen(open: boolean): void {
  try {
    localStorage.setItem(HISTORY_OPEN_STORAGE_KEY, String(open));
  } catch {
    return;
  }
}

function part<T extends Element>(
  card: HTMLElement,
  selector: string,
  ctor: abstract new () => T,
): T {
  const element = card.querySelector(selector);
  if (!(element instanceof ctor)) {
    throw new Error(`Missing ${selector} in the #history-card template`);
  }
  return element;
}

function setQrOpen(card: HTMLElement, open: boolean): void {
  const panel = part(card, '[data-qr-panel]', HTMLElement);
  const toggle = part(card, '[data-qr]', HTMLButtonElement);
  const id = card.dataset.id;

  if (open && id !== undefined && panel.childElementCount === 0) {
    const qr = createQrElement(buildShareUrl(id));
    if (qr !== null) {
      panel.appendChild(qr);
    }
  }

  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
}

function syncToggle(): void {
  list.hidden = !isOpen;
  toggle.setAttribute('aria-expanded', String(isOpen));
  setText(toggleLabel, isOpen ? 'Hide recent' : 'Show recent');
  setText(count, String(cards.size));
}

export function setHistoryOpen(open: boolean): void {
  isOpen = open;
  storeOpen(open);
  if (!open) {
    closeQrPanels();
  }
  syncToggle();
}

function closeQrPanels(): void {
  for (const card of cards.values()) {
    setQrOpen(card, false);
  }
}

function createCard(entry: HistoryEntry): HTMLElement {
  const card = template.content.cloneNode(true) as DocumentFragment;
  const root = card.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error('The #history-card template must hold a single element');
  }

  root.dataset.id = entry.id;
  setText(part(root, '[data-code]', HTMLElement), entry.id);
  return root;
}

function tick(): void {
  for (const card of cards.values()) {
    const remaining = msUntilExpiry(new Date(Number(card.dataset.expiresAt)));
    const expired = remaining === 0;
    const remainingText = part(card, '[data-remaining]', HTMLElement);

    card.classList.toggle('is-expired', expired);
    remainingText.classList.toggle('is-urgent', !expired && remaining < URGENT_THRESHOLD_MS);
    setText(remainingText, expired ? 'Expired' : `Expires in ${formatRemaining(remaining)}`);

    for (const selector of ACTION_SELECTORS) {
      part(card, selector, HTMLButtonElement).disabled = expired;
    }

    if (expired) {
      setQrOpen(card, false);
    }
  }
}

function syncTimer(): void {
  if (cards.size === 0) {
    if (handle !== undefined) {
      window.clearInterval(handle);
      handle = undefined;
    }
    return;
  }

  handle ??= window.setInterval(tick, TICK_MS);
}

export function renderHistory(entries: HistoryEntry[]): void {
  const ordered: HTMLElement[] = [];

  for (const entry of entries) {
    const card = cards.get(entry.id) ?? createCard(entry);
    card.dataset.expiresAt = String(entry.expiresAt.getTime());
    cards.set(entry.id, card);
    ordered.push(card);
  }

  const kept = new Set(entries.map((entry) => entry.id));
  for (const id of [...cards.keys()]) {
    if (!kept.has(id)) {
      cards.delete(id);
    }
  }

  list.replaceChildren(...ordered);
  syncToggle();
  tick();
  syncTimer();
}

function cardButton(id: string, selector: string): HTMLButtonElement | null {
  const card = cards.get(id);
  return card === undefined ? null : part(card, selector, HTMLButtonElement);
}

export async function copyHistoryCode(id: string): Promise<void> {
  await navigator.clipboard.writeText(id);
  const button = cardButton(id, '[data-copy]');
  if (button !== null) {
    showButtonSuccess(button);
  }
}

export async function shareHistoryLink(id: string): Promise<boolean> {
  const url = buildShareUrl(id);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ url });
      return false;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false;
      }
    }
  }

  await navigator.clipboard.writeText(url);
  const button = cardButton(id, '[data-share]');
  if (button !== null) {
    showButtonSuccess(button);
  }
  return true;
}

export interface HistoryHandlers {
  onCopy: (id: string) => void;
  onShare: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function initHistory({ onCopy, onShare, onDismiss }: HistoryHandlers): void {
  toggle.addEventListener('click', () => {
    setHistoryOpen(!isOpen);
  });

  list.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest('button');
    const card = event.target.closest('li');
    if (button === null || !(card instanceof HTMLElement)) {
      return;
    }

    const id = card.dataset.id;
    if (id === undefined) {
      return;
    }

    if (button.hasAttribute('data-copy')) {
      onCopy(id);
      return;
    }
    if (button.hasAttribute('data-share')) {
      onShare(id);
      return;
    }
    if (button.hasAttribute('data-qr')) {
      const closed = part(card, '[data-qr-panel]', HTMLElement).hidden !== false;
      closeQrPanels();
      setQrOpen(card, closed);
      return;
    }
    if (button.hasAttribute('data-dismiss')) {
      onDismiss(id);
    }
  });

  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !list.contains(event.target)) {
      closeQrPanels();
    }
  });

  syncToggle();
}
