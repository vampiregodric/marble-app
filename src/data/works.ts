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

// Destaques escolhidos pela equipa para o carrossel do Início, na ordem que
// ela definiu no ecrã "Destaques" do backoffice (`featuredOrder`, 0 =
// primeiro). O Firestore exclui docs sem esse campo — o backoffice garante
// que todo o trabalho em destaque o tem.
export function useFeaturedWorks(max = 5): ListState<Work> {
  const q = useMemo(
    () =>
      query(
        worksCol,
        where('featured', '==', true),
        where('published', '==', true),
        orderBy('featuredOrder', 'asc'),
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

// Um item da galeria do Detalhe, já normalizado para os componentes
// (WorkGallery, MediaViewer). Vídeo traz sempre `thumbnailUrl` do
// backoffice; se faltar, o cartão mostra o gradiente.
export type GalleryItem = {
  key: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
};

// Itens da galeria de um trabalho: `media[]` por `order`. Sem `media`
// (trabalhos anteriores ao backoffice, ou só com capa) usa-se a capa.
export function galleryItems(work: Work): GalleryItem[] {
  const media = (work.media ?? []).filter((m) => m && typeof m.url === 'string' && m.url.trim());
  if (media.length === 0) {
    const cover = work.photoUrl?.trim();
    return cover ? [{ key: 'cover', type: 'photo', url: cover }] : [];
  }
  return [...media]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .map((m, i) => ({
      key: `${i}-${m.url}`,
      type: m.type === 'video' ? 'video' : 'photo',
      url: m.url.trim(),
      thumbnailUrl: m.thumbnailUrl?.trim() || undefined,
    }));
}
