import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { marketingRecipients } from '../consent';
import { notificationDoc } from '../notify';
import { clientLocale, forLocales, TEXTS } from '../texts';
import { addDays, lisbonDay } from '../time';
import { MarbleEvent } from '../types';
import { JobLog } from './followUps';

// Lembrete "Amanhã: <evento>" a quem ligou "Ofertas e novidades" (é
// marketing), no idioma de cada cliente (Secção 12b). Corre às 10:00 de
// Lisboa e apanha os eventos cujo dia, no calendário de Lisboa, é amanhã.
// Um evento só lembra uma vez (`reminderSentAt`), mesmo que a equipa lhe
// mexa depois. Os destinatários vêm de uma query filtrada e paginada
// (consent.ts → marketingRecipients), lida uma só vez por dia mesmo que
// haja vários eventos amanhã: cada página dá um lote por evento.

export type EventsSummary = { events: number; notifications: number };

export async function runEventReminders(db: Firestore, now: Date, log: JobLog = () => {}): Promise<EventsSummary> {
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

  const texts = events.map((event) => forLocales((l) => TEXTS.eventReminder(l, event)));
  const sent = events.map(() => 0);
  for await (const page of marketingRecipients(db, 'event_reminder')) {
    // Lotes de 500 (limite do Firestore): uma página (≤ 450) por evento. O push de cada doc vem do trigger.
    for (const [i, event] of events.entries()) {
      const batch = db.batch();
      for (const c of page) {
        batch.set(
          db.collection('notifications').doc(),
          notificationDoc({ clientId: c.id, type: 'event_reminder', ...texts[i][clientLocale(c)], photoUrl: event.photoUrl, relatedEventId: event.id }, now)
        );
      }
      await batch.commit();
      sent[i] += page.length;
    }
  }
  for (const [i, event] of events.entries()) {
    summary.events++;
    summary.notifications += sent[i];
    await db.collection('events').doc(event.id).update({ reminderSentAt: Timestamp.fromDate(now) });
    log(`evento "${event.title}" → ${sent[i]} cliente(s)`);
  }
  return summary;
}
