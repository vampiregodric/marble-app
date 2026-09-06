#!/usr/bin/env node
// Emails do Firebase Auth (repor password — que é também o "define a tua
// password" das contas criadas por um pedido de orçamento —, verificar
// email, email alterado): mostra o estado dos templates e, com --apply,
// põe o idioma de reserva do projeto em português e o nome do remetente
// "Marble Studios" SEM personalizar assunto nem texto. Assim os templates
// continuam a ser os por defeito do Firebase, que saem em PT ou EN conforme
// o `auth.languageCode` que a app define pelo idioma do telemóvel (Secção
// 12); um template personalizado na consola ficaria só numa língua
// (decisão do Fábio, Secção 11 parte 2, 2026-09-06).
//
// Uso (dev ou prod — a chave de service account escolhe o projeto):
//   npm run auth:emails -- ./serviceAccountKey.dev.json           # só mostra
//   npm run auth:emails -- ./serviceAccountKey.prod.json --apply  # aplica
//
// Lê e escreve a configuração do projeto pela API do Identity Toolkit
// (admin/v2 …/config) com a chave; não mexe em mais nada.

import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const args = process.argv.slice(2);
const keyPath = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
if (!keyPath) {
  console.error('Uso: node scripts/auth-email-config.mjs <chave-service-account.json> [--apply]');
  process.exit(1);
}

const key = JSON.parse(readFileSync(keyPath, 'utf8'));
const auth = new GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const client = await auth.getClient();
const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${key.project_id}/config`;
const TEMPLATES = ['resetPasswordTemplate', 'verifyEmailTemplate', 'changeEmailTemplate'];

function show(config) {
  const n = config.notification ?? {};
  console.log(`Projeto ${key.project_id}`);
  console.log(`  idioma de reserva dos templates: ${n.defaultLocale ?? '(por definir = inglês)'}`);
  for (const name of TEMPLATES) {
    const t = n.sendEmail?.[name] ?? {};
    console.log(`  ${name}: remetente "${t.senderDisplayName ?? ''}" · assunto "${t.subject ?? ''}" · personalizado: ${t.customized ? 'SIM (fica só numa língua)' : 'não (localizado pela app)'}`);
  }
  const dns = n.sendEmail?.dnsInfo?.customDomainState;
  console.log(`  domínio próprio do remetente: ${dns && dns !== 'NOT_STARTED' ? dns : 'não configurado (noreply@' + key.project_id + '.firebaseapp.com)'}`);
}

const before = (await client.request({ url: base })).data;
show(before);

if (apply) {
  const sender = { senderDisplayName: 'Marble Studios' };
  const body = { notification: { defaultLocale: 'pt', sendEmail: Object.fromEntries(TEMPLATES.map((t) => [t, sender])) } };
  const mask = ['notification.defaultLocale', ...TEMPLATES.map((t) => `notification.sendEmail.${t}.senderDisplayName`)].join(',');
  await client.request({ url: `${base}?updateMask=${encodeURIComponent(mask)}`, method: 'PATCH', data: body });
  console.log('\nAplicado. Estado agora:');
  show((await client.request({ url: base })).data);
} else {
  console.log('\n(sem alterações — junta --apply para pôr o idioma de reserva em PT e o remetente "Marble Studios")');
}
