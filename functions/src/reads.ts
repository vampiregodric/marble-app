import { Firestore } from 'firebase-admin/firestore';

// Leituras em bloco (auditoria 2026-09-12, Pacote 10): em vez de um `get()`
// por documento dentro de um ciclo, junta-se tudo o que é preciso e lê-se
// de uma vez — `getAll` para ids conhecidos, `where in` para "todos os X
// destes clientes". Os limites são do Firestore: 30 valores por `in`;
// `getAll` não tem limite documentado, 300 de cada vez é conservador.

export const IN_LIMIT = 30;
const GET_ALL_CHUNK = 300;

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function uniqueIds(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

// Documentos por id (os que não existem ficam de fora do mapa).
export async function getAllByIds<T extends { id: string }>(db: Firestore, collection: string, ids: (string | null | undefined)[]): Promise<Map<string, T>> {
  const out = new Map<string, T>();
  for (const part of chunk(uniqueIds(ids), GET_ALL_CHUNK)) {
    const snaps = await db.getAll(...part.map((id) => db.collection(collection).doc(id)));
    for (const s of snaps) if (s.exists) out.set(s.id, { id: s.id, ...s.data() } as T);
  }
  return out;
}

// Todos os documentos cujo `field` é um dos valores (lotes de 30).
export async function queryIn<T extends { id: string }>(db: Firestore, collection: string, field: string, values: (string | null | undefined)[]): Promise<T[]> {
  const out: T[] = [];
  for (const part of chunk(uniqueIds(values), IN_LIMIT)) {
    const snap = await db.collection(collection).where(field, 'in', part).get();
    for (const d of snap.docs) out.push({ id: d.id, ...d.data() } as T);
  }
  return out;
}
