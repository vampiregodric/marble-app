import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { canReceive } from '../consent';
import { notificationDoc } from '../notify';
import { TEXTS } from '../texts';
import { addDays, lisbonDay } from '../time';
import { Client, MarbleEvent } from '../types';
import { JobLog } from './followUps';

// Lembrete "Amanhã: <evento>" a quem ligou "Ofertas e novidades" (é
// marketing). Corre às 10:00 de Lisboa e apanha os eventos cujo dia, no
// calendário de Lisboa, é amanhã. Um evento só lembra uma vez
// (`reminderSentAt`), mesmo que a equipa lhe mexa depois.

export type EventsSummary = { events: number; notifications: number };

export async function loadAppClients(db: Firestore): Promise<Client[]> {
  const snap = await db.collection('clients').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Client);
}

export async function runEventReminders(db: Firestore, now: Date, log: JobLog = () => {}, clients?: Client[]): Promise<EventsSummary> {
  const summary: EventsSummary = { events: 0, notifications: 0 };
  const tomorrow = lisbonDay(addDays(now, 1));
  // Janela larga em UTC (ontem → depois de amanhã) e depois filtra pelo dia de Lisboa.
  const snap = await db
    .collection('events')
    .where('date', '>=', Timestamp.fromDate(addDays(now, -1)))
    .where('date', '<=', Timestamp.fromDate(addDays(now, 3)))
    .get();
  const events = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as MarbleEvent)
    .filter((e) => !e.reminderSentAt && e.date && lisbonDay(e.date.toDate()) === tomorrow);
  if (events.length === 0) return summary;

  const all = clients ?? (await loadAppClients(db));
  const recipients = all.filter((c) => canReceive(c, 'event_reminder').ok);

  for (const event of events) {
    summary.events++;
    const text = TEXTS.eventReminder(event);
    // Lotes de 500 (limite do Firestore). O push de cada doc vem do trigger.
    for (let i = 0; i < recipients.length; i += 450) {
      const batch = db.batch();
      for (const c of recipients.slice(i, i + 450)) {
        batch.set(
          db.collection('notifications').doc(),
          notificationDoc({ clientId: c.id, type: 'event_reminder', ...text, photoUrl: event.photoUrl, relatedEventId: event.id }, now)
        );
      }
      await batch.commit();
    }
    summary.notifications += recipients.length;
    await db.collection('events').doc(event.id).update({ reminderSentAt: Timestamp.fromDate(now) });
    log(`evento "${event.title}" → ${recipients.length} cliente(s)`);
  }
  return summary;
}
