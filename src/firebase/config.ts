// Ponto de entrada único do Firebase na app. Importa daqui `db` e `auth`.
// A inicialização da app está em `app.ts`; o Auth está em `authInstance.ts`
// (web) / `authInstance.native.ts` (iOS/Android, com persistência da sessão).
import { getFirestore } from 'firebase/firestore';
import app from './app';

export { auth } from './authInstance';
export const db = getFirestore(app);
export default app;
