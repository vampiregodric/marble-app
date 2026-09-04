import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { canReceive, hasAppAccount } from '../consent';
import { createNotification } from '../notify';
import { TEXTS } from '../texts';
import { addDays, daysBetween } from '../time';
import { Client, Vehicle, Work, WorkFollowUp } from '../types';

// Acompanhamento pós-serviço (SPEC: +1 semana lembrete de checkup; sem
// confirmação → alerta interno; +1 mês oferta). Os prazos vêm de
// `works.followUp`, definidos pela equipa em cada trabalho (ver models.ts).
// Corre uma vez por dia (10:00 Lisboa); cada passo é executado uma só vez,
// marcado com `*At`, e `active` passa a false quando não resta nada.

export type JobLog = (msg: string) => void;

export type FollowUpSummary = { works: number; checkups: number; teamAlerts: number; offers: number; skippedOffers: number; closed: number };

type Loaded = { client: Client | null; vehicle: Vehicle | null };

async function load(db: Firestore, work: Work): Promise<Loaded> {
  const [c, v] = await Promise.all([
    work.clientId ? db.collection('clients').doc(work.clientId).get() : null,
    work.vehicleId ? db.collection('vehicles').doc(work.vehicleId).get() : null,
  ]);
  return {
    client: c?.exists ? ({ id: c.id, ...c.data() } as Client) : null,
    vehicle: v?.exists ? ({ id: v.id, ...v.data() } as Vehicle) : null,
  };
}

function hasStep(days: number | null | undefined): days is number {
  return typeof days === 'number' && days >= 0;
}

// Tudo o que estava configurado já aconteceu (ou deixou de fazer sentido)?
export function followUpFinished(fu: WorkFollowUp): boolean {
  const checkupDone = !hasStep(fu.checkupDays) || !!fu.checkupSentAt;
  const alertDone = !hasStep(fu.checkupDays) || !hasStep(fu.teamAlertDays) || !!fu.teamAlertSentAt || !!fu.checkupConfirmedAt;
  const offerDone = !hasStep(fu.offerDays) || !!fu.offerSentAt || !!fu.offerSkipped;
  return checkupDone && alertDone && offerDone;
}

export async function runFollowUps(db: Firestore, now: Date, log: JobLog = () => {}): Promise<FollowUpSummary> {
  const summary: FollowUpSummary = { works: 0, checkups: 0, teamAlerts: 0, offers: 0, skippedOffers: 0, closed: 0 };
  const snap = await db.collection('works').where('followUp.active', '==', true).get();
  const ts = Timestamp.fromDate(now);

  for (const doc of snap.docs) {
    const work = { id: doc.id, ...doc.data() } as Work;
    const fu = work.followUp;
    if (!fu || !work.completedAt) continue;
    summary.works++;
    const completed = work.completedAt.toDate();
    const { client, vehicle } = await load(db, work);
    const patch: Record<string, unknown> = {};
    const next: WorkFollowUp = { ...fu };

    // 1. Lembrete de checkup (operacional). Sem conta na app → alerta
    //    interno para ligar; sem carro/chão ou sem cliente → não há a quem
    //    lembrar, o passo fecha-se na mesma para o job não repetir.
    if (hasStep(fu.checkupDays) && !fu.checkupSentAt && addDays(completed, fu.checkupDays) <= now) {
      if (client && vehicle) {
        if (hasAppAccount(client)) {
          const t = TEXTS.checkupReminder(work, vehicle);
          await createNotification(
            db,
            { clientId: client.id, type: 'checkup_reminder', ...t, photoUrl: vehicle.photoUrl || work.photoUrl, relatedVehicleId: vehicle.id, relatedWorkId: work.id },
            now
          );
          summary.checkups++;
          log(`checkup → ${client.email || client.id} · ${vehicle.name} · ${work.title}`);
        } else {
          const t = TEXTS.teamAlertNoAccount(client, work, vehicle);
          await createNotification(db, { clientId: client.id, type: 'team_alert', ...t, relatedVehicleId: vehicle.id, relatedWorkId: work.id }, now);
          patch['followUp.teamAlertSentAt'] = ts;
          next.teamAlertSentAt = ts;
          summary.teamAlerts++;
          log(`checkup sem app → alerta interno · ${client.name} · ${vehicle.name}`);
        }
        await db.collection('vehicles').doc(vehicle.id).update({ checkupStatus: 'pending', updatedAt: ts });
        vehicle.checkupStatus = 'pending';
      } else {
        log(`checkup ignorado (sem cliente ou carro/chão) · ${work.title}`);
      }
      patch['followUp.checkupSentAt'] = ts;
      next.checkupSentAt = ts;
    }

    // 2. O checkup foi atendido depois do lembrete? (equipa marcou em dia,
    //    ou o cliente confirmou na app — Secção 8)
    const sentAt = next.checkupSentAt?.toDate();
    if (sentAt && !next.checkupConfirmedAt && vehicle) {
      const done = vehicle.checkupDoneAt?.toDate();
      const requested = vehicle.checkupRequestedAt?.toDate();
      if ((done && done >= sentAt) || (requested && requested >= sentAt)) {
        patch['followUp.checkupConfirmedAt'] = ts;
        next.checkupConfirmedAt = ts;
        log(`checkup confirmado · ${work.title}`);
      }
    }

    // 3. Alerta interno: continua por confirmar N dias depois do lembrete.
    if (hasStep(fu.teamAlertDays) && sentAt && !next.teamAlertSentAt && !next.checkupConfirmedAt && addDays(sentAt, fu.teamAlertDays) <= now) {
      if (client && vehicle) {
        const t = TEXTS.teamAlertNoConfirmation(client, work, vehicle, daysBetween(sentAt, now));
        await createNotification(db, { clientId: client.id, type: 'team_alert', ...t, relatedVehicleId: vehicle.id, relatedWorkId: work.id }, now);
        summary.teamAlerts++;
        log(`alerta interno → ${client.name} · ${vehicle.name}`);
      }
      patch['followUp.teamAlertSentAt'] = ts;
      next.teamAlertSentAt = ts;
    }

    // 4. Oferta (marketing): lavagem grátis, só com consentimento. Sem
    //    consentimento na data, fica `offerSkipped` e a equipa vê porquê no
    //    backoffice — não se envia meses depois se o cliente mudar de ideias.
    if (hasStep(fu.offerDays) && !fu.offerSentAt && !fu.offerSkipped && addDays(completed, fu.offerDays) <= now) {
      const allowed = canReceive(client, 'offer');
      if (allowed.ok && client && vehicle) {
        const t = TEXTS.offerFreeWash(client, work, vehicle);
        await createNotification(
          db,
          { clientId: client.id, type: 'offer', ...t, photoUrl: vehicle.photoUrl || work.photoUrl, relatedVehicleId: vehicle.id, relatedWorkId: work.id },
          now
        );
        patch['followUp.offerSentAt'] = ts;
        next.offerSentAt = ts;
        summary.offers++;
        log(`oferta → ${client.email || client.id} · ${vehicle.name}`);
      } else {
        const reason = !allowed.ok && allowed.reason === 'no_consent' ? 'no_consent' : 'no_account';
        patch['followUp.offerSkipped'] = reason;
        next.offerSkipped = reason;
        summary.skippedOffers++;
        log(`oferta não enviada (${reason}) · ${work.title}`);
      }
    }

    if (followUpFinished(next)) {
      patch['followUp.active'] = false;
      summary.closed++;
    }
    if (Object.keys(patch).length) {
      patch.updatedAt = FieldValue.serverTimestamp();
      await doc.ref.update(patch);
    }
  }
  return summary;
}
