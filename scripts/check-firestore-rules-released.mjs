#!/usr/bin/env node
// Diz que conjunto de regras do Firestore está ATIVO no projeto de dev — só
// leitura. Serve quando várias conversas do Claude publicam regras para o
// mesmo dev ao mesmo tempo (cada worktree faz o seu deploy e o último
// ganha): antes de correr check:firestore:auth confirma-se aqui que as
// regras que estão a ser testadas são as desta pasta. Compara o ficheiro
// local com o publicado e diz se são iguais; com --show imprime o publicado.
//
// Uso:
//   node scripts/check-firestore-rules-released.mjs ./serviceAccountKey.dev.json [--show]
//
// Recusa chaves do prod: no prod só se publica com a confirmação do Fábio,
// e não há duas conversas a publicar lá.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';

const argv = process.argv.slice(2);
const show = argv.includes('--show');
const keyPath = argv.find((a) => !a.startsWith('--'));
if (!keyPath) {
  console.error('Uso: node scripts/check-firestore-rules-released.mjs <service-account.json> [--show]');
  process.exit(1);
}
const key = JSON.parse(readFileSync(keyPath, 'utf8'));
if (!String(key.project_id).endsWith('-dev')) {
  console.error(`Recusado: a chave é de ${key.project_id}; isto é só para o projeto de desenvolvimento.`);
  process.exit(1);
}
initializeApp({ credential: cert(keyPath) });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const normalize = (s) => s.replace(/\r\n/g, '\n').trimEnd();
const local = normalize(readFileSync(join(root, 'firestore.rules'), 'utf8'));

const ruleset = await getSecurityRules().getFirestoreRuleset();
const released = normalize(ruleset.source.map((f) => f.content).join('\n'));
console.log(`Projeto: ${key.project_id} — regras publicadas: ${ruleset.name} (${ruleset.createTime})`);
if (released === local) {
  console.log('  OK   as regras publicadas são as deste ficheiro (firestore.rules)');
} else {
  const a = local.split('\n');
  const b = released.split('\n');
  let first = 0;
  while (first < a.length && first < b.length && a[first] === b[first]) first++;
  console.log(`  --   as regras publicadas NÃO são as deste ficheiro (primeira linha diferente: ${first + 1}) — outra conversa publicou depois, ou este ficheiro ainda não foi publicado`);
  console.log(`         local:      ${a[first] ?? '(fim)'}`);
  console.log(`         publicado:  ${b[first] ?? '(fim)'}`);
  console.log('       Publicar as desta pasta: npx.cmd firebase-tools deploy --only firestore --project dev');
}
if (show) console.log(`\n${released}`);
process.exit(0);
