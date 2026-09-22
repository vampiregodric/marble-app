// Versão iOS/Android de `config.ts` (o Metro escolhe este ficheiro no
// telemóvel; a web usa `config.ts`). Aqui a cache do Firestore é só em
// memória: o `persistentLocalCache` do SDK JS assenta em IndexedDB, que não
// existe em React Native, e trocar para o SDK nativo só por isto não vale a
// pena (DES-13). A mitigação no telemóvel são os limites das queries
// (`usePublishedWorks` com `limit`, `useNotifications` com 100).
import { getFirestore } from 'firebase/firestore';
import app from './app';

export { auth } from './authInstance';
export const db = getFirestore(app);
export default app;
