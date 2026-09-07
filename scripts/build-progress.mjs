// Gera a página de progresso (scripts/out/progress.html) a partir do
// ROADMAP.md da app (e do backoffice, se existir ao lado) e do histórico git.
// Não precisa de dependências. Uso: npm run progress
// Depois, publicar como Artifact (ver CLAUDE.md, "Página de progresso").

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backofficeRoot = resolve(root, '..', 'marble-backoffice');
const outFile = join(root, 'scripts', 'out', 'progress.html');

function git(args, cwd) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function repoStats(cwd) {
  if (!existsSync(join(cwd, '.git'))) return null;
  const count = Number(git('rev-list --count HEAD', cwd)) || 0;
  const first = git('log --reverse --format=%ad --date=short', cwd).split('\n')[0] || '';
  const last = git('log -1 --format=%ad --date=short', cwd) || '';
  const head = git('rev-parse --short HEAD', cwd) || '';
  return { count, first, last, head };
}

function classify(status) {
  const t = status.toLowerCase();
  if (/^ideia/.test(t)) return 'ideia';
  if (/^feito/.test(t)) return 'feito';
  if (/^parte \d+ feita/.test(t) || /em curso|em progresso|a correr/.test(t)) return 'curso';
  if (/^por fazer/.test(t)) return 'fazer';
  if (/bloquead/.test(t)) return 'curso';
  return 'outro';
}

function parseRoadmap(file, origin) {
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^### (Secção .+?)\s*$/);
    if (!m) continue;
    let status = '';
    for (let j = i + 1; j < lines.length && !lines[j].startsWith('### '); j++) {
      if (!lines[j].startsWith('**Estado:**')) continue;
      status = lines[j].replace('**Estado:**', '').trim();
      for (let k = j + 1; k < lines.length; k++) {
        const l = lines[k];
        if (!l.trim() || l.startsWith('**') || l.startsWith('### ')) break;
        status += ' ' + l.trim();
      }
      break;
    }
    const name = m[1].trim();
    const key = (name.match(/^Secção\s+(\S+)/) || [])[1] || name;
    const date = (status.match(/\d{4}-\d{2}-\d{2}/) || [])[0] || '';
    items.push({ key, name, status, kind: classify(status), date, origin });
  }
  return items;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function fmtDate(iso) {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[mo - 1]} ${y}`;
}
function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- dados ---------------------------------------------------------------
const app = parseRoadmap(join(root, 'ROADMAP.md'), 'app');
const bo = parseRoadmap(join(backofficeRoot, 'ROADMAP.md'), 'backoffice');
const byKey = new Map();
for (const it of app) byKey.set(it.key, it);
for (const it of bo) if (!byKey.has(it.key)) byKey.set(it.key, it);
const sections = [...byKey.values()];

const counts = { feito: 0, curso: 0, fazer: 0, ideia: 0, outro: 0 };
for (const s of sections) counts[s.kind]++;
const planned = sections.length - counts.ideia;
const pct = planned ? Math.round((counts.feito / planned) * 100) : 0;

const appStats = repoStats(root);
const boStats = repoStats(backofficeRoot);
const firstDay = [appStats?.first, boStats?.first].filter(Boolean).sort()[0] || '';
const lastDay = [appStats?.last, boStats?.last].filter(Boolean).sort().pop() || '';
const days = daysBetween(firstDay, lastDay);
const commits = (appStats?.count || 0) + (boStats?.count || 0);

const LABEL = { feito: 'Feito', curso: 'Em curso', fazer: 'Por fazer', ideia: 'Ideia', outro: 'Por confirmar' };
const now = new Date();
const stamp = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

// --- página --------------------------------------------------------------
const rows = sections
  .map((s) => {
    const extra = s.kind === 'feito' && s.date ? fmtDate(s.date) : s.kind === 'curso' ? esc(s.status.replace(/\*\*/g, '').slice(0, 110)) + (s.status.length > 110 ? '…' : '') : '';
    return `<li class="row ${s.kind}">
  <div class="row-main"><span class="name">${esc(s.name)}</span>${extra ? `<span class="sub">${extra}</span>` : ''}</div>
  <span class="pill ${s.kind}">${LABEL[s.kind]}</span>
</li>`;
  })
  .join('\n');

const html = `<title>Progresso Marble Studios</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500&family=Manrope:wght@400;600;700&display=swap">
<style>
  :root{
    --bg:#f7f5f0; --panel:#ffffff; --ink:#1c1a15; --ink-muted:#6b665c; --ink-faint:#9a9488;
    --line:rgba(28,26,21,0.12); --gold:#a8843f; --gold-soft:rgba(168,132,63,0.14);
    --ok:#2f6b3a; --ok-soft:rgba(47,107,58,0.12); --wait:#8a5a10; --wait-soft:rgba(138,90,16,0.12);
    --idea:#6b665c; --idea-soft:rgba(107,102,92,0.10);
    --font-body:'Manrope',system-ui,sans-serif; --font-eyebrow:'Jost',system-ui,sans-serif;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --bg:#0b0a08; --panel:#15130f; --ink:#f3efe6; --ink-muted:#a49d90; --ink-faint:#6f695e;
      --line:rgba(243,239,230,0.12); --gold:#d6b46a; --gold-soft:rgba(214,180,106,0.16);
      --ok:#9fd3a7; --ok-soft:rgba(159,211,167,0.14); --wait:#e6b96b; --wait-soft:rgba(230,185,107,0.14);
      --idea:#a49d90; --idea-soft:rgba(164,157,144,0.12);
    }
  }
  :root[data-theme="dark"]{
    --bg:#0b0a08; --panel:#15130f; --ink:#f3efe6; --ink-muted:#a49d90; --ink-faint:#6f695e;
    --line:rgba(243,239,230,0.12); --gold:#d6b46a; --gold-soft:rgba(214,180,106,0.16);
    --ok:#9fd3a7; --ok-soft:rgba(159,211,167,0.14); --wait:#e6b96b; --wait-soft:rgba(230,185,107,0.14);
    --idea:#a49d90; --idea-soft:rgba(164,157,144,0.12);
  }
  *{box-sizing:border-box}
  body{background:var(--bg);color:var(--ink);font-family:var(--font-body);margin:0;padding:40px 20px 64px}
  .wrap{max-width:760px;margin:0 auto}
  .eyebrow{font-family:var(--font-eyebrow);font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin:0 0 6px}
  h1{font-size:26px;font-weight:700;margin:0 0 4px;letter-spacing:-.01em;text-wrap:balance}
  .stamp{font-size:13px;color:var(--ink-muted);margin:0 0 28px}
  .meter-head{display:flex;justify-content:space-between;align-items:baseline;font-size:14px;color:var(--ink-muted);margin-bottom:8px}
  .meter-head strong{color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums}
  .meter{height:10px;border-radius:6px;background:var(--line);overflow:hidden;margin-bottom:26px}
  .meter i{display:block;height:100%;width:${pct}%;background:var(--gold);border-radius:6px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:30px}
  .kpi{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .kpi .l{font-size:12px;color:var(--ink-muted);margin-bottom:6px}
  .kpi .v{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
  .kpi .s{font-size:12px;color:var(--ink-faint);margin-top:6px}
  .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-muted);margin:0 0 12px}
  .legend span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
  .legend .feito::before{background:var(--ok)} .legend .curso::before{background:var(--wait)} .legend .fazer::before{background:var(--gold)} .legend .ideia::before{background:var(--idea)}
  ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
  .row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
  .row.curso{border-color:var(--gold)}
  .row-main{display:flex;flex-direction:column;gap:3px;min-width:0}
  .name{font-size:14px;font-weight:600}
  .row.fazer .name,.row.ideia .name{font-weight:400;color:var(--ink-muted)}
  .sub{font-size:12px;color:var(--ink-faint)}
  .pill{flex:none;font-family:var(--font-eyebrow);font-size:11px;letter-spacing:.06em;text-transform:uppercase;padding:4px 10px;border-radius:20px}
  .pill.feito{background:var(--ok-soft);color:var(--ok)} .pill.curso{background:var(--wait-soft);color:var(--wait)}
  .pill.fazer{background:var(--gold-soft);color:var(--gold)} .pill.ideia,.pill.outro{background:var(--idea-soft);color:var(--idea)}
  .foot{margin-top:28px;font-size:12px;color:var(--ink-faint);line-height:1.6}
</style>
<div class="wrap">
  <p class="eyebrow">Marble Studios</p>
  <h1>Progresso da app</h1>
  <p class="stamp">Atualizado a ${stamp} · a partir do ROADMAP.md${appStats ? ` (commit ${esc(appStats.head)})` : ''}</p>

  <div class="meter-head"><span>Secções concluídas</span><strong>${counts.feito} de ${planned} · ${pct}%</strong></div>
  <div class="meter" role="img" aria-label="Barra de progresso: ${pct} por cento"><i></i></div>

  <div class="kpis">
    <div class="kpi"><div class="l">Commits</div><div class="v">${commits}</div><div class="s">${appStats ? `app ${appStats.count}` : ''}${boStats ? ` · backoffice ${boStats.count}` : ''}</div></div>
    <div class="kpi"><div class="l">Dias de trabalho</div><div class="v">${days}</div><div class="s">${fmtDate(firstDay)} a ${fmtDate(lastDay)}</div></div>
    <div class="kpi"><div class="l">Em curso agora</div><div class="v">${counts.curso}</div><div class="s">${counts.fazer} por fazer · ${counts.ideia} ideia${counts.ideia === 1 ? '' : 's'}</div></div>
  </div>

  <p class="legend"><span class="feito">Feito</span><span class="curso">Em curso</span><span class="fazer">Por fazer</span><span class="ideia">Ideia (pós-lançamento)</span></p>
  <ul>
${rows}
  </ul>

  <p class="foot">Estados lidos das linhas <em>Estado:</em> de cada secção do ROADMAP.md da app${bo.length ? ' e do backoffice' : ''}. A percentagem não conta as ideias para depois do lançamento. Gerado por <code>npm run progress</code>.</p>
</div>
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html, 'utf8');
console.log(`Progresso: ${counts.feito} feitas, ${counts.curso} em curso, ${counts.fazer} por fazer, ${counts.ideia} ideia(s) — ${pct}% · ${commits} commits em ${days} dias`);
console.log(`Página escrita em ${outFile}`);
