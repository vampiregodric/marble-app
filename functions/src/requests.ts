import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { CloudinaryConfig, deleteFilesByTag } from './cloudinary';
import { hasAppAccount } from './consent';
import { EmailConfig, sendEmail } from './email';
import { createNotification } from './notify';
import { clientLocale, TEXTS } from './texts';
import { addDays } from './time';
import { Client, ServiceRequest, Work } from './types';

// Pedidos de orçamento (Secção 7; a Secção 8 junta os de checkup). Reage a
// `requests/{id}` criado/alterado/apagado:
// - criado → anti-spam (3 pedidos/24 h por cliente marca `flagged`; e, com
//   REQUEST_DAILY_CAP ligado, um tecto global de pedidos por dia — Secção
//   11), alerta interno no Painel do backoffice, alerta "Recebemos o teu
//   pedido" ao cliente (push pela onNotificationCreated), email à equipa
//   (quotes@marble.pt) e ao cliente pelo Resend, quando ligado — o alerta
//   e o email ao cliente no idioma dele (`clients.locale`, Secção 12b);
// - fotos removidas (anonimização) ou pedido apagado → ficheiros fora do
//   Cloudinary pela tag `request_<id>`.
// E o job diário: 12 meses depois de fechado, o pedido perde os dados
// pessoais (RETENTION.requestMonths em src/legal/texts.ts da app).

export type Log = (msg: string) => void;

export const RATE_LIMIT_PER_DAY = 3;
export const REQUEST_RETENTION_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

// Estado do tecto diário (Secção 11): quando foi o último alerta à equipa.
// A coleção `system` não tem regras de cliente — só o Admin SDK lá chega.
export const REQUEST_GUARD_DOC = 'system/requestGuard';

// Alerta interno do tecto diário. Em PT como os outros `team_alert` (a
// equipa lê em português); vive aqui e não em texts.ts porque não depende
// de um pedido concreto.
const GUARD_TEXTS = {
  dailyCap(total: number, cap: number) {
    return {
      title: `Possível spam: ${total} pedidos de orçamento em 24 h`,
      description:
        `Acima do tecto de ${cap} por dia. Até o volume das últimas 24 h baixar, os pedidos novos ficam marcados como possível spam na página Pedidos, sem alerta interno nem email. ` +
        'Se forem pedidos reais, responde-lhes a partir de Pedidos.',
    };
  },
};

export function requestTag(id: string): string {
  return `request_${id}`;
}

export type RequestEmailConfig = EmailConfig & {
  // Caixa da equipa (quotes@marble.pt) e URL do backoffice para o link.
  to: string;
  backofficeUrl: string;
};

export type RequestDeps = {
  email?: RequestEmailConfig | null;
  cloudinary?: CloudinaryConfig | null;
  // Tecto global de pedidos por 24 h (REQUEST_DAILY_CAP); 0/ausente = desligado.
  dailyCap?: number | null;
};

export type RequestSummary = { checked: number; anonymized: number };

function clean(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) out[k] = v;
  return out;
}

export async function handleRequestWritten(
  db: Firestore,
  before: ServiceRequest | null,
  after: ServiceRequest | null,
  deps: RequestDeps,
  now: Date,
  log: Log = () => {}
): Promise<void> {
  if (!after) {
    if (before?.photos?.length) await cleanupPhotos(deps.cloudinary ?? null, before.id, log);
    return;
  }
  if (!before) {
    await handleRequestCreated(db, after, deps, now, log);
    return;
  }
  if (before.photos?.length && !after.photos?.length) await cleanupPhotos(deps.cloudinary ?? null, after.id, log);
}

async function cleanupPhotos(cfg: CloudinaryConfig | null, id: string, log: Log): Promise<void> {
  if (!cfg) {
    log(`cloudinary: sem credenciais — fotos de ${requestTag(id)} ficam por apagar (manual, ver README do backoffice)`);
    return;
  }
  const n = await deleteFilesByTag(cfg, requestTag(id));
  log(`cloudinary ${requestTag(id)}: ${n} ficheiro(s) apagado(s)`);
}

export async function handleRequestCreated(db: Firestore, req: ServiceRequest, deps: RequestDeps, now: Date, log: Log = () => {}): Promise<void> {
  const ref = db.collection('requests').doc(req.id);
  // O trigger pode repetir-se: relê e sai se já foi processado.
  const fresh = await ref.get();
  if (!fresh.exists || fresh.data()?.processedAt) return;
  const ts = Timestamp.fromDate(now);

  // 1. Anti-spam: o mesmo cliente com RATE_LIMIT_PER_DAY pedidos nas últimas
  //    24 h (além deste) fica marcado — aparece na página Pedidos com aviso,
  //    sem alerta interno nem email. Usa o índice clientId/createdAt.
  const since = addDays(now, -1).getTime();
  const recent = await db.collection('requests').where('clientId', '==', req.clientId).orderBy('createdAt', 'desc').limit(RATE_LIMIT_PER_DAY + 2).get();
  const others = recent.docs.filter((d) => d.id !== req.id && ((d.data().createdAt as Timestamp | undefined)?.toMillis?.() ?? 0) >= since).length;
  if (others >= RATE_LIMIT_PER_DAY) {
    await ref.update({ flagged: 'rate_limit', processedAt: ts, updatedAt: ts });
    log(`pedido ${req.id}: marcado (${others} pedidos do mesmo cliente em 24 h)`);
    return;
  }

  // 1b. Tecto global (Secção 11): mais de `dailyCap` pedidos nas últimas
  //     24 h no projeto inteiro, venham de que contas vierem, marca os que
  //     sobram como `daily_cap` (página Pedidos com aviso, sem alerta nem
  //     email) e avisa a equipa UMA vez por dia. Apanha inundações feitas
  //     com contas novas, que o limite por cliente não vê; enquanto o App
  //     Check não estiver ligado é a única trava do lado do servidor.
  //     Contagem por agregação no índice simples de `createdAt`.
  if (deps.dailyCap && deps.dailyCap > 0) {
    const total = (await db.collection('requests').where('createdAt', '>=', Timestamp.fromMillis(since)).count().get()).data().count;
    if (total > deps.dailyCap) {
      await ref.update({ flagged: 'daily_cap', processedAt: ts, updatedAt: ts });
      const alertId = await alertDailyCap(db, req, total, deps.dailyCap, now);
      log(`pedido ${req.id}: marcado (${total} pedidos em 24 h, tecto ${deps.dailyCap})${alertId ? ` — alerta à equipa ${alertId}` : ' — equipa já avisada hoje'}`);
      return;
    }
  }

  const [clientSnap, workSnap] = await Promise.all([
    db.collection('clients').doc(req.clientId).get(),
    req.workId ? db.collection('works').doc(req.workId).get() : null,
  ]);
  const client = clientSnap.exists ? ({ id: clientSnap.id, ...clientSnap.data() } as Client) : null;
  const work = workSnap?.exists ? ({ id: workSnap.id, ...workSnap.data() } as Work) : null;
  const photoUrl = work?.photoUrl || req.photos?.[0]?.thumbnailUrl;
  const locale = clientLocale(client);

  // 2. Alerta interno (Painel do backoffice) e confirmação ao cliente.
  const teamAlertId = await createNotification(
    db,
    { clientId: req.clientId, type: 'team_alert', ...TEXTS.requestTeamAlert(req), relatedRequestId: req.id, relatedWorkId: req.workId, photoUrl },
    now
  );
  let confirmationId: string | undefined;
  if (hasAppAccount(client)) {
    confirmationId = await createNotification(
      db,
      { clientId: req.clientId, type: 'message', ...TEXTS.requestConfirmation(locale, req), relatedRequestId: req.id, relatedWorkId: req.workId, photoUrl },
      now
    );
  }

  // 3. Emails (equipa + cliente), quando o Resend está ligado.
  const patch: Record<string, unknown> = { processedAt: ts, teamAlertId, confirmationId, updatedAt: ts };
  if (deps.email) {
    try {
      const url = `${deps.email.backofficeUrl.replace(/\/$/, '')}/pedidos/${req.id}`;
      await sendEmail(deps.email, { to: deps.email.to, replyTo: req.email || undefined, ...TEXTS.requestTeamEmail(req, url) });
      if (req.email) await sendEmail(deps.email, { to: req.email, replyTo: deps.email.to, ...TEXTS.requestClientEmail(locale, req) });
      patch.emailSentAt = ts;
    } catch (err) {
      patch.emailError = err instanceof Error ? err.message : String(err);
      log(`pedido ${req.id}: email falhou — ${patch.emailError}`);
    }
  } else {
    log(`pedido ${req.id}: email desligado (QUOTE_EMAIL=off) — só alerta interno e alerta na app`);
  }
  await ref.update(clean(patch));
  log(`pedido ${req.id} (${req.department}, ${req.name}): alerta interno ${teamAlertId}${confirmationId ? `, confirmação ${confirmationId}${locale === 'en' ? ' (en)' : ''}` : ' (cliente sem app)'}`);
}

// Um alerta interno por dia, não um por pedido: `system/requestGuard` guarda
// quando foi o último e quantos pedidos ficaram marcados desde então.
async function alertDailyCap(db: Firestore, req: ServiceRequest, total: number, cap: number, now: Date): Promise<string | null> {
  const guard = db.doc(REQUEST_GUARD_DOC);
  const ts = Timestamp.fromDate(now);
  const last = ((await guard.get()).data()?.dailyCapAlertAt as Timestamp | undefined)?.toMillis?.() ?? 0;
  if (now.getTime() - last < DAY_MS) {
    await guard.set({ flaggedSinceAlert: FieldValue.increment(1), lastFlaggedAt: ts, updatedAt: ts }, { merge: true });
    return null;
  }
  const id = await createNotification(db, { clientId: req.clientId, type: 'team_alert', relatedRequestId: req.id, ...GUARD_TEXTS.dailyCap(total, cap) }, now);
  await guard.set({ dailyCapAlertAt: ts, dailyCapAlertId: id, flaggedSinceAlert: 1, lastFlaggedAt: ts, updatedAt: ts }, { merge: true });
  return id;
}

// Tira os dados pessoais de um pedido: contactos, texto, campos, fotos e
// notas da equipa. Fica o departamento, o que foi pedido (opções), o estado
// e as datas — estatística sem pessoa. Retirar `photos` dispara a limpeza
// no Cloudinary (handleRequestWritten).
export async function anonymizeRequest(db: Firestore, id: string, now: Date): Promise<void> {
  const ts = Timestamp.fromDate(now);
  await db.collection('requests').doc(id).update({
    name: '',
    email: '',
    phone: '',
    message: '',
    fields: [],
    photos: FieldValue.delete(),
    notes: FieldValue.delete(),
    anonymizedAt: ts,
    updatedAt: ts,
  });
}

// Conta apagada (app ou retenção) → todos os pedidos do cliente.
export async function anonymizeClientRequests(db: Firestore, clientId: string, now: Date, log: Log = () => {}): Promise<number> {
  const snap = await db.collection('requests').where('clientId', '==', clientId).get();
  let n = 0;
  for (const d of snap.docs) {
    if (d.data().anonymizedAt) continue;
    await anonymizeRequest(db, d.id, now);
    n++;
  }
  if (n) log(`pedidos de ${clientId}: ${n} anonimizado(s) (conta apagada)`);
  return n;
}

// Job diário: pedidos fechados há mais de REQUEST_RETENTION_DAYS.
export async function runRequestRetention(db: Firestore, now: Date, log: Log = () => {}): Promise<RequestSummary> {
  const summary: RequestSummary = { checked: 0, anonymized: 0 };
  const cutoff = addDays(now, -REQUEST_RETENTION_DAYS);
  const snap = await db.collection('requests').where('status', '==', 'closed').get();
  for (const d of snap.docs) {
    const r = { id: d.id, ...d.data() } as ServiceRequest;
    if (r.anonymizedAt) continue;
    summary.checked++;
    const closed = (r.closedAt ?? r.updatedAt)?.toDate();
    if (!closed || closed > cutoff) continue;
    await anonymizeRequest(db, r.id, now);
    summary.anonymized++;
    log(`pedido ${r.id}: anonimizado (fechado a ${closed.toISOString().slice(0, 10)})`);
  }
  return summary;
}
