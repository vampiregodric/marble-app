// Gera a página privada da auditoria (scripts/out/auditoria.html) a partir
// do relatório mais recente em auditorias/AAAA-MM-DD.md. Sem dependências.
// Uso: npm run auditoria:pagina [-- auditorias/2026-09-12.md]
// Depois, publicar como Artifact (ver auditorias/README.md e a skill
// .claude/skills/auditoria/SKILL.md, Fase 3).

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'auditorias');
const outFile = join(root, 'scripts', 'out', 'auditoria.html');

function latestReport() {
  const arg = process.argv[2];
  if (arg) return resolve(root, arg);
  if (!existsSync(dir)) throw new Error('não existe a pasta auditorias/');
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}(-\d+)?\.md$/.test(f))
    .sort()
    .reverse();
  if (!files.length) throw new Error('não há relatórios em auditorias/');
  return join(dir, files[0]);
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    meta[kv[1]] = v;
  }
  return { meta, body: text.slice(m[0].length) };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SEVERITIES = ['Crítico', 'Alto', 'Médio', 'Baixo', 'Sugestão'];
const SEV_CLASS = { Crítico: 'critico', Alto: 'alto', Médio: 'medio', Baixo: 'baixo', Sugestão: 'sugestao' };

function inline(s) {
  const parts = s.split(/(`[^`]*`)/);
  return parts
    .map((p) => {
      if (p.startsWith('`') && p.endsWith('`') && p.length >= 2) return `<code>${esc(p.slice(1, -1))}</code>`;
      let t = esc(p);
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      t = t.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
      return t;
    })
    .join('');
}

function slug(s) {
  return s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

function render(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  const toc = [];
  let i = 0;
  const listStack = []; // { tag, indent }
  const closeLists = (toIndent = -1) => {
    while (listStack.length && listStack[listStack.length - 1].indent > toIndent) out.push(`</${listStack.pop().tag}>`);
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      closeLists();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeLists();
      const level = h[1].length;
      const text = inline(h[2]);
      const id = slug(h[2]);
      if (level === 2) toc.push({ id, text });
      const sevMatch = level === 3 && h[2].match(/^([A-Z]+(?:-[A-Z]+)?-\d+)\s+—\s+/);
      out.push(`<h${level} id="${id}"${sevMatch ? ' class="achado"' : ''}>${text}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      closeLists();
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push('<div class="tabela"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
      for (const r of rows) {
        out.push('<tr>' + r.map((c) => {
          const cls = SEV_CLASS[c] ? ` class="sev ${SEV_CLASS[c]}"` : '';
          return `<td${cls}>${inline(c)}</td>`;
        }).join('') + '</tr>');
      }
      out.push('</tbody></table></div>');
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      closeLists();
      out.push('<hr>');
      i++;
      continue;
    }
    const li = line.match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/);
    if (li) {
      const indent = li[1].length;
      const tag = /\d/.test(li[2]) ? 'ol' : 'ul';
      closeLists(indent);
      const top = listStack[listStack.length - 1];
      if (!top || top.indent < indent) {
        listStack.push({ tag, indent });
        out.push(`<${tag}>`);
      }
      let text = li[3];
      // "**Severidade:** Alto" e "**Estado:** aberto" ganham cor, estejam
      // sozinhos na linha ou juntos com a vertente e a superfície.
      text = text.replace(/\*\*Severidade:\*\*\s*(Crítico|Alto|Médio|Baixo|Sugestão)/g, (_, s) => `**Severidade:** <span class="sev ${SEV_CLASS[s]}">${s}</span>`);
      text = text.replace(/\*\*Estado:\*\*\s*(aberto|corrigido|aceite|descartado)/g, (_, s) => `**Estado:** <span class="estado ${s}">${s}</span>`);
      // Continuações indentadas da mesma entrada.
      let j = i + 1;
      while (j < lines.length && /^\s{2,}\S/.test(lines[j]) && !/^\s*([-*]|\d+[.)])\s+/.test(lines[j])) text += ' ' + lines[j++].trim();
      const html = inline(text).replace(/&lt;span class=&quot;(sev|estado) ([a-z]+)&quot;&gt;([^&]*)&lt;\/span&gt;/g, '<span class="$1 $2">$3</span>');
      out.push(`<li>${html}</li>`);
      i = j;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    closeLists();
    const para = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*\||---|\s*([-*]|\d+[.)])\s)/.test(lines[i])) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  closeLists();
  return { html: out.join('\n'), toc };
}

const file = latestReport();
const { meta, body } = parseFrontmatter(readFileSync(file, 'utf8'));
const { html, toc } = render(body);
const vertentes = Array.isArray(meta.vertentes) ? meta.vertentes.join(', ') : meta.vertentes || '';

const page = `<title>Auditoria Marble Studios</title>
<style>
  :root { --bg: #f6f4ef; --card: #ffffff; --ink: #1f1d1a; --muted: #6b655c; --line: #e2ddd2; --accent: #8a6d1f;
    --critico: #b3261e; --alto: #c2410c; --medio: #a16207; --baixo: #3f6212; --sugestao: #475569;
    --aberto: #b3261e; --corrigido: #3f6212; --aceite: #475569; --descartado: #6b655c; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #16150f; --card: #1f1e17; --ink: #ece7db; --muted: #a39d90; --line: #33312a; --accent: #d4b25a;
    --critico: #ff8a80; --alto: #fdba74; --medio: #fde047; --baixo: #bef264; --sugestao: #cbd5e1;
    --aberto: #ff8a80; --corrigido: #bef264; --aceite: #cbd5e1; --descartado: #a39d90; } }
  :root[data-theme="dark"] { --bg: #16150f; --card: #1f1e17; --ink: #ece7db; --muted: #a39d90; --line: #33312a; --accent: #d4b25a;
    --critico: #ff8a80; --alto: #fdba74; --medio: #fde047; --baixo: #bef264; --sugestao: #cbd5e1;
    --aberto: #ff8a80; --corrigido: #bef264; --aceite: #cbd5e1; --descartado: #a39d90; }
  body { background: var(--bg); color: var(--ink); font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 32px 20px 80px; }
  header h1 { font-size: 28px; margin: 0 0 6px; }
  header .meta { color: var(--muted); font-size: 13px; display: flex; flex-wrap: wrap; gap: 6px 18px; }
  nav.toc { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px 18px; margin: 22px 0; }
  nav.toc a { display: inline-block; margin: 2px 14px 2px 0; color: var(--accent); text-decoration: none; font-size: 14px; }
  h2 { font-size: 21px; margin: 40px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  h3 { font-size: 17px; margin: 28px 0 8px; }
  h3.achado { background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 8px; padding: 10px 14px; margin-top: 24px; }
  h4 { font-size: 15px; margin: 18px 0 6px; color: var(--muted); }
  p { margin: 8px 0; }
  ul, ol { margin: 6px 0 10px; padding-left: 22px; }
  li { margin: 3px 0; }
  code { font: 13px/1.4 ui-monospace, Consolas, monospace; background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
  pre { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; overflow-x: auto; }
  pre code { border: 0; padding: 0; background: transparent; }
  .tabela { overflow-x: auto; margin: 10px 0 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; background: var(--card); }
  th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: var(--bg); }
  .sev { font-weight: 600; }
  .sev.critico { color: var(--critico); } .sev.alto { color: var(--alto); } .sev.medio { color: var(--medio); }
  .sev.baixo { color: var(--baixo); } .sev.sugestao { color: var(--sugestao); }
  .estado { font-weight: 600; }
  .estado.aberto { color: var(--aberto); } .estado.corrigido { color: var(--corrigido); }
  .estado.aceite { color: var(--aceite); } .estado.descartado { color: var(--descartado); }
  a { color: var(--accent); }
  hr { border: 0; border-top: 1px solid var(--line); margin: 24px 0; }
</style>
<div class="wrap">
  <header>
    <h1>Auditoria Marble Studios</h1>
    <div class="meta">
      <span>Data: <strong>${esc(meta.data || basename(file, '.md'))}</strong></span>
      <span>Modo: ${esc(meta.modo || '')}</span>
      <span>App: <code>${esc(meta.app_commit || '')}</code></span>
      <span>Backoffice: <code>${esc(meta.backoffice_commit || '')}</code></span>
      <span>Vertentes: ${esc(vertentes)}</span>
      <span>Agentes: ${esc(meta.agentes || '')}</span>
      <span>Ficheiro: <code>auditorias/${esc(basename(file))}</code></span>
    </div>
  </header>
  <nav class="toc">${toc.map((t) => `<a href="#${t.id}">${t.text}</a>`).join('')}</nav>
  ${html}
</div>
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, page, 'utf8');
console.log(`Página escrita em ${outFile} a partir de ${file} (${SEVERITIES.length} níveis de severidade reconhecidos).`);
