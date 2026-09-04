import { Platform } from 'react-native';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebase/config';

// Entrar SEM password, só no browser e só no projeto de DESENVOLVIMENTO
// (id a acabar em "-dev"): abre-se http://localhost:8082/#token=<custom
// token> gerado por `node scripts/dev-token.mjs`. Serve para o Claude (ou
// tu) verificar os ecrãs com sessão — Alertas, Perfil — sem escrever a
// password de ninguém. Mesma ideia que o backoffice (LoginPage). Em builds
// de produção é código morto: o projeto não acaba em "-dev".

const isDevProject = (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '').endsWith('-dev');

export async function signInWithDevTokenFromUrl(): Promise<boolean> {
  if (Platform.OS !== 'web' || !isDevProject || typeof window === 'undefined') return false;
  const match = /[#&]token=([^&]+)/.exec(window.location.hash);
  if (!match) return false;
  // Tira o token do URL antes de qualquer coisa, para não ficar no histórico.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  await signInWithCustomToken(auth, decodeURIComponent(match[1]));
  return true;
}
