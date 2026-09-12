import { msUntilExpiry } from '../core/expiration';
import { requireElement, setText } from './dom';

const URGENT_THRESHOLD_MS = 60_000;
const TICK_MS = 1000;

const countdown = requireElement('result-countdown', HTMLElement);

let handle: number | undefined;

function format(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

export function stopCountdown(): void {
  if (handle !== undefined) {
    window.clearInterval(handle);
    handle = undefined;
  }
  countdown.classList.remove('is-urgent');
  setText(countdown, '');
}

export function startCountdown(id: string, expiresAt: Date, onExpire: () => void): void {
  stopCountdown();

  const code = document.createElement('strong');
  code.className = 'font-semibold';
  code.textContent = id;
  const remainingText = document.createTextNode('');

  const tick = (): void => {
    const remaining = msUntilExpiry(expiresAt);
    if (remaining === 0) {
      stopCountdown();
      onExpire();
      return;
    }
    countdown.classList.toggle('is-urgent', remaining < URGENT_THRESHOLD_MS);
    remainingText.data = ` expires in ${format(remaining)}`;
    if (!countdown.contains(code)) {
      countdown.replaceChildren(code, remainingText);
    }
  };

  tick();
  handle = window.setInterval(tick, TICK_MS);
}
