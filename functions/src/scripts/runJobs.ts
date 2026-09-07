// Corre a lógica das Functions localmente contra o projeto de DEV, com a
// chave de service account — para testar sem deploy e sem esperar pelas
// 10:00. Recusa chaves do prod.
//
//   npm run build   (na pasta functions)
//   npm run run-jobs -- ../serviceAccountKey.dev.json                      # job diário, agora
//   npm run run-jobs -- ../serviceAccountKey.dev.json --now 2026-09-12     # job diário como se fosse esse dia (10:00 Lisboa)
//   npm run run-jobs -- ../serviceAccountKey.dev.json --only followUps     # só um job (receipts|followUps|events|retention)
//   npm run run-jobs -- ../serviceAccountKey.dev.json --push <notificationId>  # push de um alerta já criado
//   npm run run-jobs -- ../serviceAccountKey.dev.json --work <workId>      # simula o trigger de trabalho (publicação + carro/chão)
//   npm run run-jobs -- ../serviceAccountKey.dev.json --avatar <uid>       # simula a limpeza no Cloudinary (precisa das variáveis
//                                                                          #   CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no ambiente)
//   npm run run-jobs -- ../serviceAccountKey.dev.json --request <id>       # simula o trigger de um pedido de orçamento acabado de criar
//                                                                          #   (alerta interno, confirmação; email só com RESEND_API_KEY no ambiente;
//                                                                          #   --daily-cap N liga o tecto global de N pedidos/24 h, como REQUEST_DAILY_CAP)
//   npm run run-jobs -- ../serviceAccountKey.dev.json --vehicle <id>       # simula o trigger de agendamento de checkup (Secção 8) a
//                                                                          #   partir do estado atual de vehicles/{id}.checkupRequest;
//                                                                          #   --before none|pending|proposed|approved força o estado anterior
//
// ATENÇÃO: escreve a sério no Firestore de dev (cria alertas, marca passos
// como enviados). É o mesmo código que corre no Firebase.

import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CloudinaryConfig } from '../cloudinary';
import { guessPreviousRequest, handleClientUpdated, handleVehicleUpdated, handleWorkWritten } from '../handlers';
import { runDailyJobs } from '../jobs';
import { pushNotification } from '../push';
import { handleRequestWritten, RequestEmailConfig } from '../requests';
import { AppNotification, CheckupRequestStatus, Client, ServiceRequest, Vehicle, Work } from '../types';

const args = process.argv.slice(2);
const keyPath = args.find((a) => !a.startsWith('--'));
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!keyPath) {
  console.error('Uso: npm run run-jobs -- <chave-service-account.json> [--now AAAA-MM-DD] [--only job] [--push id] [--work id] [--avatar uid] [--request id] [--vehicle id [--before estado]]');
  process.exit(1);
}
const key = JSON.parse(readFileSync(keyPath, 'utf8')) as { project_id: string };
if (!String(key.project_id).endsWith('-dev')) {
  console.error(`Recusado: a chave é de ${key.project_id}; isto é só para o projeto de desenvolvimento.`);
  process.exit(1);
}
initializeApp({ credential: cert(keyPath) });
const db = getFirestore();
const log = (msg: string) => console.log(`  ${msg}`);

const nowFlag = flag('now');
// "--now 2026-09-12" = esse dia às 10:00 de Lisboa (hora do job real).
const now = nowFlag ? new Date(`${nowFlag}T10:00:00+01:00`) : new Date();

const cloudinary: CloudinaryConfig | null =
  process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
    ? { cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'kr9bmaqh', apiKey: process.env.CLOUDINARY_API_KEY, apiSecret: process.env.CLOUDINARY_API_SECRET }
    : null;

const email: RequestEmailConfig | null = process.env.RESEND_API_KEY
  ? {
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || 'Marble Studios <app@marble.pt>',
      to: process.env.QUOTES_EMAIL_TO || 'quotes@marble.pt',
      backofficeUrl: process.env.BACKOFFICE_URL || 'https://marble-studios-backoffice-dev.web.app',
    }
  : null;

async function main(): Promise<void> {
  console.log(`Projeto: ${key.project_id} · agora = ${now.toISOString()}`);
  const pushId = flag('push');
  const workId = flag('work');
  const avatarUid = flag('avatar');
  const vehicleId = flag('vehicle');
  const requestId = flag('request');

  if (vehicleId) {
    const snap = await db.collection('vehicles').doc(vehicleId).get();
    if (!snap.exists) throw new Error(`vehicles/${vehicleId} não existe`);
    const after = { id: snap.id, ...snap.data() } as Vehicle;
    if (!after.checkupRequest) throw new Error(`vehicles/${vehicleId} não tem checkupRequest — pede o checkup na app primeiro`);
    // Estado anterior: o indicado em --before, ou o plausível para a transição.
    const beforeFlag = flag('before');
    let prev = guessPreviousRequest(after.checkupRequest);
    if (beforeFlag === 'none') prev = undefined;
    else if (beforeFlag) prev = { ...after.checkupRequest, status: beforeFlag as CheckupRequestStatus };
    const before: Vehicle = { ...after, checkupRequest: prev };
    console.log(`checkupRequest: ${prev?.status ?? '(nenhum)'} → ${after.checkupRequest.status} · ${after.checkupRequest.day} ${after.checkupRequest.period}`);
    const summary = await handleVehicleUpdated(db, before, after, now, log);
    console.log('resultado:', summary);
    return;
  }
  if (requestId) {
    const snap = await db.collection('requests').doc(requestId).get();
    if (!snap.exists) throw new Error(`requests/${requestId} não existe`);
    // Como o trigger: se já foi processado, não repete (apaga `processedAt` no doc para forçar).
    const dailyCap = Number(flag('daily-cap') ?? process.env.REQUEST_DAILY_CAP ?? 0) || 0;
    await handleRequestWritten(db, null, { id: snap.id, ...snap.data() } as ServiceRequest, { email, cloudinary, dailyCap }, now, log);
    console.log(email ? 'email: Resend ligado (RESEND_API_KEY no ambiente)' : 'email: desligado (sem RESEND_API_KEY no ambiente)');
    console.log(dailyCap ? `tecto diário: ${dailyCap} pedidos/24 h` : 'tecto diário: desligado (--daily-cap N ou REQUEST_DAILY_CAP)');
    return;
  }

  if (pushId) {
    const snap = await db.collection('notifications').doc(pushId).get();
    if (!snap.exists) throw new Error(`notifications/${pushId} não existe`);
    const result = await pushNotification(db, snap.id, { id: snap.id, ...snap.data() } as AppNotification, { now });
    console.log('push:', result);
    return;
  }
  if (workId) {
    const snap = await db.collection('works').doc(workId).get();
    if (!snap.exists) throw new Error(`works/${workId} não existe`);
    await handleWorkWritten(db, null, { id: snap.id, ...snap.data() } as Work, now, log);
    return;
  }
  if (avatarUid) {
    const snap = await db.collection('clients').doc(avatarUid).get();
    const after = { id: snap.id, ...snap.data() } as Client;
    const n = await handleClientUpdated(db, cloudinary, avatarUid, { ...after, avatarUrl: 'https://res.cloudinary.com/x/image/upload/v1/antiga' }, after, log);
    console.log(`apagados: ${n}`);
    return;
  }
  const summary = await runDailyJobs(db, { auth: getAuth(), cloudinary: cloudinary ?? undefined }, now, log, flag('only'));
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
