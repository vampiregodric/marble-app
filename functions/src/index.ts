// Cloud Functions da Marble Studios (Secção 6). Wiring apenas: a lógica
// vive em push.ts, handlers.ts e jobs/, e corre igual a partir de
// scripts/runJobs.ts contra o dev, sem deploy.
//
// Deploy (só dev a partir do Claude; prod na Secção 11):
//   npx.cmd firebase-tools deploy --project dev --only functions
// Segredos (uma vez por projeto, ver DEVELOPMENT.md):
//   npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_KEY --project dev
//   npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_SECRET --project dev
//   npx.cmd firebase-tools functions:secrets:set RESEND_API_KEY --project dev

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions, logger } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineInt, defineSecret, defineString } from 'firebase-functions/params';
import { CloudinaryConfig } from './cloudinary';
import { handleClientUpdated, handleVehicleUpdated, handleWorkWritten } from './handlers';
import { runDailyJobs } from './jobs';
import { pushNotification } from './push';
import { handleRequestWritten, RequestEmailConfig } from './requests';
import { AppNotification, Client, ServiceRequest, Vehicle, Work } from './types';

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

// Emails dos pedidos de orçamento pelo Resend (Secção 7). O mesmo
// interruptor: só se declara o segredo RESEND_API_KEY com QUOTE_EMAIL=on em
// functions/.env, depois de o Fábio o guardar no Secret Manager. Desligado,
// o pedido chega na mesma ao Painel e ao ecrã Alertas — só o email fica por
// enviar (registado nos logs).
const QUOTE_EMAIL = process.env.QUOTE_EMAIL === 'on';
const emailSecrets = QUOTE_EMAIL ? [defineSecret('RESEND_API_KEY')] : [];
const EMAIL_FROM = defineString('EMAIL_FROM', { default: 'Marble Studios <app@marble.pt>' });
const QUOTES_EMAIL_TO = defineString('QUOTES_EMAIL_TO', { default: 'quotes@marble.pt' });
const BACKOFFICE_URL = defineString('BACKOFFICE_URL', { default: 'https://marble-studios-backoffice-dev.web.app' });

// Tecto global de pedidos de orçamento por 24 h (Secção 11): acima disto os
// pedidos ficam marcados `daily_cap` e a equipa recebe um só alerta por dia
// — trava inundações com contas novas enquanto não há App Check. 0 = desligado.
const REQUEST_DAILY_CAP = defineInt('REQUEST_DAILY_CAP', { default: 0 });

function emailConfig(): RequestEmailConfig | null {
  if (!QUOTE_EMAIL) return null;
  const apiKey = emailSecrets[0].value();
  if (!apiKey) return null;
  return { apiKey, from: EMAIL_FROM.value(), to: QUOTES_EMAIL_TO.value(), backofficeUrl: BACKOFFICE_URL.value() };
}

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
  await handleClientUpdated(getFirestore(), cloudinaryConfig(), event.params.uid, before, after, log);
});

// Pedido de orçamento (Secção 7): criado → alerta interno, confirmação ao
// cliente e emails; fotos removidas ou pedido apagado → limpeza no Cloudinary.
export const onRequestWritten = onDocumentWritten({ document: 'requests/{id}', secrets: [...emailSecrets, ...cloudinarySecrets] }, async (event) => {
  const before = event.data?.before.exists ? ({ id: event.params.id, ...event.data.before.data() } as ServiceRequest) : null;
  const after = event.data?.after.exists ? ({ id: event.params.id, ...event.data.after.data() } as ServiceRequest) : null;
  await handleRequestWritten(getFirestore(), before, after, { email: emailConfig(), cloudinary: cloudinaryConfig(), dailyCap: REQUEST_DAILY_CAP.value() }, new Date(), log);
});

// Agendamento de checkup (Secção 8): o cliente pediu/alterou/cancelou na
// app, ou a equipa aprovou/propôs outro dia → alerta interno ou `message`.
export const onVehicleUpdated = onDocumentUpdated('vehicles/{id}', async (event) => {
  if (!event.data) return;
  const before = { id: event.params.id, ...event.data.before.data() } as Vehicle;
  const after = { id: event.params.id, ...event.data.after.data() } as Vehicle;
  const summary = await handleVehicleUpdated(getFirestore(), before, after, new Date(), log);
  if (summary.teamAlerts || summary.messages || summary.declined) logger.info('onVehicleUpdated', { id: event.params.id, ...summary });
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
