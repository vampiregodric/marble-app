#!/usr/bin/env node
// Põe o Windows-MCP a funcionar NESTE PC, de uma vez: Python 3.13+ e uv se
// faltarem, o pacote descarregado, e a entrada em %USERPROFILE%\.claude.json
// que o Claude Code lê ao arrancar. É o "passo 1b" do DEVELOPMENT.md,
// "Segundo PC (escritório)", em forma de script — feito para o PC do
// escritório não ter de repetir à mão o que se fez em casa a 2026-09-13.
//
// Uso:  npm run setup:windows-mcp
//       node scripts/setup-windows-mcp.mjs --sem-instalar   (só regista; não
//                                            instala Python/uv nem descarrega)
//
// Só Windows. No fim é preciso fechar e abrir a app Claude Code — a conversa
// nova é que passa a ter as ferramentas `windows-mcp`. O `npm run check:setup`
// diz se está registado.
//
// O que fica registado (decisão do Fábio, 2026-09-13):
//   uvx windows-mcp serve --exclude-tools PowerShell,Registry
// — sem PowerShell (o Claude já o tem pela app) nem Registo do Windows (onde
// um clique errado faz estragos). Ficam rato, teclado, janelas, apps,
// capturas e ficheiros.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

if (platform() !== 'win32') {
  console.error('Este script é só para Windows (o Windows-MCP também).');
  process.exit(1);
}

const soRegistar = process.argv.includes('--sem-instalar');
const home = homedir();
const uvxExe = join(home, '.local', 'bin', 'uvx.exe');
const pyLauncher = join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Launcher', 'py.exe');

function corre(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.error) throw r.error;
  return r.status ?? 1;
}
function versao(cmd, args = ['--version']) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10_000 });
  return r.status === 0 ? r.stdout.trim() : null;
}

// ---------------------------------------------------------------- 1. Python 3.13+

const pyOut = versao('py') || (existsSync(pyLauncher) ? versao(pyLauncher) : null);
const pyVer = pyOut?.match(/(\d+)\.(\d+)\.(\d+)/);
const pyOk = pyVer && (Number(pyVer[1]) > 3 || (Number(pyVer[1]) === 3 && Number(pyVer[2]) >= 13));
if (pyOk) console.log(`OK  Python ${pyVer[0]}`);
else if (soRegistar) console.log('--  Python 3.13+ em falta (não instalo com --sem-instalar)');
else {
  console.log('..  Python 3.13+ em falta — a instalar com winget (por utilizador, com py launcher e pip)');
  const st = corre('winget', ['install', '--id', 'Python.Python.3.13', '--exact', '--source', 'winget',
    '--accept-package-agreements', '--accept-source-agreements', '--silent',
    '--override', '/quiet InstallAllUsers=0 PrependPath=1 Include_launcher=1 Include_pip=1']);
  if (st !== 0) { console.error('FALHOU a instalação do Python (winget). Corre o comando acima à mão e volta a correr este script.'); process.exit(1); }
  console.log('OK  Python instalado');
}

// ---------------------------------------------------------------- 2. uv

if (existsSync(uvxExe)) console.log(`OK  uv (${uvxExe})`);
else if (soRegistar) { console.error(`uv em falta (${uvxExe}) — sem ele não há o que registar.`); process.exit(1); }
else {
  console.log('..  uv em falta — a instalar com o instalador oficial da Astral (install.ps1)');
  const st = corre('powershell', ['-NoProfile', '-ExecutionPolicy', 'ByPass', '-Command', 'irm https://astral.sh/uv/install.ps1 | iex']);
  if (st !== 0 || !existsSync(uvxExe)) { console.error('FALHOU a instalação do uv. Corre o comando acima à mão e volta a correr este script.'); process.exit(1); }
  console.log('OK  uv instalado');
}

// ---------------------------------------------------------------- 3. pacote windows-mcp

if (!soRegistar) {
  console.log('..  a descarregar/verificar o pacote windows-mcp (a primeira vez demora um pouco)');
  const st = corre(uvxExe, ['windows-mcp', '--help'], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (st !== 0) { console.error('FALHOU `uvx windows-mcp --help`. Vê o erro acima; costuma ser rede ou o Python 3.13 ainda fora do PATH (abre um terminal novo).'); process.exit(1); }
  console.log('OK  pacote windows-mcp pronto');
}

// ---------------------------------------------------------------- 4. ~/.claude.json

const cfgPath = join(home, '.claude.json');
let cfg = {};
if (existsSync(cfgPath)) {
  try { cfg = JSON.parse(readFileSync(cfgPath, 'utf8')); }
  catch (e) { console.error(`${cfgPath} não é JSON válido (${e.message}) — não toco nele. Corrige-o (ou apaga-o se for lixo) e volta a correr.`); process.exit(1); }
  const bak = `${cfgPath}.bak-${new Date().toISOString().slice(0, 10)}`;
  if (!existsSync(bak)) copyFileSync(cfgPath, bak);
  console.log(`OK  cópia de segurança: ${bak}`);
}
const entrada = { type: 'stdio', command: uvxExe, args: ['windows-mcp', 'serve', '--exclude-tools', 'PowerShell,Registry'] };
cfg.mcpServers ??= {};
const igual = JSON.stringify(cfg.mcpServers['windows-mcp']) === JSON.stringify(entrada);
if (igual) console.log('OK  windows-mcp já estava registado em ~/.claude.json (sem alterações)');
else {
  cfg.mcpServers['windows-mcp'] = entrada;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  console.log(`OK  windows-mcp registado em ${cfgPath}`);
}

console.log('\nFalta só uma coisa, e é tua: fecha e abre a app Claude Code. A conversa nova passa a ter as ferramentas windows-mcp.');
console.log('Confirma com: npm run check:setup');
