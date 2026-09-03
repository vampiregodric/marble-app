import { useEffect, useState } from 'react';
import { onSnapshot, DocumentReference, FirestoreError, Query } from 'firebase/firestore';

// Hooks genéricos de leitura em tempo real. Os hooks por coleção
// (works.ts, events.ts, ...) constroem a query e passam-na para aqui.
//
// Os ecrãs recebem sempre { data, loading, error } e decidem o que mostrar:
// spinner enquanto `loading`, estado vazio quando `data` está vazio, mensagem
// quando `error` (regras/índices/offline). Nunca fica um ecrã em branco.

export type ListState<T> = {
  data: T[];
  loading: boolean;
  error: FirestoreError | null;
};

export type DocState<T> = {
  data: T | null;
  loading: boolean;
  // true quando o doc não existe OU as regras negam a leitura (ex: trabalho
  // não publicado) — para o ecrã, é a mesma coisa: "não disponível".
  missing: boolean;
  error: FirestoreError | null;
};

function withId<T>(id: string, data: unknown): T {
  return { id, ...(data as object) } as T;
}

// `query` a null significa "ainda não há o que ler" (ex: sem sessão) —
// devolve lista vazia sem loading, sem abrir listener.
export function useFirestoreList<T>(query: Query | null): ListState<T> {
  const [state, setState] = useState<ListState<T>>({ data: [], loading: !!query, error: null });

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    return onSnapshot(
      query,
      (snap) => setState({ data: snap.docs.map((d) => withId<T>(d.id, d.data())), loading: false, error: null }),
      (error) => setState({ data: [], loading: false, error })
    );
  }, [query]);

  return state;
}

export function useFirestoreDoc<T>(ref: DocumentReference | null): DocState<T> {
  const [state, setState] = useState<DocState<T>>({ data: null, loading: !!ref, missing: false, error: null });

  useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, missing: true, error: null });
      return;
    }
    setState({ data: null, loading: true, missing: false, error: null });
    return onSnapshot(
      ref,
      (snap) =>
        setState(
          snap.exists()
            ? { data: withId<T>(snap.id, snap.data()), loading: false, missing: false, error: null }
            : { data: null, loading: false, missing: true, error: null }
        ),
      (error) =>
        setState({
          data: null,
          loading: false,
          missing: error.code === 'permission-denied',
          error: error.code === 'permission-denied' ? null : error,
        })
    );
  }, [ref]);

  return state;
}
