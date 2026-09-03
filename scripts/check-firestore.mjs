#!/usr/bin/env node
// Verifica que a config do .env chega ao Firestore de dev e que as regras
// publicadas são as esperadas: `works` e `events` legíveis sem login,
// `clients` bloqueado. Usa o SDK de cliente (o mesmo que a app), sem chave.
//
// Uso:  npm run check:firestore

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

console.log(`Projeto: ${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}`);

for (const name of ['works', 'events']) {
  try {
    const snap = await getDocs(collection(db, name));
    console.log(`  ${name}: OK — ${snap.size} doc(s): ${snap.docs.map((d) => d.id).join(', ')}`);
  } catch (e) {
    ok = false;
    console.log(`  ${name}: ERRO — ${e.code ?? e.message}`);
  }
}

try {
  await getDocs(collection(db, 'clients'));
  ok = false;
  console.log('  clients: LEGÍVEL SEM LOGIN — as regras não são as de firestore.rules!');
} catch (e) {
  console.log(`  clients: bloqueado sem login (${e.code}) — correto`);
}

console.log(ok ? 'Tudo certo.' : 'Há problemas — vê acima.');
process.exit(ok ? 0 : 1);
