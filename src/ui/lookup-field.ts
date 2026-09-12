import { maskCaret, maskId, type MaskOptions } from '../core/mask';
import { requireElement } from './dom';

const field = requireElement('lookup-field', HTMLElement);
const input = requireElement('lookup', HTMLInputElement);
const pasteButton = requireElement('lookup-paste', HTMLButtonElement);
const clearButton = requireElement('lookup-clear', HTMLButtonElement);
const submitButton = requireElement('read', HTMLButtonElement);

function syncButtons(): void {
  const empty = input.value.length === 0;
  pasteButton.hidden = !empty;
  clearButton.hidden = empty;
  submitButton.hidden = empty;
  submitButton.disabled = empty;
}

export function markLookupInvalid(): void {
  field.classList.remove('is-invalid');
  void field.offsetWidth;

  field.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
}

export function clearLookupInvalid(): void {
  field.classList.remove('is-invalid');
  input.removeAttribute('aria-invalid');
}

export function setLookupValue(id: string): void {
  input.value = id;
  syncButtons();
}

export function setLookupBusy(busy: boolean): void {
  if (busy) {
    submitButton.disabled = true;
    return;
  }
  syncButtons();
}

function applyMask(event: Event): void {
  clearLookupInvalid();

  const isDeletion = event instanceof InputEvent && event.inputType.startsWith('delete');
  const options: MaskOptions = { appendSeparator: !isDeletion };

  const caret = input.selectionStart ?? input.value.length;
  const textBeforeCaret = input.value.slice(0, caret);
  const masked = maskId(input.value, options);

  if (masked !== input.value) {
    input.value = masked;
    const nextCaret = Math.min(maskCaret(textBeforeCaret, options), masked.length);
    input.setSelectionRange(nextCaret, nextCaret);
  }

  syncButtons();
}

export function pasteIntoLookup(text: string): void {
  clearLookupInvalid();
  input.value = maskId(text);
  syncButtons();
  input.focus();
}

export interface LookupFieldHandlers {
  onSubmit: (rawId: string) => void;
  onClear: () => void;
  onPaste: () => void;
}

export function initLookupField({ onSubmit, onClear, onPaste }: LookupFieldHandlers): void {
  input.addEventListener('input', applyMask);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      onSubmit(input.value);
    }
  });

  submitButton.addEventListener('click', () => {
    onSubmit(input.value);
  });

  pasteButton.addEventListener('click', onPaste);

  clearButton.addEventListener('click', () => {
    input.value = '';
    clearLookupInvalid();
    syncButtons();
    onClear();
    input.focus();
  });

  syncButtons();
}
