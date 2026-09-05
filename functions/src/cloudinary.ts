// Admin API do Cloudinary, só para APAGAR ficheiros que a app carregou: a
// foto de perfil (tag `uid_<uid>`, Secção 5b) e as fotos de um pedido de
// orçamento (tag `request_<id>`, Secção 7). A app e o backoffice fazem
// uploads "unsigned" e nunca conseguem apagar; apagar exige a API key +
// secret, que só existem aqui, em segredos das Functions. A política de
// privacidade promete que o ficheiro sai do alojamento em 30 dias — isto
// fá-lo em segundos.

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function avatarTag(uid: string): string {
  return `uid_${uid}`;
}

// public_id a partir de um URL de entrega gerado por src/media/cloudinary.ts
// da app: .../image/upload/<transformações>/v<versão>/<public_id>[.ext].
// A pasta faz parte do public_id (ex: "avatars/abc123"). null se não parece
// um URL do Cloudinary.
export function publicIdFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = /\/image\/upload\/(.+)$/.exec(url.trim());
  if (!m) return null;
  let rest = m[1].split('?')[0];
  const parts = rest.split('/').filter(Boolean);
  // Segmentos de transformação têm vírgulas ou são "a_b" curtos; a versão é "v123".
  while (parts.length > 1 && (parts[0].includes(',') || /^v\d+$/.test(parts[0]) || /^[a-z]{1,2}_[^/]+$/.test(parts[0]))) {
    parts.shift();
  }
  rest = parts.join('/');
  if (!rest) return null;
  // Tira a extensão só no último segmento.
  return rest.replace(/\.[a-z0-9]{2,5}$/i, '');
}

function authHeader(cfg: CloudinaryConfig): string {
  return 'Basic ' + Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString('base64');
}

async function listByTag(cfg: CloudinaryConfig, tag: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/image/tags/${encodeURIComponent(tag)}`);
    url.searchParams.set('max_results', '100');
    if (cursor) url.searchParams.set('next_cursor', cursor);
    const res = await fetch(url, { headers: { Authorization: authHeader(cfg) } });
    if (res.status === 404) return ids; // tag sem recursos
    if (!res.ok) throw new Error(`Cloudinary (listar por tag) respondeu ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { resources?: { public_id: string }[]; next_cursor?: string };
    ids.push(...(body.resources ?? []).map((r) => r.public_id));
    cursor = body.next_cursor;
  } while (cursor);
  return ids;
}

async function deleteByPublicIds(cfg: CloudinaryConfig, publicIds: string[]): Promise<void> {
  for (let i = 0; i < publicIds.length; i += 100) {
    const params = new URLSearchParams();
    for (const id of publicIds.slice(i, i + 100)) params.append('public_ids[]', id);
    params.set('invalidate', 'true'); // limpa também as cópias na CDN
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/image/upload`, {
      method: 'DELETE',
      headers: { Authorization: authHeader(cfg), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) throw new Error(`Cloudinary (apagar) respondeu ${res.status}: ${await res.text()}`);
  }
}

// Apaga todos os ficheiros com uma tag, exceto `keepPublicId`. Devolve
// quantos apagou.
export async function deleteFilesByTag(cfg: CloudinaryConfig, tag: string, keepPublicId?: string | null): Promise<number> {
  const ids = (await listByTag(cfg, tag)).filter((id) => id !== keepPublicId);
  if (ids.length) await deleteByPublicIds(cfg, ids);
  return ids.length;
}

// Foto de perfil: todos os ficheiros do cliente, exceto a foto atual
// (quando trocou em vez de remover).
export async function deleteAvatarFiles(cfg: CloudinaryConfig, uid: string, keepPublicId?: string | null): Promise<number> {
  return deleteFilesByTag(cfg, avatarTag(uid), keepPublicId);
}
