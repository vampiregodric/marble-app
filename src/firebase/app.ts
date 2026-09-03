import { initializeApp, getApps, getApp } from 'firebase/app';

// Config vem de variáveis de ambiente EXPO_PUBLIC_* (ver .env / .env.production).
// `npx expo start` lê `.env` → projeto marble-studios-dev.
// Uma build de produção (EAS build --profile production) lê `.env.production`
// → projeto marble-studios-prod. Nunca trocar isto à mão aqui — ver DEVELOPMENT.md.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'TODO') {
  throw new Error(
    'Config do Firebase em falta. Preenche .env com os valores do projeto marble-studios-dev ' +
      '(Firebase Console > Definições do projeto > Geral > As tuas apps) — ver DEVELOPMENT.md.'
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export default app;
