#!/usr/bin/env node
// Arranca um servidor a partir do CHECKOUT PRINCIPAL do projeto, mesmo quando
// a conversa do Claude está num worktree — sem caminhos absolutos de nenhum
// PC (casa, escritório, o próximo). Usado por `.claude/launch.json`:
//
//   node scripts/launch-main.mjs phone
//     → expo start <principal> --port 8081 --clear   (servidor do telemóvel)
//   node scripts/launch-main.mjs backoffice
//     → vite <principal>/../marble-backoffice --port 5180 --strictPort
//
// O checkout principal é descoberto pelo git (`--git-common-dir`): num
// worktree aponta para o `.git` do repositório principal; no principal é o
// próprio. O backoffice tem de estar na pasta ao lado, `marble-backoffice`
// (a mesma convenção do `npm run progress`).
//
// `--dry-run` só mostra o que ia correr (útil para testar noutra máquina).

import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = args.find((a) => !a.startsWith('--'));

function mainCheckout(cwd) {
  const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  return dirname(resolve(cwd, common));
}

const TARGETS = {
  phone(main) {
    return {
      script: resolve(main, 'node_modules', 'expo', 'bin', 'cli'),
      args: ['start', main, '--port', '8081', '--clear'],
      missing: `Faltam as dependências em ${main} — corre \`npm ci\` nessa pasta.`,
    };
  },
  backoffice(main) {
    const bo = resolve(main, '..', 'marble-backoffice');
    return {
      script: resolve(bo, 'node_modules', 'vite', 'bin', 'vite.js'),
      args: [bo, '--port', '5180', '--strictPort'],
      missing: existsSync(bo)
        ? `Faltam as dependências em ${bo} — corre \`npm ci\` nessa pasta.`
        : `Não encontro o backoffice em ${bo} — clona-o ao lado desta pasta: git clone https://github.com/vampiregodric/marble.backoffice.git marble-backoffice (ver DEVELOPMENT.md, "Segundo PC").`,
    };
  },
};

if (!target || !TARGETS[target]) {
  console.error(`Uso: node scripts/launch-main.mjs <${Object.keys(TARGETS).join('|')}> [--dry-run]`);
  process.exit(2);
}

let main;
try {
  main = mainCheckout(process.cwd());
} catch {
  console.error('Não consigo descobrir o checkout principal: isto não é um repositório git ou o git não está no PATH.');
  process.exit(1);
}

const plan = TARGETS[target](main);
const cmd = [process.execPath, plan.script, ...plan.args];

if (!existsSync(plan.script)) {
  console.error(plan.missing);
  console.error(`(ia correr: ${cmd.join(' ')})`);
  process.exit(1);
}

console.log(`[launch-main] checkout principal: ${main}`);
console.log(`[launch-main] ${cmd.join(' ')}`);
if (dryRun) process.exit(0);

const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => child.kill(sig));
}
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
