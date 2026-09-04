#!/usr/bin/env node
// Verifica as leituras PRIVADAS da app (Alertas e Perfil) tal como um cliente
// com sessão as faz — mesmas queries que src/data/notifications.ts e
// src/data/vehicles.ts — e que as regras só deixam marcar alertas como
// lidos e pedir/confirmar/cancelar o checkup de um carro/chão (Secção 8),
// nada mais. Entra como o cliente com um custom token do Admin SDK, por isso
// não precisa de password; precisa da chave de service account do dev. O
// carro/chão usado no teste do pedido é reposto no fim tal como estava.
//
// Uso:
//   node scripts/check-firestore-auth.mjs ./serviceAccountKey.dev.json [email]
// (email por defeito: teste.seccao2@example.com)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp as initAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, limit } from 'firebase/firestore';

const [keyPath, email = 'teste.seccao2@example.com'] = process.argv.slice(2);
if (!keyPath) {
  console.error('Uso: node scripts/check-firestore-auth.mjs <service-account.json> [email]');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
);

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
if (serviceAccount.project_id !== env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error(`A chave é de ${serviceAccount.project_id} mas o .env aponta a ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.`);
  process.exit(1);
}
initAdmin({ credential: cert(serviceAccount) });

const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);
let ok = true;
const pass = (msg) => console.log(`  OK   ${msg}`);
const fail = (msg) => {
  ok = false;
  console.log(`  ERRO ${msg}`);
};

const user = await getAdminAuth().getUserByEmail(email);
const token = await getAdminAuth().createCustomToken(user.uid);
await signInWithCustomToken(getAuth(app), token);
console.log(`Projeto: ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID} — sessão como ${email} (${user.uid})`);

// 1. Alertas: a query do AlertsScreen (índice clientId/createdAt).
let alerts = [];
try {
  const snap = await getDocs(
    query(collection(db, 'notifications'), where('clientId', '==', user.uid), orderBy('createdAt', 'desc'), limit(100))
  );
  alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const unread = alerts.filter((a) => !a.read).length;
  pass(`notifications: ${alerts.length} alerta(s), ${unread} por ler — ${alerts.map((a) => `${a.type}${a.read ? '' : '*'}`).join(', ')}`);
} catch (e) {
  fail(`notifications: ${e.code ?? e.message}`);
}

// 2. Perfil: a query do ProfileScreen (índice clientId/createdAt) + ação pendente.
let vehicles = [];
try {
  const snap = await getDocs(query(collection(db, 'vehicles'), where('clientId', '==', user.uid), orderBy('createdAt', 'desc')));
  vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const pending = vehicles.find((v) => v.checkupStatus === 'pending');
  pass(`vehicles: ${vehicles.length} — ${vehicles.map((v) => `${v.name} [${v.checkupStatus}${v.checkupRequest ? ` · pedido ${v.checkupRequest.status}` : ''}]`).join('; ')}`);
  pass(pending ? `ação pendente: "${pending.name}"` : 'ação pendente: nenhuma (tudo em dia)');
} catch (e) {
  fail(`vehicles: ${e.code ?? e.message}`);
}

// 2b. Agendamento de checkup (Secção 8): as três escritas do cliente em
// vehicles/{id} passam; tudo o resto é recusado. O carro/chão é reposto no
// fim com o Admin SDK, para o seed ficar igual.
const vehicle = vehicles.find((v) => v.checkupStatus === 'pending' || v.checkupStatus === 'declined');
if (vehicle) {
  const adminDb = getAdminFirestore();
  const ref = adminDb.collection('vehicles').doc(vehicle.id);
  const original = (await ref.get()).data();
  const vref = doc(db, 'vehicles', vehicle.id);
  const day = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const request = (extra = {}) => ({
    checkupRequest: { day, period: 'morning', note: 'Teste das regras', status: 'pending', requestedAt: serverTimestamp(), ...extra },
    checkupRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const mustFail = async (label, patch) => {
    try {
      await updateDoc(vref, patch);
      fail(`${label}: foi PERMITIDO — regras erradas`);
    } catch (e) {
      pass(`${label}: recusado (${e.code}) — correto`);
    }
  };
  try {
    await updateDoc(vref, request());
    pass(`pedir checkup de "${vehicle.name}" para ${day} de manhã: permitido`);
  } catch (e) {
    fail(`pedir checkup: ${e.code ?? e.message}`);
  }
  await mustFail('pedir já com status aprovado', request({ status: 'approved' }));
  await mustFail('pedir com período inválido', request({ period: 'night' }));
  await mustFail('pedir com nota de 301 caracteres', request({ note: 'x'.repeat(301) }));
  await mustFail('pedir com campo a mais no pedido', request({ time: '10:30' }));
  await mustFail('mudar o nome do carro/chão', { name: 'hack' });
  await mustFail('marcar em dia pelo cliente', { checkupStatus: 'ok' });
  await mustFail('aprovar o próprio pedido', { 'checkupRequest.status': 'approved', 'checkupRequest.confirmedAt': serverTimestamp() });
  // A equipa propõe outro dia (Admin SDK, como o backoffice) → o cliente confirma.
  await ref.update({ 'checkupRequest.status': 'proposed', 'checkupRequest.day': day, 'checkupRequest.period': 'afternoon', 'checkupRequest.time': '15:00', 'checkupRequest.decidedAt': AdminTimestamp.now() });
  await mustFail('confirmar a proposta mudando o dia', { 'checkupRequest.status': 'approved', 'checkupRequest.day': '2030-01-01', 'checkupRequest.confirmedAt': serverTimestamp() });
  try {
    await updateDoc(vref, { 'checkupRequest.status': 'approved', 'checkupRequest.confirmedAt': serverTimestamp(), updatedAt: serverTimestamp() });
    pass('confirmar a proposta da equipa: permitido');
  } catch (e) {
    fail(`confirmar a proposta: ${e.code ?? e.message}`);
  }
  try {
    await updateDoc(vref, { 'checkupRequest.status': 'cancelled', 'checkupRequest.cancelledAt': serverTimestamp(), updatedAt: serverTimestamp() });
    pass('cancelar o checkup agendado: permitido');
  } catch (e) {
    fail(`cancelar: ${e.code ?? e.message}`);
  }
  await mustFail('cancelar outra vez (já cancelado)', { 'checkupRequest.status': 'cancelled', 'checkupRequest.cancelledAt': serverTimestamp() });
  try {
    await updateDoc(vref, request());
    pass('voltar a pedir depois de cancelar: permitido');
  } catch (e) {
    fail(`voltar a pedir: ${e.code ?? e.message}`);
  }
  await ref.set(original);
  pass(`"${vehicle.name}" reposto como estava (sem pedido)`);
} else {
  console.log('  --   sem carro/chão com checkup pendente para testar o agendamento (corre o seed)');
}

// 3. Marcar como lido (a única escrita permitida) e repor, para o seed ficar igual.
const target = alerts.find((a) => !a.read);
if (target) {
  try {
    await updateDoc(doc(db, 'notifications', target.id), { read: true });
    await updateDoc(doc(db, 'notifications', target.id), { read: false });
    pass(`marcar "${target.title}" como lido e repor: permitido`);
  } catch (e) {
    fail(`marcar como lido: ${e.code ?? e.message}`);
  }
  // 4. Mudar outro campo tem de ser recusado.
  try {
    await updateDoc(doc(db, 'notifications', target.id), { title: 'hack' });
    fail('alterar o título de um alerta foi PERMITIDO — regras erradas');
  } catch (e) {
    pass(`alterar o título de um alerta: recusado (${e.code}) — correto`);
  }
} else {
  console.log('  --   sem alertas por ler para testar a escrita');
}

// 5. Os alertas de outra pessoa não se leem.
try {
  await getDocs(query(collection(db, 'notifications'), where('clientId', '==', 'client-example')));
  fail('alertas de outro cliente LEGÍVEIS — regras erradas');
} catch (e) {
  pass(`alertas de outro cliente: recusado (${e.code}) — correto`);
}

console.log(ok ? 'Tudo certo.' : 'Há problemas — vê acima.');
process.exit(ok ? 0 : 1);
