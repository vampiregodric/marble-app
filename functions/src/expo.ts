// Cliente mínimo do Expo Push Service (https://docs.expo.dev/push-notifications/sending-notifications/).
// Sem SDK: são dois endpoints HTTPS e o Node 22 tem fetch. Um token
// "ExponentPushToken[...]" identifica um telemóvel com a app instalada e as
// notificações ativas; o Expo entrega via FCM (Android) / APNs (iOS).

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const CHUNK = 100;

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  // Só strings: viaja no payload do sistema e a app lê-o ao tocar.
  data?: Record<string, string>;
  sound?: 'default' | null;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
};

export type PushTicket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } };

export type PushReceipt = { status: 'ok' } | { status: 'error'; message: string; details?: { error?: string } };

export function isExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

// Erros que significam "este token já não serve" (app desinstalada,
// permissões retiradas) — quem chama tira-o de clients.pushTokens.
export function isDeadTokenError(error: string | undefined): boolean {
  return error === 'DeviceNotRegistered';
}

function headers(accessToken?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (accessToken) h.Authorization = `Bearer ${accessToken}`;
  return h;
}

// Devolve um ticket por mensagem, na mesma ordem. Um erro de rede/HTTP vira
// um ticket de erro em todas as mensagens desse lote (não lança), para o
// doc da notificação ficar sempre com o resultado registado.
export async function sendPush(messages: PushMessage[], accessToken?: string): Promise<PushTicket[]> {
  const tickets: PushTicket[] = [];
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const res = await fetch(SEND_URL, { method: 'POST', headers: headers(accessToken), body: JSON.stringify(chunk) });
      const body = (await res.json()) as { data?: PushTicket[]; errors?: { message?: string }[] };
      if (!res.ok || !Array.isArray(body.data)) {
        const msg = body.errors?.[0]?.message ?? `Expo respondeu ${res.status}`;
        tickets.push(...chunk.map(() => ({ status: 'error', message: msg }) as PushTicket));
      } else {
        tickets.push(...body.data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      tickets.push(...chunk.map(() => ({ status: 'error', message: msg }) as PushTicket));
    }
  }
  return tickets;
}

// Recibos ficam disponíveis ~15 min depois do envio e o Expo guarda-os 24 h.
// IDs sem recibo (ainda não processados) não vêm na resposta.
export async function getReceipts(ids: string[], accessToken?: string): Promise<Record<string, PushReceipt>> {
  const out: Record<string, PushReceipt> = {};
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const res = await fetch(RECEIPTS_URL, { method: 'POST', headers: headers(accessToken), body: JSON.stringify({ ids: chunk }) });
    if (!res.ok) throw new Error(`Expo (recibos) respondeu ${res.status}`);
    const body = (await res.json()) as { data?: Record<string, PushReceipt> };
    Object.assign(out, body.data ?? {});
  }
  return out;
}
