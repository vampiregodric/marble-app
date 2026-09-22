import { FieldPath, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { CATEGORY_PREF, Client, MARKETING_NOTIFICATION_TYPES, NotificationType, WorkCategory } from './types';

// As MESMAS regras que o backoffice aplica em writes.ts → sendNotification,
// para as Functions nunca enviarem o que a equipa não poderia enviar à mão:
// - clientes sem conta na app (ficha criada pela equipa, conta apagada ou
//   ficha juntada) não recebem nada — não têm onde ler;
// - tipos de marketing (offer, new_work, event_reminder) exigem
//   consent.marketing; new_work exige ainda a categoria ligada;
// - checkup_reminder e message são operacionais e vão sempre.

export type BlockReason = 'no_account' | 'no_consent' | 'category_off';

export function hasAppAccount(client: Client | null | undefined): boolean {
  return !!client && !client.createdByTeam && !client.deletedAt && !client.mergedInto;
}

export function canReceive(
  client: Client | null | undefined,
  type: NotificationType,
  category?: WorkCategory
): { ok: true } | { ok: false; reason: BlockReason } {
  if (!client || !hasAppAccount(client)) return { ok: false, reason: 'no_account' };
  if (MARKETING_NOTIFICATION_TYPES.has(type)) {
    if (client.consent?.marketing !== true) return { ok: false, reason: 'no_consent' };
    if (type === 'new_work' && category) {
      const pref = CATEGORY_PREF[category];
      if (pref && client.notificationPrefs?.[pref] !== true) return { ok: false, reason: 'category_off' };
    }
  }
  return { ok: true };
}

// Tamanho de cada página = tamanho de cada lote de escrita (o Firestore
// aceita 500 por lote; 450 deixa margem).
export const RECIPIENT_PAGE = 450;

// Quem recebe um alerta de marketing (`new_work` de uma categoria, ou
// `event_reminder`), em páginas prontas para um lote de escrita cada. O
// filtro é feito pelo Firestore — `consent.marketing == true` e, no
// `new_work`, `notificationPrefs.<categoria> == true` (índices compostos
// em firestore.indexes.json) — em vez de ler a coleção `clients` inteira
// e filtrar em memória (auditoria 2026-09-12, DES-04). `canReceive` volta
// a correr em cada página só para os poucos casos que a query não vê
// (ficha da equipa, conta apagada, ficha juntada).
export async function* marketingRecipients(db: Firestore, type: NotificationType, category?: WorkCategory): AsyncGenerator<Client[]> {
  let q = db.collection('clients').where('consent.marketing', '==', true);
  const pref = type === 'new_work' && category ? CATEGORY_PREF[category] : undefined;
  if (pref) q = q.where(`notificationPrefs.${pref}`, '==', true);
  q = q.orderBy(FieldPath.documentId()).limit(RECIPIENT_PAGE);
  let last: QueryDocumentSnapshot | undefined;
  for (;;) {
    const snap = await (last ? q.startAfter(last) : q).get();
    if (snap.empty) return;
    const page = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Client).filter((c) => canReceive(c, type, category).ok);
    if (page.length) yield page;
    if (snap.size < RECIPIENT_PAGE) return;
    last = snap.docs[snap.size - 1];
  }
}
