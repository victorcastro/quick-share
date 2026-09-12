export const PLACEHOLDER_PHRASES: readonly string[] = [
  'Paste something worth sharing',
  'Paste it. Share it. Done',
  'Drop your text right here',
  'Paste now, share in seconds',
  'Turn this text into a link',
  'Paste once, share anywhere',
  'Your text is ready to travel',
  'Share a thought for ten minutes',
  'Send it before it disappears',
  'Paste. Generate. Share',
  'A quick paste, a quick share',
  'Got text? Drop it here',
  'Share text without signing up',
  'Paste a note for someone',
  'Make this text easy to share',
  'One paste away from sharing',
  'Paste it, then send the QR',
  'Share by link, code, or QR',
  'Let them scan and read',
  'Your QR is one paste away',
  'Paste here and get a QR',
  'Send a QR, skip the copy',
  'Share it with anyone you choose',
  'For their eyes, for ten minutes',
  'A short-lived link for your text',
  'Share now, let it expire later',
  'Ten minutes to pass it on',
  'Your text vanishes on schedule',
  'Temporary text, effortless sharing',
  'Quick to share, built to expire',
  'No account. Just paste and share',
  'No setup. Paste and send',
  'No history. No strings attached',
  'Share without leaving a trail',
  'A private moment for your words',
  'Paste it now, let it fade later',
  'Write less. Share faster',
  'From clipboard to QR in seconds',
  'One code connects them to your text',
  'Put it here. Send it anywhere',
];

const TYPE_MS = 100;
const DELETE_MS = 25;
const HOLD_MS = 2500;
const PAUSE_MS = 400;
const ELLIPSIS = '...';

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

export function initTypewriter(
  target: HTMLTextAreaElement,
  phrases: readonly string[] = PLACEHOLDER_PHRASES,
): void {
  let queue = shuffle(phrases);
  let queueIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const nextPhrase = (): string => {
    if (queueIndex >= queue.length) {
      queue = shuffle(phrases);
      queueIndex = 0;
    }
    const phrase = queue[queueIndex] ?? '';
    queueIndex += 1;
    return phrase;
  };

  let currentPhrase = nextPhrase();

  const tick = (): void => {
    const full = `${currentPhrase}${ELLIPSIS}`;
    if (!deleting) {
      charIndex += 1;
      target.placeholder = full.slice(0, charIndex);
      if (charIndex >= full.length) {
        deleting = true;
        window.setTimeout(tick, HOLD_MS);
        return;
      }
      window.setTimeout(tick, TYPE_MS);
      return;
    }

    charIndex -= 1;
    target.placeholder = full.slice(0, charIndex);
    if (charIndex <= 0) {
      deleting = false;
      currentPhrase = nextPhrase();
      window.setTimeout(tick, PAUSE_MS);
      return;
    }
    window.setTimeout(tick, DELETE_MS);
  };

  tick();
}
