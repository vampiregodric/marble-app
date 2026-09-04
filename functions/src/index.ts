// Cloud Functions da Marble Studios (Secção 6). Wiring apenas: a lógica
// vive em push.ts, handlers.ts e jobs/, e corre igual a partir de
// scripts/runJobs.ts contra o dev, sem deploy.
//
// Deploy (só dev a partir do Claude; prod na Secção 11):
//   npx.cmd firebase-tools deploy --project dev --only functions
// Segredos (uma vez por projeto, ver DEVELOPMENT.md):
//   npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_KEY --project dev
//   npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_SECRET --project dev

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions, logger } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { CloudinaryConfig } from './cloudinary';
import { handleClientUpdated, handleWorkWritten } from './handlers';
import { runDailyJobs } from './jobs';
import { pushNotification } from './push';
import { AppNotification, Client, Work } from './types';

initializeApp();
// Firestore está em eur3 (Europa); europe-west1 (Bélgica) é a região v2
// mais próxima. maxInstances baixo: o volume é de dezenas de docs por dia.
setGlobalOptions({ region: 'europe-west1', maxInstances: 5, memory: '256MiB' });

const CLOUDINARY_CLOUD_NAME = defineString('CLOUDINARY_CLOUD_NAME', { default: 'kr9bmaqh' });

// A limpeza no Cloudinary precisa dos segredos CLOUDINARY_API_KEY e
// CLOUDINARY_API_SECRET no Secret Manager. Enquanto não existirem, o deploy
// falharia só por os declarar — por isso só se declaram com
// CLOUDINARY_CLEANUP=on em functions/.env (ver DEVELOPMENT.md). Desligado,
// onClientUpdated limita-se a registar que ficou por apagar.
const CLOUDINARY_CLEANUP = process.env.CLOUDINARY_CLEANUP === 'on';
const cloudinarySecrets = CLOUDINARY_CLEANUP ? [defineSecret('CLOUDINARY_API_KEY'), defineSecret('CLOUDINARY_API_SECRET')] : [];

function cloudinaryConfig(): CloudinaryConfig | null {
  if (!CLOUDINARY_CLEANUP) return null;
  const apiKey = cloudinarySecrets[0].value();
  const apiSecret = cloudinarySecrets[1].value();
  if (!apiKey || !apiSecret) return null;
  return { cloudName: CLOUDINARY_CLOUD_NAME.value(), apiKey, apiSecret };
}

const log = (msg: string) => logger.info(msg);

// Push para o telemóvel sempre que nasce um alerta (backoffice ou jobs).
export const onNotificationCreated = onDocumentCreated('notifications/{id}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const n = { id: snap.id, ...snap.data() } as AppNotification;
  const result = await pushNotification(getFirestore(), snap.id, n);
  if (result) log(`push ${n.type} → ${n.clientId}: ${result.status}${result.devices ? ` (${result.devices})` : ''}${result.error ? ` ${result.error}` : ''}`);
});

// Novo trabalho publicado → alertas `new_work`; sincroniza a última visita do carro/chão.
export const onWorkWritten = onDocumentWritten('works/{id}', async (event) => {
  const before = event.data?.before.exists ? ({ id: event.params.id, ...event.data.before.data() } as Work) : null;
  const after = event.data?.after.exists ? ({ id: event.params.id, ...event.data.after.data() } as Work) : null;
  await handleWorkWritten(getFirestore(), before, after, new Date(), log);
});

// Foto de perfil removida/trocada ou conta apagada → limpar no Cloudinary.
export const onClientUpdated = onDocumentUpdated({ document: 'clients/{uid}', secrets: cloudinarySecrets }, async (event) => {
  if (!event.data) return;
  const before = { id: event.params.uid, ...event.data.before.data() } as Client;
  const after = { id: event.params.uid, ...event.data.after.data() } as Client;
  await handleClientUpdated(cloudinaryConfig(), event.params.uid, before, after, log);
});

// Job diário: recibos de push, acompanhamento pós-serviço, lembretes de
// eventos, retenção de contas. 10:00 em Lisboa — nunca de madrugada.
// Não precisa dos segredos do Cloudinary: ao anonimizar uma conta, o job
// tira `avatarUrl` e é o trigger onClientUpdated que limpa os ficheiros.
export const dailyJobs = onSchedule(
  {
    schedule: '0 10 * * *',
    timeZone: 'Europe/Lisbon',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const summary = await runDailyJobs(getFirestore(), { auth: getAuth() }, new Date(), log);
    logger.info('dailyJobs', summary);
  }
);
