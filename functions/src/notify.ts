import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { NotificationType } from './types';

// Cria um doc em `notifications` com EXATAMENTE o formato do backoffice
// (marble-backoffice/src/data/writes.ts → sendNotification): é o doc que
// aparece no ecrã Alertas da app; o push é um acréscimo, feito depois pela
// Function que reage à criação do doc (push.ts). Quem chama já verificou o
// consentimento (consent.ts) — aqui só se escreve.

export type NotificationInput = {
  clientId: string;
  type: NotificationType;
  title: string;
  description: string;
  photoUrl?: string;
  relatedWorkId?: string;
  relatedEventId?: string;
  relatedVehicleId?: string;
  relatedRequestId?: string;
};

export function notificationDoc(input: NotificationInput, now: Date): Record<string, unknown> {
  const data: Record<string, unknown> = {
    clientId: input.clientId,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    read: false,
    photoUrl: input.photoUrl ?? '',
    createdAt: Timestamp.fromDate(now),
  };
  if (input.relatedWorkId) data.relatedWorkId = input.relatedWorkId;
  if (input.relatedEventId) data.relatedEventId = input.relatedEventId;
  if (input.relatedVehicleId) data.relatedVehicleId = input.relatedVehicleId;
  if (input.relatedRequestId) data.relatedRequestId = input.relatedRequestId;
  return data;
}

export async function createNotification(db: Firestore, input: NotificationInput, now: Date = new Date()): Promise<string> {
  const ref = await db.collection('notifications').add(notificationDoc(input, now));
  return ref.id;
}
