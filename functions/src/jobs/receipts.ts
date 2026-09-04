import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { getReceipts, isDeadTokenError } from '../expo';
import { AppNotification } from '../types';
import { JobLog } from './followUps';

// Confirma a entrega dos pushes de ontem: o Expo aceita a mensagem na hora
// (ticket) mas só sabe se o FCM/APNs a entregou depois (recibo). Um recibo
// "DeviceNotRegistered" quer dizer app desinstalada — o token sai de
// clients.pushTokens para não continuarmos a enviar para o vazio.

export type ReceiptsSummary = { notifications: number; deadTokens: number; errors: number };

export async function runReceipts(db: Firestore, log: JobLog = () => {}, expoAccessToken?: string): Promise<ReceiptsSummary> {
  const summary: ReceiptsSummary = { notifications: 0, deadTokens: 0, errors: 0 };
  const snap = await db.collection('notifications').where('push.pendingReceipt', '==', true).limit(500).get();
  if (snap.empty) return summary;

  const byTicket = new Map<string, { notifId: string; clientId: string }>();
  for (const d of snap.docs) {
    const n = d.data() as AppNotification;
    for (const t of n.push?.tickets ?? []) byTicket.set(t, { notifId: d.id, clientId: n.clientId });
  }
  const receipts = await getReceipts([...byTicket.keys()], expoAccessToken);

  const errorsByNotif = new Map<string, string>();
  const clientsWithDead = new Set<string>();
  for (const [ticket, r] of Object.entries(receipts)) {
    const ref = byTicket.get(ticket);
    if (!ref) continue;
    if (r.status === 'error') {
      summary.errors++;
      errorsByNotif.set(ref.notifId, r.details?.error ?? r.message);
      if (isDeadTokenError(r.details?.error)) clientsWithDead.add(ref.clientId);
    }
  }

  // Sem o token no recibo, não sabemos QUAL dos tokens do cliente morreu —
  // reenviar um push de teste seria pior. Com um só token (o caso normal),
  // tiramo-lo; com vários, deixamos que a próxima notificação o descubra
  // pelo ticket (o envio devolve DeviceNotRegistered por token).
  for (const clientId of clientsWithDead) {
    const ref = db.collection('clients').doc(clientId);
    const c = await ref.get();
    const tokens: string[] = c.data()?.pushTokens ?? [];
    if (tokens.length === 1) {
      await ref.update({ pushTokens: FieldValue.arrayRemove(tokens[0]) });
      summary.deadTokens++;
      log(`token removido (app desinstalada) · ${c.data()?.email || clientId}`);
    }
  }

  const batch = db.batch();
  for (const d of snap.docs) {
    const err = errorsByNotif.get(d.id);
    batch.update(d.ref, { 'push.pendingReceipt': FieldValue.delete(), ...(err ? { 'push.receiptError': err } : {}) });
    summary.notifications++;
  }
  await batch.commit();
  return summary;
}
