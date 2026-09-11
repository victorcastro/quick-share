import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

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
    plugins: [tailwindcss()],
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
