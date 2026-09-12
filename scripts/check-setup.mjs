#!/usr/bin/env node
// Diz o que falta NESTE PC para trabalhar no projeto como em casa: Node,
// git em dia com o GitHub, dependências, `.env`, chaves que o git não leva
// de propósito, logins da Firebase CLI e do EAS, backoffice ao lado.
// Não muda nada; só lê. Corre-se num PC novo (ou sempre que algo "não
// funciona no escritório") e segue-se as instruções linha a linha.
//
// Uso:  npm run check:setup
//       node scripts/check-setup.mjs --offline   (não contacta o GitHub)
//
// Sai com código 1 quando há algo em FALTA (o resto são avisos).
//
// Num worktree (as conversas do Claude correm em `.claude/worktrees/...`) o
// que conta para "o PC está pronto" é o CHECKOUT PRINCIPAL: é de lá que o
// servidor do telemóvel arranca e é lá que vivem o `.env` e as chaves. O
// `node_modules` e o `.env` do próprio worktree aparecem à parte, marcados
// "(só neste worktree)" — faltam em qualquer worktree novo, mesmo num PC
// já configurado (2026-09-12, corrida de teste no PC de casa).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { homedir, networkInterfaces, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const offline = process.argv.includes('--offline');
const results = [];
const add = (level, what, fix, scope) => results.push({ level, what, fix, scope });
const ok = (what) => add('ok', what);
const aviso = (what, fix) => add('aviso', what, fix);
const falta = (what, fix) => add('falta', what, fix);
const faltaWorktree = (what, fix) => add('falta', `${what} (só neste worktree)`, fix, 'worktree');
const info = (what, fix) => add('info', what, fix);

function git(args, cwd = here, timeout = 30_000) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout }).trim();
  } catch {
    return null;
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

// ---------------------------------------------------------------- Node + pasta

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 20) ok(`Node ${process.version}`);
else falta(`Node ${process.version} é antigo`, 'instala a versão LTS em https://nodejs.org (o Expo 57 precisa de Node 20 ou mais recente).');

if (platform() === 'win32') {
  const exe = 'C:\\Program Files\\nodejs\\node.exe';
  if (existsSync(exe)) ok('node.exe no caminho que .claude/launch.json usa');
  else aviso('node.exe não está em C:\\Program Files\\nodejs\\', 'as configurações de .claude/launch.json apontam para lá: instala o Node com o instalador oficial (caminho por defeito) ou muda `runtimeExecutable` nesse ficheiro.');
}

if (/onedrive|dropbox|google ?drive/i.test(here)) {
  falta(`o projeto está numa pasta sincronizada (${here})`, 'move-o para fora (ex.: C:\\Users\\<tu>\\Projects\\marble-app) — o Metro não vê alterações dentro do OneDrive (DEVELOPMENT.md, "Onde vive o projeto").');
} else ok(`pasta fora de OneDrive/Dropbox/Drive: ${here}`);

// ---------------------------------------------------------------- git + GitHub

const common = git(['rev-parse', '--git-common-dir']);
if (common === null) {
  falta('git não responde nesta pasta', 'instala o Git (https://git-scm.com) ou clona o projeto: git clone https://github.com/vampiregodric/marble-app.git');
}
const main = common === null ? here : dirname(resolve(here, common));
const isWorktree = main !== here;
if (isWorktree) info(`isto é um worktree; o checkout principal está em ${main}`);

if (common !== null) {
  const origin = git(['remote', 'get-url', 'origin']) || '';
  if (/vampiregodric\/marble-app/i.test(origin)) ok('remote origin = github.com/vampiregodric/marble-app');
  else aviso(`remote origin = ${origin || '(nenhum)'}`, 'esperava https://github.com/vampiregodric/marble-app.git — é a única cópia fora dos PCs.');

  const dirty = git(['status', '--porcelain']);
  if (dirty) aviso(`${dirty.split('\n').length} ficheiro(s) por commitar nesta pasta`, 'só chega ao outro PC o que for commitado E enviado (git push).');
  else ok('sem alterações por commitar');

  if (offline) info('--offline: não comparei com o GitHub');
  else if (git(['fetch', '--quiet', 'origin'], here, 60_000) === null) {
    aviso('não consegui fazer git fetch ao GitHub', 'sem rede, ou o Git ainda não tem sessão nesta máquina: corre `git fetch` no PowerShell e entra pelo browser na janela "Connect to GitHub".');
  } else {
    const behind = Number(git(['rev-list', '--count', 'HEAD..origin/master']) || 0);
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || '?';
    if (behind > 0) aviso(`o ramo ${branch} está ${behind} commit(s) atrás de origin/master`, 'o outro PC enviou trabalho: faz `git pull` (no master) ou `git merge origin/master` (num ramo de secção).');
    else ok(`${branch} tem tudo o que está em origin/master`);

    // O que se perde ao mudar de PC são COMMITS que não estão em nenhum ramo
    // do GitHub — não nomes de ramos. Um ramo de secção que já foi fundido no
    // master (ff-merge) e nunca foi enviado com o seu nome não conta: o
    // trabalho está lá. (A primeira versão olhava para o nome e acusava sete
    // ramos já fundidos — 2026-09-12.)
    const refs = git(['for-each-ref', '--format=%(refname:short)', 'refs/heads']) || '';
    const soAqui = [];
    for (const name of refs.split('\n').filter(Boolean)) {
      const ahead = Number(git(['rev-list', '--count', name, '--not', '--remotes=origin']) || 0);
      if (ahead > 0) soAqui.push(`${name} (${ahead} commit(s) por enviar)`);
    }
    if (soAqui.length) aviso(`ramos com commits só neste PC: ${soAqui.join(', ')}`, 'envia-os antes de mudares de PC: git push -u origin <ramo> — mesmo com a secção a meio.');
    else ok('todos os commits locais estão no GitHub (em algum ramo)');
  }

  const worktrees = (git(['worktree', 'list', '--porcelain'], main) || '').split('\n').filter((l) => l.startsWith('worktree ')).length;
  if (worktrees > 1) info(`${worktrees} worktrees neste repositório (os ramos deles contam na verificação acima)`);
}

// ---------------------------------------------------------------- dependências

// Checkout principal primeiro: é de lá que o servidor do telemóvel arranca.
if (isWorktree) {
  if (existsSync(join(main, 'node_modules', 'expo', 'bin', 'cli'))) ok('node_modules do checkout principal (servidor do telemóvel)');
  else falta('node_modules do checkout principal', `o servidor do telemóvel (marble-app-phone) arranca a partir de ${main}: corre \`npm ci\` lá.`);
}
const nmFalta = isWorktree ? faltaWorktree : falta;
if (existsSync(join(here, 'node_modules', 'expo', 'bin', 'cli'))) ok(`node_modules da app${isWorktree ? ' neste worktree' : ''}`);
else nmFalta('node_modules da app', 'corre `npm ci` nesta pasta (a pré-visualização web e o typecheck correm daqui).');
if (existsSync(join(here, 'functions', 'node_modules', 'firebase-functions'))) ok(`functions/node_modules${isWorktree ? ' neste worktree' : ''}`);
else nmFalta('functions/node_modules', 'corre `npm ci` dentro de functions/ (sem isto o `npm run typecheck` dá erros que não são do código).');

// ---------------------------------------------------------------- .env e chaves

// O .env que conta é o do checkout principal (o servidor do telemóvel lê-o
// de lá); num worktree é preciso uma cópia para a pré-visualização web.
const example = join(here, '.env.example');
const envMain = join(main, '.env');
if (!existsSync(envMain)) {
  falta(`.env (config Firebase de DEV)${isWorktree ? ' no checkout principal' : ''}`, 'copia do outro PC, ou copia .env.example para .env e preenche com os valores de marble-studios-dev (consola Firebase > Project settings > Your apps). Não vem do git de propósito.');
} else if (existsSync(example)) {
  const env = parseEnv(envMain);
  const vazias = Object.keys(parseEnv(example)).filter((k) => !env[k]);
  if (vazias.length) falta(`.env sem valor em: ${vazias.join(', ')}`, 'preenche a partir da consola Firebase (dev) e do Cloudinary — ver os comentários em .env.example.');
  else ok(`.env com todas as variáveis de .env.example${isWorktree ? ' (checkout principal)' : ''}`);
}
if (isWorktree) {
  if (existsSync(join(here, '.env'))) ok('.env neste worktree');
  else if (existsSync(envMain)) faltaWorktree('.env', `copia-o do checkout principal para esta pasta: Copy-Item "${envMain}" .env`);
  else faltaWorktree('.env', 'quando o .env do checkout principal existir, copia-o para esta pasta.');
}
if (existsSync(join(here, '.env.production'))) ok('.env.production (vem do git)');
else aviso('.env.production não existe', 'devia vir do git — confirma que o checkout está completo (git status).');

const chaves = [
  ['serviceAccountKey.dev.json', 'aviso', 'precisa dela: seed, check:firestore:auth, functions:jobs, dev-token, demo:account. Copia do outro PC por pen ou gestor de passwords — nunca por email/chat; ou gera outra na consola Firebase (dev) > Service accounts.'],
  ['serviceAccountKey.prod.json', 'info', 'só para tarefas no prod (auth:emails, jobs) — opcional no dia a dia.'],
  ['google-services.prod.json', 'info', 'só para reenviar o ficheiro ao EAS (Secção 11) — o EAS já o tem.'],
  ['credentials.json', 'info', 'só para builds com chaves locais — o EAS gere o keystore.'],
];
for (const [file, level, fix] of chaves) {
  const path = join(main, file);
  if (existsSync(path)) ok(`${file} (na pasta principal)`);
  else if (level === 'aviso') aviso(`${file} não está na pasta principal`, fix);
  else info(`${file} não está na pasta principal — ${fix}`);
}

// ---------------------------------------------------------------- logins das CLIs

const fbStore = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'configstore', 'firebase-tools.json');
const fb = readJson(fbStore);
if (fb && (fb.tokens || fb.user)) ok(`Firebase CLI com sessão${fb.user?.email ? ` (${fb.user.email})` : ''}`);
else aviso('Firebase CLI sem sessão neste PC', 'corre `npx.cmd firebase-tools login` (entra com a conta do projeto) — precisa disto para deploys de regras/índices/Functions/Hosting.');

const expoState = readJson(join(homedir(), '.expo', 'state.json'));
if (expoState?.auth) ok('EAS/Expo CLI com sessão');
else aviso('EAS CLI sem sessão neste PC', 'corre `npx.cmd eas-cli login` — só é preciso para builds (dev build, lojas).');

// ---------------------------------------------------------------- backoffice ao lado

const bo = resolve(main, '..', 'marble-backoffice');
if (!existsSync(bo)) {
  aviso(`backoffice não está em ${bo}`, 'clona-o AO LADO desta pasta com este nome: git clone https://github.com/vampiregodric/marble.backoffice.git marble-backoffice — o `npm run progress` e a configuração marble-backoffice-web contam com isso.');
} else {
  ok(`backoffice ao lado (${bo})`);
  if (!existsSync(join(bo, 'node_modules', 'vite'))) aviso('backoffice sem node_modules', `corre \`npm ci\` em ${bo}.`);
  if (!existsSync(join(bo, '.env')) && existsSync(join(bo, '.env.example'))) aviso('backoffice sem .env', 'copia do outro PC ou preenche a partir do .env.example dele.');
}

// ---------------------------------------------------------------- Claude

if (existsSync(join(here, '.claude', 'settings.json')) && existsSync(join(here, '.claude', 'launch.json'))) ok('definições do Claude do projeto (.claude/settings.json e launch.json vêm do git)');
else aviso('faltam ficheiros em .claude/', 'deviam vir do git: git status / git checkout -- .claude');
info('as CONVERSAS e a memória do Claude ficam no PC onde correram: o contexto do projeto está em CLAUDE.md, ROADMAP.md e DEVELOPMENT.md — é por isso que tudo o que se decide tem de ficar lá escrito.');

// ---------------------------------------------------------------- telemóvel

// O IP é diferente em cada PC (e o telemóvel tem de estar na mesma rede
// Wi-Fi): imprime o endereço a pôr no Marble Dev / Expo Go e se a 8081 já
// tem o servidor a correr (uma conversa anterior pode tê-lo deixado ligado).
function listening(port) {
  return new Promise((done) => {
    const s = createConnection({ host: '127.0.0.1', port });
    const finish = (up) => { s.destroy(); done(up); };
    s.once('connect', () => finish(true));
    s.once('error', () => finish(false));
    s.setTimeout(1000, () => finish(false));
  });
}
const ips = Object.values(networkInterfaces()).flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'))
  .map((i) => i.address);
const phoneUp = await listening(8081);
const enderecos = ips.length ? ips.map((ip) => `exp://${ip}:8081`).join('  ou  ') : 'exp://<IP deste PC>:8081 (sem rede?)';
if (phoneUp) info(`servidor do telemóvel a correr na 8081 — no Marble Dev / Expo Go: ${enderecos}`);
else info(`servidor do telemóvel parado — arranca-o com a configuração marble-app-phone (node scripts/launch-main.mjs phone) e no Marble Dev / Expo Go usa: ${enderecos}`);

// ---------------------------------------------------------------- relatório

const tag = { ok: ' OK    ', falta: ' FALTA ', aviso: ' AVISO ', info: '  --   ' };
console.log(`Marble Studios — verificação deste PC (${new Date().toISOString().slice(0, 10)})`);
console.log(`Pasta: ${here}${isWorktree ? ' (worktree)' : ' (checkout principal)'}\n`);
for (const r of results) {
  console.log(`${tag[r.level]} ${r.what}`);
  if (r.fix) console.log(`         → ${r.fix}`);
}
const faltas = results.filter((r) => r.level === 'falta');
const nFalta = faltas.length;
const nWorktree = faltas.filter((r) => r.scope === 'worktree').length;
const nAviso = results.filter((r) => r.level === 'aviso').length;
const soWorktree = nFalta > 0 && nWorktree === nFalta ? ' — todas só deste worktree: o PC em si está pronto, é a conversa nova que precisa de `npm ci` e do `.env`' : '';
console.log(`\n${nFalta} em falta${soWorktree}, ${nAviso} aviso(s). Passos completos em DEVELOPMENT.md, "Segundo PC (escritório)".`);
process.exit(nFalta ? 1 : 0);
