import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getCountFromServer, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, Work, WorkServiceId, workServiceLabel } from '../firebase/models';
import { useFirestoreDoc, useFirestoreList, DocState, ListState } from './firestoreHooks';
import { S } from '../i18n';

// Leitura do portfólio. As queries em `works` TÊM de incluir
// where('published', '==', true): as regras (firestore.rules) só deixam ler
// trabalhos publicados e recusam qualquer query que não o garanta.
// Índices compostos correspondentes em firestore.indexes.json.

const worksCol = collection(db, COLLECTIONS.works);
// Contagem do cabeçalho do Portfólio: uma leitura, não W documentos.
const publishedCount = query(worksCol, where('published', '==', true));

// Trabalhos por página do Portfólio (DES-01).
export const WORKS_PAGE = 30;

export type PublishedWorks = ListState<Work> & {
  // Total de trabalhos publicados, venha ou não tudo na lista (o cabeçalho
  // mostra-o); null enquanto não se sabe ou se a contagem falhar.
  total: number | null;
  // Há mais para lá do que já veio.
  hasMore: boolean;
  // Uma página nova está a caminho (a lista mantém o que já tinha).
  loadingMore: boolean;
  loadMore: () => void;
};

// Trabalhos publicados, mais recentes primeiro, `pageSize` de cada vez
// (DES-01 da auditoria de 2026-09-12: antes lia a coleção inteira a cada
// abertura). É UMA escuta cujo limite cresce em `loadMore()` (30 → 60 →
// 90…): o SDK reabre-a com o limite novo e o ecrã mantém o que já tinha até
// o snapshot seguinte chegar. Preferiu-se isto a uma escuta por página com
// `startAfter`: em tempo real, um trabalho publicado a meio desloca a
// fronteira entre páginas e um item desaparecia até recarregar; aqui há uma
// lista só, e reler as primeiras N ao crescer custa nada à escala da Marble
// (dezenas de trabalhos). O filtro por categoria/serviço/marca continua em
// memória, sobre o que já veio — o Portfólio pede mais quando chega ao fim
// ou quando o recorte fica vazio. Passar a filtrar na query (dois índices
// novos) só quando o volume o pedir.
// O total do cabeçalho vem do servidor (`getCountFromServer`, uma leitura)
// só quando a lista está cheia; se vieram menos do que o limite, o total é
// o tamanho da lista.
export function usePublishedWorks(pageSize = WORKS_PAGE): PublishedWorks {
  const [max, setMax] = useState(pageSize);
  const q = useMemo(() => query(worksCol, where('published', '==', true), orderBy('completedAt', 'desc'), limit(max)), [max]);
  const state = useFirestoreList<Work>(q);
  const [total, setTotal] = useState<number | null>(null);
  const full = state.data.length >= max;

  useEffect(() => {
    // Enquanto uma página nova está a caminho, `data` é a anterior — espera.
    if (state.loading) return;
    if (!full) {
      setTotal(state.data.length);
      return;
    }
    let alive = true;
    getCountFromServer(publishedCount)
      .then((snap) => {
        if (alive) setTotal(snap.data().count);
      })
      .catch(() => {
        if (alive) setTotal(null);
      });
    return () => {
      alive = false;
    };
  }, [state.data, state.loading, full]);

  // Só cresce quando a página atual já chegou cheia — dois pedidos seguidos
  // (fim da lista e recorte vazio) não saltam uma página.
  const lengthRef = useRef(0);
  lengthRef.current = state.data.length;
  const loadMore = useCallback(() => setMax((m) => (lengthRef.current >= m ? m + pageSize : m)), [pageSize]);

  const loadingMore = state.loading && state.data.length > 0;
  return {
    data: state.data,
    // `loading` só na primeira carga: ao crescer, o ecrã mantém a grelha.
    loading: state.loading && state.data.length === 0,
    error: state.error,
    total,
    hasMore: !state.loading && (total !== null ? state.data.length < total : full),
    loadingMore,
    loadMore,
  };
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

// Uma tag do Detalhe (Secção 13). `service` = sistema/serviço da lista fixa
// (WORK_SERVICES), `brand` = marca em texto, `product` = "marca · item" dos
// trabalhos anteriores à Secção 13 ainda por migrar.
export type WorkTag = {
  key: string;
  kind: 'service' | 'brand' | 'product';
  text: string;
  detail?: string;
  // Só nas tags `service`: o id, para o Detalhe abrir o Portfólio filtrado
  // (Secção 17). A marca vai pelo próprio `text`.
  serviceId?: WorkServiceId;
};

// Tags de um trabalho pela ordem pedida pelo Fábio: sistema/serviço
// primeiro, marcas depois. Sem tags, cai em `products` (legado) — assim um
// trabalho antigo nunca fica sem chips até ser migrado
// (scripts/migrate-work-tags.mjs, ou o formulário do backoffice ao guardar).
export function workTags(work: Work): WorkTag[] {
  const services = (work.services ?? []).filter((id): id is WorkServiceId => typeof id === 'string' && id.length > 0);
  const brands = (work.brands ?? []).map((b) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean);
  if (services.length > 0 || brands.length > 0) {
    return [
      // Rótulo no idioma da app; um id desconhecido (backoffice mais novo do
      // que a app) cai no rótulo PT de models.ts ou no próprio id.
      ...services.map((id): WorkTag => ({ key: `s-${id}`, kind: 'service', serviceId: id, text: (S.workServices as Record<string, string>)[id] ?? workServiceLabel(id) })),
      ...brands.map((b, i): WorkTag => ({ key: `b-${i}-${b}`, kind: 'brand', text: b })),
    ];
  }
  return (work.products ?? [])
    .filter((p) => p && (p.brand?.trim() || p.item?.trim()))
    .map((p, i): WorkTag => ({
      key: `p-${i}-${p.brand}`,
      kind: 'product',
      text: p.brand?.trim() || p.item.trim(),
      detail: p.brand?.trim() && p.item?.trim() ? p.item.trim() : undefined,
    }));
}

// Trabalhos que têm um dado sistema/serviço (filtro secundário do Portfólio).
export function hasService(work: Work, id: WorkServiceId): boolean {
  return Array.isArray(work.services) && work.services.includes(id);
}

// ---------- Marcas (Secção 17) ----------

// Chave de comparação de uma marca. `works.brands` é texto livre escrito no
// backoffice, por isso "Inozetek", "inozetek " e o `?brand=inozetek` de um
// URL à mão têm de cair na mesma marca: sem espaços à volta e sem
// maiúsculas. O que se mostra continua a ser a grafia do trabalho.
export function brandKey(brand: string): string {
  return brand.trim().toLocaleLowerCase();
}

// Trabalhos que têm uma dada marca (terceira fila do Portfólio).
export function hasBrand(work: Work, key: string): boolean {
  return Array.isArray(work.brands) && work.brands.some((b) => typeof b === 'string' && brandKey(b) === key);
}

export type BrandOption = {
  key: string;
  // Grafia a mostrar: a do trabalho mais recente que a usa.
  label: string;
  count: number;
};

// Marcas com trabalhos num recorte do Portfólio (categoria e, dentro dela,
// serviço — ou "Todos"): mais trabalhos primeiro, empates por ordem
// alfabética (decisão do Fábio, 2026-09-07). Cada trabalho conta uma vez
// por marca; trabalhos sem marca não entram em lado nenhum. Recebe a lista
// já ordenada do mais recente para o mais antigo.
export function brandOptions(works: Work[]): BrandOption[] {
  const found = new Map<string, BrandOption>();
  for (const w of works) {
    const seen = new Set<string>();
    for (const raw of w.brands ?? []) {
      if (typeof raw !== 'string') continue;
      const label = raw.trim();
      const key = brandKey(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const cur = found.get(key);
      if (cur) cur.count += 1;
      else found.set(key, { key, label, count: 1 });
    }
  }
  return [...found.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
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
