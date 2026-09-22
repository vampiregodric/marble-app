// Corre `fn` sobre cada item com, no máximo, `limit` a decorrer ao mesmo
// tempo e devolve os resultados NA ORDEM dos itens (o índice de cada
// resultado é o do item), como `Promise.all`. Serve para os uploads das
// fotos de um pedido de orçamento (DES-15 da auditoria de 2026-09-12): três
// em paralelo em vez de uma a uma, sem abrir uma ligação por foto num
// telemóvel com rede fraca. A primeira falha rejeita logo, como o
// `Promise.all`; o que já estava a decorrer termina por si e o ecrã trata o
// erro como antes.
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker);
  await Promise.all(workers);
  return results;
}
