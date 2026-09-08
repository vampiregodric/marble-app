#!/usr/bin/env node
// Conta de demonstração para os revisores da App Store e do Google Play
// (Secção 11). Cria/atualiza SÓ o que a conta precisa para os revisores
// verem a app inteira: o utilizador Auth, o doc `clients/{uid}` (com
// consentimento na versão legal atual, para o Perfil não pedir aceitação),
// um carro com checkup pendente e dois alertas. NÃO toca em works, events
// nem settings — o seed (scripts/seed-firestore.mjs) é só para o dev.
//
// Uso (por defeito só mostra o que faria — dry run):
//   npm run demo:account -- ./serviceAccountKey.prod.json --email demo@marble.pt --password '…'
//   npm run demo:account -- ./serviceAccountKey.prod.json --email demo@marble.pt --password '…' --apply
//
// Idempotente: se o utilizador já existir, mantém o uid e repõe a password;
// os docs têm IDs fixos e são sobrescritos. A password nunca é gravada em
// lado nenhum além do Firebase Auth — copia-a para a ficha das lojas
// (docs/store/ficha-loja.md) por fora.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const keyPath = args.find((a) => !a.startsWith('--'));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const APPLY = args.includes('--apply');
const EMAIL = opt('email', 'demo@marble.pt');
const PASSWORD = opt('password', '');
const NAME = opt('name', 'Conta de Demonstração');
const PHONE = opt('phone', '+351 912 000 000');

if (!keyPath) {
  console.error('Uso: npm run demo:account -- <chave.json> --email <email> --password <password> [--apply]');
  process.exit(1);
}
if (!PASSWORD || PASSWORD.length < 8) {
  console.error('Falta --password (mínimo 8 caracteres). A password não é gerada aqui de propósito: és tu que a escolhes e a copias para a ficha das lojas.');
  process.exit(1);
}

// A versão legal atual: se o consentimento ficar numa versão antiga, o
// Perfil mostra o cartão "Termos e privacidade atualizados" aos revisores.
const legalSource = readFileSync(join(root, 'src', 'legal', 'texts.ts'), 'utf8');
const LEGAL_VERSION = (legalSource.match(/export const LEGAL_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1];
if (!LEGAL_VERSION) {
  console.error('Não encontrei LEGAL_VERSION em src/legal/texts.ts.');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
const projectId = String(serviceAccount.project_id);
initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const now = Timestamp.now();
const daysAgo = (n) => Timestamp.fromDate(new Date(Date.now() - n * 86400000));
const hoursAgo = (n) => Timestamp.fromDate(new Date(Date.now() - n * 3600000));

async function main() {
  console.log(`Projeto: ${projectId} · versão legal: ${LEGAL_VERSION} · modo: ${APPLY ? 'APLICAR' : 'dry run (nada é escrito)'}`);

  // 1. Utilizador Auth
  let user = null;
  try {
    user = await auth.getUserByEmail(EMAIL);
    console.log(`Auth: ${EMAIL} já existe (uid ${user.uid}) → password reposta`);
  } catch {
    console.log(`Auth: ${EMAIL} vai ser criado`);
  }
  const uid = user ? user.uid : '(novo uid)';

  const clientDoc = {
    name: NAME,
    email: EMAIL,
    phone: PHONE,
    locale: 'pt',
    clientSince: daysAgo(120),
    notificationPrefs: { automotive: true, epoxy: true, graphic: true },
    // Marketing ligado de propósito: é uma persona de teste (não é uma
    // pessoa real) e assim os revisores veem também as categorias e as
    // ofertas. Numa conta real isto só se liga pela mão do cliente.
    consent: { termsVersion: LEGAL_VERSION, termsAcceptedAt: now, marketing: true, marketingUpdatedAt: now },
    // O passo "Recebe os alertas no telemóvel" (Secção 15) fica visto: os
    // revisores da Apple recusam apps que empurram permissões logo à entrada.
    onboardingSeenAt: now,
    createdAt: daysAgo(120),
    updatedAt: now,
  };

  const vehicles = {
    'demo-car': {
      type: 'car',
      name: 'BMW M4 — PPF Colorido',
      model: 'BMW M4 Competition',
      lastServiceAt: daysAgo(9),
      checkupStatus: 'pending',
      photoUrl: '',
      createdAt: daysAgo(9),
    },
    'demo-floor': {
      type: 'floor',
      name: 'Garagem — Metallic Epoxy',
      model: 'Garagem · 45 m²',
      lastServiceAt: daysAgo(80),
      checkupStatus: 'ok',
      checkupDoneAt: daysAgo(70),
      photoUrl: '',
      createdAt: daysAgo(80),
    },
  };

  const notifications = {
    'demo-checkup': {
      type: 'checkup_reminder',
      title: 'Checkup pendente',
      description: 'O teu PPF (BMW M4) está pronto para o checkup gratuito. Agenda na app quando te der jeito.',
      read: false,
      relatedVehicleId: 'demo-car',
      photoUrl: '',
      createdAt: hoursAgo(3),
      // Já processado: a Cloud Function não tenta enviar push (não há telemóvel).
      push: { status: 'no_device', at: hoursAgo(3) },
    },
    'demo-message': {
      type: 'message',
      title: 'Bem-vindo à Marble Studios',
      description: 'Esta é a tua área de cliente: aqui acompanhas os teus carros e chãos, os checkups e os pedidos de orçamento.',
      read: true,
      photoUrl: '',
      createdAt: daysAgo(2),
      push: { status: 'no_device', at: daysAgo(2) },
    },
  };

  console.log('\nVai escrever:');
  console.log(`  clients/${uid}  ← ${NAME}, ${EMAIL}, consentimento ${LEGAL_VERSION}, marketing ligado, onboarding visto`);
  for (const id of Object.keys(vehicles)) console.log(`  vehicles/${id}  ← ${vehicles[id].name} (${vehicles[id].checkupStatus})`);
  for (const id of Object.keys(notifications)) console.log(`  notifications/${id}  ← ${notifications[id].title}`);
  console.log('  (works, events, settings: não toca)');

  if (!APPLY) {
    console.log('\nDry run terminado. Repete com --apply para escrever.');
    return;
  }

  if (user) {
    await auth.updateUser(user.uid, { password: PASSWORD, displayName: NAME, emailVerified: true, disabled: false });
  } else {
    user = await auth.createUser({ email: EMAIL, password: PASSWORD, displayName: NAME, emailVerified: true });
    console.log(`Auth: criado uid ${user.uid}`);
  }
  const realUid = user.uid;

  const batch = db.batch();
  const existing = await db.collection('clients').doc(realUid).get();
  batch.set(
    db.collection('clients').doc(realUid),
    existing.exists ? { ...clientDoc, createdAt: existing.get('createdAt') || clientDoc.createdAt, deletedAt: FieldValue.delete() } : clientDoc,
    { merge: true }
  );
  for (const [id, data] of Object.entries(vehicles)) batch.set(db.collection('vehicles').doc(id), { clientId: realUid, ...data });
  for (const [id, data] of Object.entries(notifications)) batch.set(db.collection('notifications').doc(id), { clientId: realUid, ...data });
  await batch.commit();

  console.log(`\nFeito no projeto ${projectId}: conta ${EMAIL} (uid ${realUid}), 2 carros/chãos, 2 alertas.`);
  console.log('Copia agora o email e a password para docs/store/ficha-loja.md (conta de demonstração) — a password não fica guardada em mais lado nenhum.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
