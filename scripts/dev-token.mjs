#!/usr/bin/env node
// Emite um custom token do Firebase Auth para uma conta de CLIENTE, para
// abrir a app no browser com sessão, sem password (só no projeto de dev):
// cola o URL impresso no browser. O token dura 1 hora e só quem tem a chave
// de service account o consegue gerar. A app só aceita isto quando o
// projeto Firebase acaba em "-dev" (src/auth/devToken.ts).
//
// Uso:
//   node scripts/dev-token.mjs ./serviceAccountKey.dev.json teste.seccao2@example.com [url-base]
//   (url-base por defeito: http://localhost:8082)
//
// Recusa chaves do prod de propósito.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [keyPath, email, base = 'http://localhost:8082'] = process.argv.slice(2);
if (!keyPath || !email) {
  console.error('Uso: node scripts/dev-token.mjs <chave.json> <email> [url-base]');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
if (!String(serviceAccount.project_id).endsWith('-dev')) {
  console.error(`Recusado: a chave é de ${serviceAccount.project_id}; isto é só para o projeto de desenvolvimento.`);
  process.exit(1);
}
initializeApp({ credential: cert(serviceAccount) });

const user = await getAuth().getUserByEmail(email);
const token = await getAuth().createCustomToken(user.uid);
console.log(`${base.replace(/\/$/, '')}/#token=${token}`);
process.exit(0);
