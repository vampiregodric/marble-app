// Versão WEB. O Metro escolhe `authInstance.native.ts` em iOS/Android.
// No browser o Firebase Auth já persiste a sessão em localStorage por defeito.
import { getAuth } from 'firebase/auth';
import app from './app';

export const auth = getAuth(app);
