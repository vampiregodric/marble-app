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
//
// ATENÇÃO: escreve a sério no Firestore de dev (cria alertas, marca passos
// como enviados). É o mesmo código que corre no Firebase.

import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CloudinaryConfig } from '../cloudinary';
import { handleClientUpdated, handleWorkWritten } from '../handlers';
import { runDailyJobs } from '../jobs';
import { pushNotification } from '../push';
import { AppNotification, Client, Work } from '../types';

const args = process.argv.slice(2);
const keyPath = args.find((a) => !a.startsWith('--'));
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!keyPath) {
  console.error('Uso: npm run run-jobs -- <chave-service-account.json> [--now AAAA-MM-DD] [--only job] [--push id] [--work id] [--avatar uid]');
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

async function main(): Promise<void> {
  console.log(`Projeto: ${key.project_id} · agora = ${now.toISOString()}`);
  const pushId = flag('push');
  const workId = flag('work');
  const avatarUid = flag('avatar');

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
    const n = await handleClientUpdated(cloudinary, avatarUid, { ...after, avatarUrl: 'https://res.cloudinary.com/x/image/upload/v1/antiga' }, after, log);
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
