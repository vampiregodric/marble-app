import { FirebaseError } from 'firebase/app';

// Traduz os códigos de erro do Firebase Auth para mensagens curtas em PT.
// Nota: os projetos Firebase novos têm "proteção contra enumeração de emails"
// ligada — password errada e email inexistente dão ambos `invalid-credential`.
export function authErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Esse email não parece válido.';
    case 'auth/missing-password':
      return 'Escreve a tua password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email ou password errados.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com este email. Entra ou recupera a password.';
    case 'auth/weak-password':
      return 'A password tem de ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiadas tentativas. Espera uns minutos e tenta outra vez.';
    case 'auth/network-request-failed':
      return 'Sem ligação. Verifica a internet e tenta outra vez.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Fala com a Marble Studios.';
    case 'auth/requires-recent-login':
      return 'Por segurança, termina sessão e volta a entrar antes de fazer isto.';
    default:
      return 'Algo correu mal. Tenta outra vez.';
  }
}
