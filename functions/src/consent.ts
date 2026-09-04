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
