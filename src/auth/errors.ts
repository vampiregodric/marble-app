import { FirebaseError } from 'firebase/app';
import { S } from '../i18n';

// Traduz os códigos de erro do Firebase Auth para mensagens curtas no
// idioma da app (src/i18n). Nota: os projetos Firebase novos têm "proteção
// contra enumeração de emails" ligada — password errada e email inexistente
// dão ambos `invalid-credential`.
export function authErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : '';
  const t = S.errors.auth;
  switch (code) {
    case 'auth/invalid-email':
      return t.invalidEmail;
    case 'auth/missing-password':
      return t.missingPassword;
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return t.wrongCredentials;
    case 'auth/email-already-in-use':
      return t.emailInUse;
    case 'auth/weak-password':
      return t.weakPassword;
    case 'auth/too-many-requests':
      return t.tooManyRequests;
    case 'auth/network-request-failed':
      return S.common.offline;
    case 'auth/user-disabled':
      return t.userDisabled;
    case 'auth/requires-recent-login':
      return t.recentLogin;
    default:
      return S.common.somethingWrong;
  }
}
