import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const ICONS_DIR = join(
  dirname(createRequire(import.meta.url).resolve('lucide-static/package.json')),
  'icons',
);

const ICON_PLACEHOLDER = /<i\s+([^>]*?)\bdata-lucide="([a-z0-9-]+)"([^>]*?)>\s*<\/i>/g;

function lucideIcons(): Plugin {
  return {
    name: 'lucide-icons',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(ICON_PLACEHOLDER, (_match, before: string, name: string, after: string) => {
          let icon: string;
          try {
            icon = readFileSync(join(ICONS_DIR, `${name}.svg`), 'utf8');
          } catch {
            throw new Error(`Unknown lucide icon "${name}" referenced in index.html.`);
          }

          const attributes = `${before} ${after}`.trim().replace(/\s+/g, ' ');

          return icon
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(
              /<svg\b[^>]*>/,
              (openTag) =>
                `<svg ${attributes}` +
                openTag.slice(4, -1).replace(/\s+(?:class|width|height|xmlns)="[^"]*"/g, '') +
                '>',
            )
            .replace(/\s*\n\s*/g, ' ')
            .trim();
        });
      },
    },
  };
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, '.', 'VITE_');
    const missing = REQUIRED_ENV.filter((name) => !env[name]);
    if (missing.length > 0) {
      throw new Error(
        `Missing environment variables for the build: ${missing.join(', ')}. ` +
          'Copy .env.example to .env, or define them in the CI environment.',
      );
    }
  }

  return {
    base: './',
    plugins: [lucideIcons(), tailwindcss()],
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
