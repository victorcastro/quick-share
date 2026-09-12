export const PLACEHOLDER_PHRASES: readonly string[] = [
  'Text here',
  'Every snip expires in 10 minutes',
  'No sign-up. No login. Just paste',
  'Codes look like aKxP-428',
  'Share the link, or just the code',
  'Scan the QR to open it on your phone',
  'Nothing outlives the timer',
  'Case matters — type the code exactly',
  'Paste a share link, we pull the code out',
  'Up to 10,000 characters per snip',
  'No history. No account. No trace',
  'The code never touches your Referer header',
  'I, l, O and o never appear in a code',
  "Ctrl+V, then share. That's the whole workflow",
  'Your browser talks to Firestore directly',
  'Press Enter to jump straight into a code',
  'Dark mode remembers your choice',
  'One paste, one code, one expiry',
  'The clock starts the moment you share',
  'Cmd+A, Cmd+C — old habits still work here',
  'Tab cycles through every control',
  'Esc closes the QR popover',
  'Refresh the page — your snip is still safe',
  'Nothing is stored longer than it has to be',
  'Done is better than perfect',
  'Small steps, every day',
  'Simplicity is the ultimate sophistication',
  'Less, but better',
  'Make it work, then make it disappear',
  'Speed is a feature',
  'The best interface is no interface',
  'Say it once, then let it go',
  'Some things are worth forgetting',
  'Ephemeral by design, not by accident',
  'Ten minutes is plenty',
  'Write it, send it, forget it',
  'Your words, briefly immortal',
  'This message will self-destruct... on schedule',
  'No cloud remembers what expires',
  'Type. Share. Vanish',
];

const TYPE_MS = 45;
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
