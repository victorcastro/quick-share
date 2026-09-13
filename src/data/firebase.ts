import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, measurementId, recaptchaSiteKey } from './firebase-env';

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
  }
}

if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
}

const app = initializeApp(firebaseConfig);

initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
  isTokenAutoRefreshEnabled: true,
});

if (import.meta.env.PROD && measurementId !== undefined) {
  void isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

export const db = getFirestore(app);
