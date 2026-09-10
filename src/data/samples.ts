import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, Sample, WorkCategory } from '../firebase/models';
import { useFirestoreList, ListState } from './firestoreHooks';

// Amostras do simulador "como ficaria" (Secção 16), carregadas pela equipa
// no backoffice (página Amostras). A query TEM de levar
// where('published', '==', true): as regras só deixam ler amostras
// publicadas e recusam a query toda sem isso (como em `works`). Uma escuta
// só; o filtro por categoria e a ordem (`order`, depois nome) fazem-se em
// memória — são poucas dezenas de docs e evita um índice composto.
export function usePublishedSamples(category?: WorkCategory): ListState<Sample> {
  const q = useMemo(() => query(collection(db, COLLECTIONS.samples), where('published', '==', true)), []);
  const state = useFirestoreList<Sample>(q);
  const data = useMemo(
    () =>
      state.data
        .filter((s) => !category || s.category === category)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.name ?? '').localeCompare(b.name ?? '')),
    [state.data, category]
  );
  return { data, loading: state.loading, error: state.error };
}
