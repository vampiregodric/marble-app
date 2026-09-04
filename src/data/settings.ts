import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, HomeSettings } from '../firebase/models';
import { useFirestoreDoc, DocState } from './firestoreHooks';

// Definições do ecrã Início escolhidas pela equipa no backoffice
// (settings/home): por agora, a foto de cada cartão de departamento.
// Leitura pública (firestore.rules). Doc inexistente → `missing`, e os
// cartões mostram o gradiente.
export function useHomeSettings(): DocState<HomeSettings> {
  const ref = useMemo(() => doc(db, COLLECTIONS.settings, 'home'), []);
  return useFirestoreDoc<HomeSettings>(ref);
}
