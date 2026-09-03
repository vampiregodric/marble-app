import { useMemo } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, MarbleEvent } from '../firebase/models';
import { useFirestoreList, ListState } from './firestoreHooks';
import { startOfToday } from '../utils/dates';

// Todos os eventos, numa só escuta, ordenados por data. A divisão
// Próximos/Passados faz-se aqui em memória — a lista é pequena e assim trocar
// de filtro é instantâneo. Um evento de hoje conta como "próximo".
export function useEvents(): ListState<MarbleEvent> & { upcoming: MarbleEvent[]; past: MarbleEvent[] } {
  const q = useMemo(() => query(collection(db, COLLECTIONS.events), orderBy('date', 'desc')), []);
  const state = useFirestoreList<MarbleEvent>(q);

  const { upcoming, past } = useMemo(() => {
    const cutoff = startOfToday().getTime();
    const upcoming: MarbleEvent[] = [];
    const past: MarbleEvent[] = [];
    for (const e of state.data) {
      (e.date && e.date.toMillis() >= cutoff ? upcoming : past).push(e);
    }
    // Próximos: o mais perto primeiro. Passados: o mais recente primeiro (já vem).
    upcoming.reverse();
    return { upcoming, past };
  }, [state.data]);

  return { ...state, upcoming, past };
}
