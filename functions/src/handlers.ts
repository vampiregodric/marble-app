import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { CloudinaryConfig, deleteAvatarFiles, publicIdFromUrl } from './cloudinary';
import { canReceive, hasAppAccount, marketingRecipients } from './consent';
import { followUpFinished } from './jobs/followUps';
import { createNotification, notificationDoc } from './notify';
import { anonymizeClientRequests } from './requests';
import { deleteClientSimulations } from './simulations';
import { clientLocale, forLocales, TEXTS } from './texts';
import { CheckupRequest, Client, Vehicle, Work, WorkFollowUp } from './types';

// Lógica dos triggers do Firestore, separada do "wiring" (index.ts) para
// poder correr localmente contra o dev com scripts/runJobs.ts, sem deploy.

export type Log = (msg: string) => void;

// Reserva o envio do `new_work` deste trabalho: numa transação, relê o doc
// e só marca `newWorkNotifiedAt` se ainda não estava marcado (e continua
// publicado). Os triggers v2 entregam "pelo menos uma vez" — duas entregas
// do mesmo evento chegam aqui as duas, mas só uma sai com `true`; a outra
// vê a marca e não repete os alertas a toda a gente (auditoria 2026-09-12,
// DES-04 / SEG-A-14). A marca fica escrita ANTES dos lotes: se a Function
// morrer a meio, faltam alertas a alguns clientes (fica nos logs), o que é
// preferível a mandar dois a todos.
async function claimNewWork(db: Firestore, workId: string, ts: Timestamp): Promise<boolean> {
  const ref = db.collection('works').doc(workId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.data();
    if (!snap.exists || !cur || cur.published !== true || cur.newWorkNotifiedAt) return false;
    tx.update(ref, { newWorkNotifiedAt: ts });
    return true;
  });
}

// works/{id} criado ou alterado.
// 1. Passou a publicado → alerta `new_work` a quem tem "Ofertas e
//    novidades" ligado E a categoria ligada, no idioma de cada cliente
//    (Secção 12b). Uma vez por trabalho (`newWorkNotifiedAt`, reservado
//    numa transação): despublicar e voltar a publicar não repete, e uma
//    entrega repetida do evento também não. Os destinatários vêm de uma
//    query filtrada e paginada (consent.ts → marketingRecipients), não da
//    coleção inteira.
// 2. Tem carro/chão ligado → a "última visita" do carro/chão passa a ser a
//    data de conclusão, se for mais recente (o Perfil mostra-a).
export async function handleWorkWritten(db: Firestore, before: Work | null, after: Work | null, now: Date, log: Log = () => {}): Promise<void> {
  if (!after) return;
  const ts = Timestamp.fromDate(now);

  const justPublished = after.published === true && before?.published !== true;
  if (justPublished && !after.newWorkNotifiedAt) {
    if (!(await claimNewWork(db, after.id, ts))) {
      log(`new_work "${after.title}": já enviado ou já não está publicado — não repete`);
    } else {
      const text = forLocales((l) => TEXTS.newWork(l, after));
      let sent = 0;
      for await (const page of marketingRecipients(db, 'new_work', after.category)) {
        const batch = db.batch();
        for (const c of page) {
          batch.set(db.collection('notifications').doc(), notificationDoc({ clientId: c.id, type: 'new_work', ...text[clientLocale(c)], photoUrl: after.photoUrl, relatedWorkId: after.id }, now));
        }
        await batch.commit();
        sent += page.length;
      }
      log(`new_work "${after.title}" → ${sent} cliente(s)`);
    }
  }

  const vehicleChanged = after.vehicleId && (before?.vehicleId !== after.vehicleId || !before?.completedAt?.isEqual(after.completedAt ?? ts));
  if (after.vehicleId && after.completedAt && vehicleChanged) {
    const ref = db.collection('vehicles').doc(after.vehicleId);
    const v = await ref.get();
    if (v.exists) {
      const last = (v.data()?.lastServiceAt as Timestamp | undefined)?.toDate();
      const completed = after.completedAt.toDate();
      if (!last || last < completed) {
        await ref.update({ lastServiceAt: after.completedAt, updatedAt: ts });
        log(`vehicle ${after.vehicleId}: lastServiceAt ← ${completed.toISOString().slice(0, 10)}`);
      }
    }
  }
}

// clients/{uid} alterado:
// 1. a conta foi apagada (app ou job de retenção) → os pedidos de orçamento
//    do cliente perdem os dados pessoais (Secção 7) e as simulações "como
//    ficaria" são apagadas (Secção 16);
// 2. a foto de perfil foi removida, trocada, ou a conta apagada (a app tira
//    `avatarUrl` ao anonimizar) → apagar no Cloudinary os ficheiros com a
//    tag do cliente, menos a foto atual (se trocou).
export async function handleClientUpdated(db: Firestore, cfg: CloudinaryConfig | null, uid: string, before: Client, after: Client, log: Log = () => {}): Promise<number> {
  if (after.deletedAt && !before.deletedAt) {
    await anonymizeClientRequests(db, uid, new Date(), log);
    await deleteClientSimulations(db, uid, log);
  }
  const prev = before.avatarUrl?.trim() || '';
  const next = after.avatarUrl?.trim() || '';
  if (prev === next) return 0;
  if (!cfg) {
    log(`cloudinary: sem credenciais — ficheiros de uid_${uid} ficam por apagar (manual, ver README do backoffice)`);
    return 0;
  }
  const keep = next ? publicIdFromUrl(next) : null;
  const n = await deleteAvatarFiles(cfg, uid, keep);
  log(`cloudinary uid_${uid}: ${n} ficheiro(s) apagado(s)${keep ? ` (mantida ${keep})` : ''}`);
  return n;
}

export function serverNow(): FieldValue {
  return FieldValue.serverTimestamp();
}

// ---------- Agendamento de checkup (Secção 8) ----------

export type VehicleUpdateSummary = { teamAlerts: number; messages: number; confirmedWorks: number; declined: boolean; reopened?: boolean };

function sameTs(a?: Timestamp, b?: Timestamp): boolean {
  return !a && !b ? true : !!a && !!b && a.isEqual(b);
}

// O pedido do cliente é a resposta ao lembrete: o acompanhamento do(s)
// trabalho(s) deste carro/chão fica confirmado já (o job diário faria o
// mesmo às 10:00, mas assim o backoffice mostra-o no minuto e nunca há
// janela para um alerta "não confirmou" falso). Cancelar também confirma:
// o cliente respondeu — decidiu não fazer — e não é para insistir.
async function confirmFollowUps(db: Firestore, vehicleId: string, now: Date, log: Log): Promise<number> {
  const snap = await db.collection('works').where('vehicleId', '==', vehicleId).where('followUp.active', '==', true).get();
  const ts = Timestamp.fromDate(now);
  let n = 0;
  for (const doc of snap.docs) {
    const work = { id: doc.id, ...doc.data() } as Work;
    const fu = work.followUp;
    if (!fu || !fu.checkupSentAt || fu.checkupConfirmedAt) continue;
    const next: WorkFollowUp = { ...fu, checkupConfirmedAt: ts };
    const patch: Record<string, unknown> = { 'followUp.checkupConfirmedAt': ts, updatedAt: ts };
    if (followUpFinished(next)) patch['followUp.active'] = false;
    await doc.ref.update(patch);
    n++;
    log(`checkup confirmado · ${work.title}`);
  }
  return n;
}

// vehicles/{id} alterado. Só interessa `checkupRequest` (o resto — nome,
// foto, "marcar em dia" — é a equipa a editar e não gera nada). Cada
// transição de estado gera uma coisa:
// - → pending (cliente pediu/alterou): alerta interno à equipa, para
//   aprovar ou propor outro dia; acompanhamento confirmado.
// - → proposed (equipa propôs outro dia): `message` ao cliente.
// - → approved (equipa aprovou, ou cliente confirmou a proposta): `message`
//   "Checkup agendado" ao cliente; se foi o cliente a confirmar (a equipa
//   mexe em `decidedAt`, o cliente só em `confirmedAt`), alerta
//   interno também; acompanhamento confirmado.
// Os `message` ao cliente saem no idioma dele (`clients.locale`, Secção
// 12b); os alertas internos são sempre em PT.
// - → cancelled (cliente): alerta interno; o carro/chão passa a
//   `checkupStatus: 'declined'` (sai dos checkups pendentes); acompanhamento
//   confirmado para o job não mandar ligar.
// Compara-se antes/depois, por isso a escrita que esta própria função faz
// (`checkupStatus`) não a dispara outra vez.
export async function handleVehicleUpdated(db: Firestore, before: Vehicle | null, after: Vehicle, now: Date, log: Log = () => {}): Promise<VehicleUpdateSummary> {
  const summary: VehicleUpdateSummary = { teamAlerts: 0, messages: 0, confirmedWorks: 0, declined: false };
  const req = after.checkupRequest;
  const prev = before?.checkupRequest;
  if (!req) return summary;
  const statusChanged = !prev || prev.status !== req.status;
  const newRound = !prev || !sameTs(prev.requestedAt, req.requestedAt);
  const slotChanged = !prev || prev.day !== req.day || prev.period !== req.period || (prev.time ?? '') !== (req.time ?? '');
  const decisionChanged = !prev || !sameTs(prev.decidedAt, req.decidedAt);

  const clientSnap = await db.collection('clients').doc(after.clientId).get();
  const client = clientSnap.exists ? ({ id: clientSnap.id, ...clientSnap.data() } as Client) : null;
  const locale = clientLocale(client);
  const clientLabel = `${client?.email || after.clientId}${locale === 'en' ? ' (en)' : ''}`;
  const team = async (t: { title: string; description: string }) => {
    await createNotification(db, { clientId: after.clientId, type: 'team_alert', ...t, relatedVehicleId: after.id }, now);
    summary.teamAlerts++;
  };
  const toClient = async (t: { title: string; description: string }) => {
    if (!client || !canReceive(client, 'message').ok) {
      log(`message não enviada (cliente sem conta na app) · ${after.name}`);
      return;
    }
    await createNotification(db, { clientId: client.id, type: 'message', ...t, photoUrl: after.photoUrl, relatedVehicleId: after.id }, now);
    summary.messages++;
  };

  if (req.status === 'pending' && (statusChanged || newRound)) {
    const changed = !!prev && prev.status !== 'cancelled';
    await team(TEXTS.checkupRequested(client ?? ({ id: after.clientId, name: '', email: '' } as Client), after, req, changed));
    // Tinha cancelado antes ("não quis") e mudou de ideias: volta aos
    // checkups pendentes do backoffice.
    if (after.checkupStatus === 'declined') {
      await db.collection('vehicles').doc(after.id).update({ checkupStatus: 'pending', updatedAt: Timestamp.fromDate(now) });
      summary.reopened = true;
    }
    summary.confirmedWorks = await confirmFollowUps(db, after.id, now, log);
    log(`checkup ${changed ? 'alterado' : 'pedido'} → alerta interno · ${clientLabel} · ${after.name} · ${req.day} ${req.period}`);
  } else if (req.status === 'proposed' && (statusChanged || decisionChanged || slotChanged)) {
    await toClient(TEXTS.checkupProposed(locale, after, req));
    log(`proposta da equipa → message · ${clientLabel} · ${after.name} · ${req.day} ${req.period}${req.time ? ` ${req.time}` : ''}`);
  } else if (req.status === 'approved' && (statusChanged || decisionChanged || slotChanged)) {
    // Uma proposta passa a `approved` de duas maneiras: o cliente confirma
    // na app (só `status` e `confirmedAt` mudam) ou a equipa aprova-a no
    // backoffice ("Aprovar na mesma" — mexe em `decidedAt`). Só a primeira
    // merece o alerta interno "confirmou o checkup".
    const fromProposal = prev?.status === 'proposed';
    const clientConfirmed = fromProposal && !decisionChanged;
    // A nota da equipa só vai quando foi escrita ao aprovar um pedido; se
    // vinha de uma proposta, era a pergunta da proposta e já foi lida.
    await toClient(TEXTS.checkupScheduled(locale, after, req, !fromProposal));
    if (clientConfirmed && client && hasAppAccount(client)) await team(TEXTS.checkupProposalConfirmed(client, after, req));
    summary.confirmedWorks = await confirmFollowUps(db, after.id, now, log);
    log(`checkup agendado → message · ${clientLabel} · ${after.name} · ${req.day} ${req.period}${req.time ? ` ${req.time}` : ''}`);
  } else if (req.status === 'cancelled' && statusChanged) {
    await team(TEXTS.checkupCancelled(client ?? ({ id: after.clientId, name: '', email: '' } as Client), after, req, prev?.status === 'approved'));
    if (after.checkupStatus === 'pending') {
      await db.collection('vehicles').doc(after.id).update({ checkupStatus: 'declined', updatedAt: Timestamp.fromDate(now) });
      summary.declined = true;
    }
    summary.confirmedWorks = await confirmFollowUps(db, after.id, now, log);
    log(`checkup cancelado → alerta interno · ${clientLabel} · ${after.name}`);
  }
  return summary;
}

// Estado anterior plausível para simular o trigger a partir de um doc já
// gravado (scripts/runJobs.ts --vehicle): o que estaria lá antes desta
// transição, se não se souber melhor.
export function guessPreviousRequest(req: CheckupRequest): CheckupRequest | undefined {
  switch (req.status) {
    case 'pending':
      return undefined;
    case 'proposed':
    case 'approved':
      return { ...req, status: 'pending', time: undefined, teamNote: undefined, decidedAt: undefined, confirmedAt: undefined };
    case 'cancelled':
      return { ...req, status: 'pending', cancelledAt: undefined };
    default:
      return undefined;
  }
}
