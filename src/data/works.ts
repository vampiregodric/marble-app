import { useMemo } from 'react';
import { collection, doc, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, Work } from '../firebase/models';
import { useFirestoreDoc, useFirestoreList, DocState, ListState } from './firestoreHooks';

// Leitura do portfólio. As queries em `works` TÊM de incluir
// where('published', '==', true): as regras (firestore.rules) só deixam ler
// trabalhos publicados e recusam qualquer query que não o garanta.
// Índices compostos correspondentes em firestore.indexes.json.

const worksCol = collection(db, COLLECTIONS.works);

// Todos os trabalhos publicados, mais recentes primeiro. O filtro por
// categoria faz-se no ecrã (uma só escuta; mudar de chip é instantâneo e o
// cabeçalho mostra o total).
export function usePublishedWorks(): ListState<Work> {
  const q = useMemo(() => query(worksCol, where('published', '==', true), orderBy('completedAt', 'desc')), []);
  return useFirestoreList<Work>(q);
}

// Destaques escolhidos pela equipa para o carrossel do Início.
export function useFeaturedWorks(max = 5): ListState<Work> {
  const q = useMemo(
    () =>
      query(
        worksCol,
        where('featured', '==', true),
        where('published', '==', true),
        orderBy('completedAt', 'desc'),
        limit(max)
      ),
    [max]
  );
  return useFirestoreList<Work>(q);
}

// Um trabalho pelo ID. `missing` cobre "não existe" e "não publicado".
export function useWork(workId: string | undefined): DocState<Work> {
  const ref = useMemo(() => (workId ? doc(worksCol, workId) : null), [workId]);
  return useFirestoreDoc<Work>(ref);
}
