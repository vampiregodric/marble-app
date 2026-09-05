#!/usr/bin/env node
// Gera as páginas HTML públicas dos textos legais a partir de
// src/legal/texts.ts (a MESMA fonte que a app mostra no ecrã Legal):
//
//   docs/legal/politica-de-privacidade.html
//   docs/legal/termos-de-utilizacao.html
//   docs/legal/apagar-conta.html   (Google Play exige uma página web onde
//                                   se possa pedir a eliminação da conta)
//
// As lojas pedem um URL público da política de privacidade (Secção 11).
// A forma mais simples de publicar é GitHub Pages a servir a pasta docs/.
//
// Uso:  npm run build:legal
// Precisa de Node 22.6+ (importa o .ts diretamente, sem compilar).

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { LEGAL, LEGAL_VERSION, COMPANY, hasCompanyPlaceholders } = await import('../src/legal/texts.ts');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'legal');
mkdirSync(outDir, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `
  :root { color-scheme: dark; }
  body { margin: 0; background: #000; color: #f3efe6; font: 16px/1.6 -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 48px 24px 80px; }
  .eyebrow { color: #c6a15b; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; margin: 0 0 6px; }
  h1 { font-size: 30px; margin: 0 0 14px; }
  h2 { font-size: 18px; margin: 34px 0 8px; }
  p, li { color: #cfc8ba; }
  .intro { color: #cfc8ba; font-size: 17px; }
  ul { padding-left: 22px; }
  li { margin-bottom: 8px; }
  li::marker { color: #c6a15b; }
  a { color: #eccd8d; }
  nav { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 36px; font-size: 14px; }
  nav a { color: #9c9587; text-decoration: none; }
  nav a[aria-current] { color: #eccd8d; }
  footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid rgba(198,161,91,.22); color: #6b6459; font-size: 13px; }
`;

// Ligações da barra de navegação, relativas a docs/legal/ (as páginas legais)
// ou a docs/ (a página de entrada) — `base` ajusta o prefixo.
const NAV = [
  ['index.html', 'Início'],
  ['legal/politica-de-privacidade.html', 'Privacidade'],
  ['legal/termos-de-utilizacao.html', 'Termos'],
  ['legal/apagar-conta.html', 'Apagar conta'],
];

function page({ file, title, eyebrow, body, base = '../' }) {
  const nav = NAV.map(([href, label]) => {
    const current = href.endsWith(`/${file}`) || href === file;
    return `<a href="${base}${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('\n      ');
  return `<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — ${esc(COMPANY.brand)}</title>
  <style>${STYLE}</style>
</head>
<body>
  <main>
    <nav>
      ${nav}
    </nav>
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h1>${esc(title)}</h1>
${body}
    <footer>${esc(COMPANY.brand)} · Versão de ${LEGAL_VERSION} · Gerado a partir de src/legal/texts.ts — não editar à mão.</footer>
  </main>
</body>
</html>
`;
}

function renderLegal(doc) {
  const t = LEGAL[doc];
  const sections = t.sections
    .map((s) => {
      const ps = s.paragraphs.map((p) => `    <p>${esc(p)}</p>`).join('\n');
      const ul = s.bullets ? `    <ul>\n${s.bullets.map((b) => `      <li>${esc(b)}</li>`).join('\n')}\n    </ul>` : '';
      const after = (s.after ?? []).map((p) => `    <p>${esc(p)}</p>`).join('\n');
      return `    <h2>${esc(s.title)}</h2>\n${[ps, ul, after].filter(Boolean).join('\n')}`;
    })
    .join('\n');
  return `    <p class="intro">${esc(t.intro)}</p>\n${sections}`;
}

const DELETE_BODY = `    <p class="intro">Podes apagar a tua conta ${esc(COMPANY.brand)} e os dados pessoais associados a qualquer momento, de duas formas.</p>
    <h2>Na app</h2>
    <p>Abre o separador <strong>Perfil</strong>, desce até <strong>Conta</strong> e toca em <strong>Apagar conta</strong>. Confirma com a tua password. É imediato e definitivo.</p>
    <h2>Por email</h2>
    <p>Se já não tens a app instalada, escreve para <a href="mailto:${esc(COMPANY.privacyEmail)}">${esc(COMPANY.privacyEmail)}</a> a partir do email da tua conta, com o assunto "Apagar conta". Tratamos do pedido no prazo máximo de um mês e confirmamos por email.</p>
    <h2>O que é apagado e o que fica</h2>
    <ul>
      <li>Apagado de imediato: nome, email, telemóvel, preferências e o acesso à conta.</li>
      <li>Fica, sem qualquer ligação a ti: o histórico dos trabalhos feitos nos teus carros e chãos, para efeitos de garantia, portfólio e estatística.</li>
      <li>Faturas e documentos fiscais ficam fora da app pelo prazo legal.</li>
    </ul>
    <p>Mais detalhes na <a href="politica-de-privacidade.html">Política de Privacidade</a>, secção 6.</p>`;

// Página de entrada / suporte (docs/index.html). As lojas exigem um URL de
// suporte público além da política de privacidade (Secção 11); a Apple
// pede ainda que a eliminação de conta esteja explicada. Está em português
// com um resumo em inglês para os revisores das lojas.
const INDEX_BODY = `    <p class="intro">A app ${esc(COMPANY.brand)} é para os clientes acompanharem os trabalhos feitos nos seus carros e chãos, receberem lembretes de checkup, verem o portfólio e os eventos, e pedirem orçamentos. É gratuita, sem compras nem publicidade.</p>
    <h2>Suporte</h2>
    <p>Dúvidas, problemas com a app ou com a tua conta: escreve para <a href="mailto:${esc(COMPANY.privacyEmail)}">${esc(COMPANY.privacyEmail)}</a>. Respondemos em dias úteis. Para assuntos sobre os teus dados pessoais (acesso, correção, eliminação), o prazo legal de resposta é de um mês.</p>
    <h2>Apagar a conta</h2>
    <p>Na app: <strong>Perfil</strong> → <strong>Conta</strong> → <strong>Apagar conta</strong>. Sem a app: <a href="legal/apagar-conta.html">pedido por email</a>.</p>
    <h2>Documentos</h2>
    <ul>
      <li><a href="legal/politica-de-privacidade.html">Política de Privacidade</a></li>
      <li><a href="legal/termos-de-utilizacao.html">Termos de Utilização</a></li>
      <li><a href="legal/apagar-conta.html">Apagar a minha conta</a></li>
    </ul>
    <h2>Quem somos</h2>
    <p>${esc(COMPANY.brand)} é uma marca de ${esc(COMPANY.legalName)}, NIF ${esc(COMPANY.nif)}, ${esc(COMPANY.address)}.</p>
    <h2>English</h2>
    <p>The ${esc(COMPANY.brand)} app lets customers follow the work done on their cars and floors, receive checkup reminders, browse the portfolio and events, and request quotes. It is free, with no purchases or ads. Support: <a href="mailto:${esc(COMPANY.privacyEmail)}">${esc(COMPANY.privacyEmail)}</a>. To delete your account: Profile → Account → Delete account, or email us from the address on your account. The privacy policy and terms above are available in Portuguese.</p>`;

const files = [
  { dir: outDir, file: 'politica-de-privacidade.html', title: LEGAL.privacy.title, eyebrow: `App ${COMPANY.brand}`, body: renderLegal('privacy') },
  { dir: outDir, file: 'termos-de-utilizacao.html', title: LEGAL.terms.title, eyebrow: `App ${COMPANY.brand}`, body: renderLegal('terms') },
  { dir: outDir, file: 'apagar-conta.html', title: 'Apagar a minha conta', eyebrow: `App ${COMPANY.brand}`, body: DELETE_BODY },
  { dir: join(root, 'docs'), file: 'index.html', title: `App ${COMPANY.brand}`, eyebrow: 'Suporte', body: INDEX_BODY, base: '' },
];

for (const f of files) {
  writeFileSync(join(f.dir, f.file), page(f), 'utf8');
  console.log(`  ${f.dir === outDir ? 'docs/legal/' : 'docs/'}${f.file}`);
}

if (hasCompanyPlaceholders()) {
  console.warn('\nAVISO: ainda há "[A PREENCHER" em COMPANY (src/legal/texts.ts). Preenche antes de publicar (Secção 11).');
}
console.log(`Gerado a partir da versão ${LEGAL_VERSION}.`);
