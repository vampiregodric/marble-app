#!/usr/bin/env node
// Verifica que a config do .env chega ao Firestore de dev e que as regras e
// índices publicados são os esperados, usando o SDK de cliente (o mesmo que
// a app), sem chave nem login:
//   - `works` publicados legíveis; a query da app (published + orderBy) tem
//     índice; rascunhos e a coleção inteira sem filtro são recusados;
//   - `events` legíveis;
//   - `clients` bloqueado;
//   - `requests` (Secção 7): sem login não se cria nem lê nada.
//
// Uso:  npm run check:firestore

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
);

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

console.log(`Projeto: ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}`);

// 1. A query do Portfólio (regras + índice composto published/completedAt).
try {
  const snap = await getDocs(query(collection(db, 'works'), where('published', '==', true), orderBy('completedAt', 'desc')));
  pass(`works publicados: ${snap.size} doc(s): ${snap.docs.map((d) => d.id).join(', ')}`);
  if (snap.docs.some((d) => d.data().published !== true)) fail('há docs não publicados na resposta!');
} catch (e) {
  fail(
    `works publicados: ${e.code ?? e.message}` +
      (e.code === 'failed-precondition' ? ' — índice em falta: npx.cmd firebase-tools deploy --only firestore:indexes --project dev' : '')
  );
}

// 2. A query do carrossel (índice featured/published/featuredOrder — Secção 5).
try {
  const snap = await getDocs(
    query(collection(db, 'works'), where('featured', '==', true), where('published', '==', true), orderBy('featuredOrder', 'asc'))
  );
  pass(`works em destaque: ${snap.size} doc(s)`);
} catch (e) {
  fail(`works em destaque: ${e.code ?? e.message}`);
}

// 3. Sem o filtro published, as regras têm de recusar a query toda.
try {
  await getDocs(collection(db, 'works'));
  fail('works SEM filtro published é legível — as regras não são as de firestore.rules!');
} catch (e) {
  pass(`works sem filtro: recusado (${e.code}) — correto`);
}

// 4. Um rascunho não pode ser lido diretamente.
try {
  const snap = await getDoc(doc(db, 'works', 'work-draft-tesla'));
  if (snap.exists()) fail('rascunho work-draft-tesla é legível — regras erradas');
  else pass('rascunho work-draft-tesla: não existe (seed não corrido?) — nada a verificar');
} catch (e) {
  pass(`rascunho work-draft-tesla: recusado (${e.code}) — correto`);
}

// 5. Eventos públicos.
try {
  const snap = await getDocs(query(collection(db, 'events'), orderBy('date', 'desc')));
  pass(`events: ${snap.size} doc(s): ${snap.docs.map((d) => d.id).join(', ')}`);
} catch (e) {
  fail(`events: ${e.code ?? e.message}`);
}

// 6. Clientes bloqueados sem login.
try {
  await getDocs(collection(db, 'clients'));
  fail('clients LEGÍVEL SEM LOGIN — as regras não são as de firestore.rules!');
} catch (e) {
  pass(`clients: bloqueado sem login (${e.code}) — correto`);
}

// 7. Fotos dos cartões do Início (settings/home) públicas — Secção 5b.
try {
  const snap = await getDoc(doc(db, 'settings', 'home'));
  const covers = snap.exists() ? Object.keys(snap.data().departmentCovers ?? {}) : [];
  pass(`settings/home: ${snap.exists() ? `existe, fotos para ${covers.length ? covers.join(', ') : 'nenhum departamento'}` : 'não existe (a app mostra gradientes)'}`);
} catch (e) {
  fail(`settings/home: ${e.code ?? e.message} — regras sem a match /settings?`);
}

// 8. Pedidos de orçamento (Secção 7): o pedido cria conta, por isso sem
//    login não há criação (nem leitura). Se isto passar, as regras estão
//    a deixar entrar pedidos anónimos.
try {
  await addDoc(collection(db, 'requests'), {
    type: 'quote',
    status: 'new',
    clientId: 'anon',
    name: 'Teste',
    email: 'teste@example.com',
    phone: '912345678',
    contactPreference: 'call',
    department: 'automotive',
    services: [],
    fields: [],
    message: 'teste sem login',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  fail('requests: criar SEM login foi PERMITIDO — regras erradas');
} catch (e) {
  pass(`requests: criar sem login recusado (${e.code}) — correto`);
}
try {
  await getDocs(collection(db, 'requests'));
  fail('requests LEGÍVEIS SEM LOGIN — regras erradas');
} catch (e) {
  pass(`requests: bloqueado sem login (${e.code}) — correto`);
}

console.log(ok ? 'Tudo certo.' : 'Há problemas — vê acima.');
process.exit(ok ? 0 : 1);
