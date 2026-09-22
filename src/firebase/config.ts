// Ponto de entrada único do Firebase na app. Importa daqui `db` e `auth`.
// A inicialização da app está em `app.ts`; o Auth está em `authInstance.ts`
// (web) / `authInstance.native.ts` (iOS/Android, com persistência da sessão).
//
// Versão WEB (o Metro escolhe `config.native.ts` em iOS/Android). O Firestore
// fica com cache persistente (IndexedDB), partilhada entre separadores: sem
// ela cada abertura da app relia tudo do servidor (DES-13 da auditoria de
// 2026-09-12); com ela a leitura seguinte vem da cache e só se sincroniza o
// que mudou. Num browser sem IndexedDB o SDK avisa na consola e cai para a
// cache em memória — a app funciona na mesma. Atenção ao que já se sabia da
// cache em memória: um snapshot com `metadata.fromCache` pode dizer "não
// existe" antes de o servidor responder (ver AuthContext, "criar se faltar").
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import app from './app';

export { auth } from './authInstance';
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export default app;
