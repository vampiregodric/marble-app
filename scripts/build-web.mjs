#!/usr/bin/env node
// Export web da app + publicação no Hosting (Secção "App na web" do DEVELOPMENT.md).
//
// Porque é que este script existe: `npx expo export` força sempre
// NODE_ENV=production (documentado em docs.expo.dev/guides/environment-variables),
// e a resolução normal dos .env dá prioridade ao `.env.production` sobre o `.env`.
// Um export web feito à mão sai, por isso, a apontar para o projeto de PRODUÇÃO
// mesmo que o queiras para o dev — aconteceu a 2026-09-22 e foi preciso republicar.
//
// Aqui escolhe-se o projeto de propósito:
//   node scripts/build-web.mjs            → dev  (usa o .env, via .env.production.local temporário)
//   node scripts/build-web.mjs --prod     → prod (usa o .env.production tal como está)
//   node scripts/build-web.mjs --deploy   → depois do export, publica no Hosting
//
// O ficheiro temporário é sempre apagado no fim, mesmo se o export falhar.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const prod = args.includes('--prod');
const publicar = args.includes('--deploy');
const alvo = prod ? 'prod' : 'dev';
const projeto = prod ? 'marble-studios-prod' : 'marble-studios-dev';
const oposto = prod ? 'marble-studios-dev' : 'marble-studios-prod';

const envDev = join(raiz, '.env');
const override = join(raiz, '.env.production.local');
const jaExistia = existsSync(override);

function correr(cmd, cmdArgs) {
  execFileSync(cmd, cmdArgs, { cwd: raiz, stdio: 'inherit', shell: process.platform === 'win32' });
}

if (!prod) {
  if (!existsSync(envDev)) {
    console.error(
      'Falta o .env (config do Firebase de DEV). Copia-o de outro PC ou preenche a partir\n' +
        'do .env.example — ver DEVELOPMENT.md, "Segundo PC (escritório)".'
    );
    process.exit(1);
  }
  if (jaExistia) {
    console.error(
      'Já existe um .env.production.local neste checkout. Este script cria e apaga esse\n' +
        'ficheiro; não o quero destruir. Trata dele à mão e volta a correr.'
    );
    process.exit(1);
  }
  copyFileSync(envDev, override);
  console.log('Export para o DEV: .env copiado para .env.production.local (apagado no fim).');
} else {
  console.log('Export para o PROD: usa o .env.production do repositório.');
}

try {
  // `--clear` não é opcional aqui: sem ele o Metro reaproveita a cache e o
  // bundle sai com os EXPO_PUBLIC_* do export anterior (mesmo hash), ou seja,
  // com o projeto errado lá dentro.
  correr('npx', ['expo', 'export', '--platform', 'web', '--clear']);
} finally {
  if (!prod && !jaExistia) rmSync(override, { force: true });
}

// --- verificação: o bundle tem de falar com o projeto certo ---
const jsDir = join(raiz, 'dist', '_expo', 'static', 'js', 'web');
if (!existsSync(jsDir)) {
  console.error('Não encontrei o bundle em dist/_expo/static/js/web — o export falhou?');
  process.exit(1);
}
const bundles = readdirSync(jsDir).filter((f) => f.endsWith('.js'));
let ok = false;
for (const f of bundles) {
  const txt = readFileSync(join(jsDir, f), 'utf8');
  if (txt.includes(oposto)) {
    console.error(
      `O bundle ${f} refere ${oposto} — este export devia ser só para ${projeto}.\n` +
        'Não publiques: verifica os .env antes de repetir.'
    );
    process.exit(1);
  }
  if (txt.includes(projeto)) ok = true;
}
if (!ok) {
  console.error(`Nenhum bundle refere ${projeto}. Verifica o .env antes de publicar.`);
  process.exit(1);
}
const tamanho = bundles.reduce((t, f) => t + statSync(join(jsDir, f)).size, 0);
console.log(`Bundle verificado: aponta para ${projeto} (${(tamanho / 1048576).toFixed(1)} MB).`);

if (publicar) {
  // `npx firebase` não serve: o pacote `firebase` (SDK do cliente) está nas
  // dependências e não tem executável. A CLI é o `firebase-tools` — pedido
  // explicitamente para não obrigar cada PC a ter a CLI instalada à mão.
  correr('npx', ['--yes', '--package', 'firebase-tools', 'firebase', 'deploy', '--only', 'hosting:app', '--project', alvo]);
} else {
  console.log(`Feito. Para publicar: npm run web:deploy${prod ? ':prod' : ''}`);
}
