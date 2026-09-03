#!/usr/bin/env node
// Verifica as leituras PRIVADAS da app (Alertas e Perfil) tal como um cliente
// com sessão as faz — mesmas queries que src/data/notifications.ts e
// src/data/vehicles.ts — e que as regras só deixam marcar alertas como
// lidos. Entra como o cliente com um custom token do Admin SDK, por isso não
// precisa de password; precisa da chave de service account do dev.
//
// Uso:
//   node scripts/check-firestore-auth.mjs ./serviceAccountKey.dev.json [email]
// (email por defeito: teste.seccao2@example.com)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp as initAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, orderBy, query, updateDoc, where, limit } from 'firebase/firestore';

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
try {
  const snap = await getDocs(query(collection(db, 'vehicles'), where('clientId', '==', user.uid), orderBy('createdAt', 'desc')));
  const vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const pending = vehicles.find((v) => v.checkupStatus === 'pending');
  pass(`vehicles: ${vehicles.length} — ${vehicles.map((v) => `${v.name} [${v.checkupStatus}]`).join('; ')}`);
  pass(pending ? `ação pendente: "${pending.name}"` : 'ação pendente: nenhuma (tudo em dia)');
} catch (e) {
  fail(`vehicles: ${e.code ?? e.message}`);
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
