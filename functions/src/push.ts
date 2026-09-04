import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { canReceive } from './consent';
import { isDeadTokenError, isExpoPushToken, PushMessage, sendPush } from './expo';
import { AppNotification, Client, NotificationPush } from './types';

// Reage à criação de um doc em `notifications` (venha do backoffice ou de um
// job daqui) e manda o push para os telemóveis do cliente. O doc é a fonte
// de verdade — o push é um acréscimo: sem telemóvel registado, o alerta
// fica só no ecrã Alertas. `team_alert` é interno (aparece no Painel do
// backoffice) e nunca vai a telemóvel nenhum.
//
// Segurança em profundidade: quem criou o doc já aplicou o consentimento,
// mas volta-se a verificar aqui (o cliente pode ter desligado "Ofertas e
// novidades" entre o job e o push).

export type PushOptions = {
  expoAccessToken?: string;
  now?: Date;
};

// O que a app lê ao tocar no push (src/push): só strings.
export function pushData(id: string, n: AppNotification): Record<string, string> {
  const data: Record<string, string> = { notificationId: id, type: n.type };
  if (n.relatedWorkId) data.relatedWorkId = n.relatedWorkId;
  if (n.relatedEventId) data.relatedEventId = n.relatedEventId;
  if (n.relatedVehicleId) data.relatedVehicleId = n.relatedVehicleId;
  if (n.relatedRequestId) data.relatedRequestId = n.relatedRequestId;
  return data;
}

export async function pushNotification(db: Firestore, id: string, n: AppNotification, opts: PushOptions = {}): Promise<NotificationPush | null> {
  if (n.type === 'team_alert') return null;
  if (n.push) return n.push; // já processado (reexecução do trigger)
  const now = opts.now ?? new Date();
  const ref = db.collection('notifications').doc(id);

  const clientSnap = await db.collection('clients').doc(n.clientId).get();
  const client = clientSnap.exists ? ({ id: clientSnap.id, ...clientSnap.data() } as Client) : null;

  const allowed = canReceive(client, n.type);
  let result: NotificationPush;
  if (!allowed.ok || !client) {
    result = { status: 'skipped', at: Timestamp.fromDate(now), error: allowed.ok ? 'no_account' : allowed.reason };
  } else {
    const tokens = (client.pushTokens ?? []).filter(isExpoPushToken);
    if (tokens.length === 0) {
      result = { status: 'no_device', at: Timestamp.fromDate(now) };
    } else {
      const messages: PushMessage[] = tokens.map((to) => ({
        to,
        title: n.title,
        body: n.description,
        data: pushData(id, n),
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      }));
      const tickets = await sendPush(messages, opts.expoAccessToken);
      const okIds: string[] = [];
      const dead: string[] = [];
      const errors: string[] = [];
      tickets.forEach((t, i) => {
        if (t.status === 'ok') okIds.push(t.id);
        else {
          if (isDeadTokenError(t.details?.error)) dead.push(tokens[i]);
          errors.push(t.details?.error ?? t.message);
        }
      });
      if (dead.length) {
        await clientSnap.ref.update({ pushTokens: FieldValue.arrayRemove(...dead) });
      }
      if (okIds.length) {
        result = { status: 'sent', at: Timestamp.fromDate(now), devices: okIds.length, tickets: okIds, pendingReceipt: true };
      } else {
        result = { status: 'error', at: Timestamp.fromDate(now), error: errors[0] ?? 'unknown' };
      }
    }
  }
  await ref.update({ push: result });
  return result;
}
