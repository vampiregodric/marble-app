#!/usr/bin/env node
// Migra os trabalhos antigos para as tags da Secção 13: `products[]`
// ({ brand, item }, texto livre) → `brands[]` (as marcas, sem repetir) +
// `services[]` (o sistema/serviço, adivinhado por palavras-chave no título,
// no modelo e nos itens — só entre os serviços da categoria do trabalho).
//
// Por defeito é um ENSAIO: mostra o que faria e não escreve nada. Com
// `--apply` escreve no Firestore de DEV (recusa chaves do prod) e apaga
// `products` — mas só nos trabalhos em que reconheceu pelo menos um
// serviço, ou que não tinham itens; nos outros mantém `products` para o
// formulário do backoffice ainda mostrar o texto antigo à equipa.
// Trabalhos que já têm `services` ou `brands` não se tocam.
//
// Uso (a partir da raiz do projeto):
//   node scripts/migrate-work-tags.mjs <chave.json>            # ensaio
//   node scripts/migrate-work-tags.mjs <chave.json> --apply    # escreve
// Ou pelo npm: npm run works:migrate-tags -- ./serviceAccountKey.dev.json [--apply]
//
// A lista de serviços é a de WORK_SERVICES em src/firebase/models.ts — se
// mudar lá, muda aqui (este script é JavaScript puro, não importa o TS).

import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const keyPath = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');

if (!keyPath) {
  console.error('Uso: node scripts/migrate-work-tags.mjs <chave.json> [--apply]');
  process.exit(1);
}
const key = JSON.parse(readFileSync(keyPath, 'utf8'));
if (!String(key.project_id).endsWith('-dev')) {
  console.error(`Recusado: a chave é de ${key.project_id}; isto é só para o projeto de desenvolvimento.`);
  process.exit(1);
}
initializeApp({ credential: cert(key) });
const db = getFirestore();

// Palavras-chave por serviço, dentro de cada categoria. A ordem importa nos
// pares "mais específico primeiro": um "PPF Colorido" é `ppf-colour`, não
// `ppf`, por isso `ppf` só entra se `ppf-colour` não entrou (ver `excludes`).
const RULES = {
  Automotive: [
    { id: 'ppf-colour', re: /ppf[^.]*colori|ppf[^.]*colou?r|pel[ií]cula[^.]*colori/i },
    { id: 'ppf', re: /\bppf\b|pel[ií]cula de prote/i, excludes: ['ppf-colour'] },
    { id: 'vinyl', re: /vinil|vinyl|\bwrap\b/i },
    { id: 'detailing', re: /detail|polimento|corre[çc][ãa]o de pintura/i },
    { id: 'ceramic', re: /cer[âa]mic|coating/i },
    { id: 'starlight', re: /estrelado|starlight/i },
  ],
  'Epoxy Floors': [
    { id: 'metallic-epoxy', re: /metallic|met[áa]lic/i },
    { id: 'solid-colour-epoxy', re: /solid|cor s[óo]lida|s[óo]lida/i },
    { id: 'quartz-epoxy', re: /quartz|quartzo/i },
    { id: 'flake-epoxy', re: /flake|floco/i },
  ],
  Graphic: [
    { id: 'brand-identity', re: /identidade|rebrand|log[óo]tipo|branding/i },
    { id: 'vehicle-graphics', re: /viatura|frota|carrinha|decora[çc][ãa]o de ve/i },
    { id: 'signage', re: /montra|sinal[ée]tica/i },
    { id: 'print', re: /impress/i },
    { id: 'social-media', re: /redes sociais|social media|instagram/i },
  ],
};

function guessServices(work) {
  const rules = RULES[work.category] ?? [];
  const text = [work.title, work.model, ...(work.products ?? []).map((p) => `${p?.brand ?? ''} ${p?.item ?? ''}`)].filter(Boolean).join(' | ');
  const found = new Set();
  for (const r of rules) if (r.re.test(text)) found.add(r.id);
  for (const r of rules) if (r.excludes && r.excludes.some((x) => found.has(x))) found.delete(r.id);
  // Ordem estável: a da lista.
  return rules.map((r) => r.id).filter((id) => found.has(id));
}

function brandsOf(work) {
  const out = [];
  for (const p of work.products ?? []) {
    const b = (p?.brand ?? '').trim();
    if (b && !out.some((x) => x.toLowerCase() === b.toLowerCase())) out.push(b);
  }
  return out;
}

const snap = await db.collection('works').get();
let migrated = 0;
let skipped = 0;
let kept = 0;
const batch = db.batch();

for (const doc of snap.docs) {
  const w = { id: doc.id, ...doc.data() };
  const hasTags = (Array.isArray(w.services) && w.services.length > 0) || (Array.isArray(w.brands) && w.brands.length > 0);
  if (hasTags) {
    skipped++;
    console.log(`= ${w.id} · ${w.title} — já tem tags (${(w.services ?? []).join(', ') || 'sem serviço'}; ${(w.brands ?? []).join(', ') || 'sem marca'})`);
    continue;
  }
  const services = guessServices(w);
  const brands = brandsOf(w);
  const items = (w.products ?? []).map((p) => [p?.brand, p?.item].filter(Boolean).join(' · ')).filter(Boolean);
  const dropProducts = services.length > 0 || items.length === 0;
  const flag = services.length === 0 ? '!' : '+';
  console.log(
    `${flag} ${w.id} · ${w.title} [${w.category}]\n` +
      `    antes:  ${items.length ? items.join('; ') : '(sem produtos)'}\n` +
      `    depois: serviços = ${services.length ? services.join(', ') : '(nenhum reconhecido — escolhe no backoffice)'}; marcas = ${brands.length ? brands.join(', ') : '(nenhuma)'}` +
      (dropProducts ? '' : '\n    mantém `products` para a equipa ver o texto antigo no formulário.')
  );
  if (!dropProducts) kept++;
  if (apply) {
    const update = { services, brands, updatedAt: FieldValue.serverTimestamp() };
    if (dropProducts) update.products = FieldValue.delete();
    batch.update(doc.ref, update);
    migrated++;
  }
}

if (apply) {
  if (migrated > 0) await batch.commit();
  console.log(`\nEscritos ${migrated} trabalhos (${skipped} já tinham tags; ${kept} ficaram com \`products\` por não se reconhecer o serviço).`);
} else {
  console.log(`\nEnsaio: ${snap.size - skipped} trabalhos por migrar, ${skipped} já com tags. Corre outra vez com --apply para escrever.`);
}
