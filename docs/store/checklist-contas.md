# Checklist do Fábio — contas, pagamentos e segredos (Secção 11)

O que só tu podes fazer, por ordem. Cada passo tem o link, o que pedem e
quanto tempo costuma demorar. O que o Claude faz está no fim. Atualizado
a 2026-09-05.

## Ordem recomendada

Começa **hoje** pelo passo 1: é o que mais demora e destrava as duas lojas.
A Apple é o caminho crítico (2 a 4 semanas no pior caso); o Play aprova em
dias; o resto são minutos.

### 1. Número D-U-N-S da Cacto Elegante, Lda. — grátis, 0 a 3 semanas

As duas lojas exigem-no para contas de **organização** (Apple sempre; Google
Play desde 2023). Empresas registadas em Portugal costumam já ter um,
atribuído pela Informa D&B — por isso primeiro procura, só depois pedes.

- Procurar/pedir pela Apple (precisa de um Apple ID; ver passo 2):
  https://developer.apple.com/enroll/duns-lookup/
- Dados exatamente como no registo comercial: **Cacto Elegante, Lda.**, NIF
  519355849, Rua Quinta das Rosas 12A, 2840-131 Paio Pires, telefone e
  email da empresa.
- Se já existir: 0 dias. Se for novo: até 5 dias úteis para ser criado, e
  a Apple/Google só o veem até 14 dias depois. Não pagues serviços
  "expresso" da D&B — não são precisos.

### 2. Apple ID da empresa com verificação em dois passos — 15 min

- https://account.apple.com — usa **app@marble.pt** (a caixa existe e é
  lida) em vez de um email pessoal: a conta de developer fica ligada à
  empresa, não a uma pessoa. Liga a verificação em dois passos (obrigatória).

### 3. Apple Developer Program, como organização — 99 €/ano, 2 a 7 dias depois do D-U-N-S

- https://developer.apple.com/programs/enroll/ (entra com o Apple ID do
  passo 2; podes inscrever-te pela app "Apple Developer" no iPhone ou no
  site).
- Pedem: D-U-N-S, nome legal, morada, **site público com domínio associado
  à empresa** (se marble.pt não tiver site, diz-me: ligo o domínio
  `app.marble.pt` ao site das páginas legais em minutos, só preciso de
  acesso ao DNS), e que quem se inscreve tenha **poder para vincular a
  empresa** (gerente) ou uma carta de autorização. Costumam ligar por
  telefone para confirmar.
- O nome do vendedor na App Store passa a ser **Cacto Elegante, Lda.** (é
  sempre o nome legal). A app chama-se "Marble Studios" na mesma.
- Depois de aprovado: nada mais para já. O EAS cria as certificações de
  assinatura e a chave de push (APNs) sozinho na parte 2, com o teu login.

### 4. Google Play Console, como organização — 25 $ único, 1 a 7 dias

- https://play.google.com/console/signup com uma conta Google da empresa
  (podes usar a `v.godric@gmail.com` que já é dona do Firebase, mas o ideal
  é uma conta Google criada com app@marble.pt, para a Marble não depender de
  uma conta pessoal).
- Pedem: tipo de conta **Organização**, D-U-N-S, nome legal e morada, email
  de contacto (recebes um código), telefone (código por SMS), perfil de
  pagamentos (cartão para os 25 $), e o **nome de programador** que aparece
  na loja — põe **Marble Studios**.
- Requisitos oficiais: https://support.google.com/googleplay/android-developer/answer/6112435
- Vantagem de ser organização: as contas pessoais novas são obrigadas a um
  teste fechado com 12 testadores durante 14 dias antes de publicar; as de
  organização não.

### 5. Plano Blaze no projeto de produção — 5 min, sem cartão novo

- https://console.cloud.google.com/billing/projects → `marble-studios-prod`
  → ⋮ → **Change billing** → escolhe **My Billing Account**
  (`013056-591FBF-81EA13`, a mesma do dev). Não voltes a criar conta de
  faturação nem a usar o Visa Electron (ver DEVELOPMENT.md, "Blaze no dev").
- Sem isto não há Cloud Functions no prod: nem push, nem lembretes de
  checkup, nem limpeza no Cloudinary.

### 6. Segredos do Cloudinary no prod — 5 min, depois do passo 5

No teu PowerShell, na pasta do projeto (os valores estão em Cloudinary →
Settings → API Keys; o Claude nunca os vê):

```
npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_KEY --project prod
npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_SECRET --project prod
```

Se o primeiro comando falhar com "Secret Manager API has not been used",
espera um minuto e repete — é a API a ligar-se. Depois disto o Claude pode
fazer o deploy das Functions no prod (pede-te confirmação) e ligar
`CLOUDINARY_CLEANUP=on`.

### 7. Chave de push (FCM V1) do prod no EAS — 10 min

1. https://console.firebase.google.com/project/marble-studios-prod/settings/serviceaccounts/adminsdk
   → **Generate new private key** → guarda como `serviceAccountKey.prod.json`
   na pasta do projeto (o `.gitignore` já a exclui; nunca a envies por
   email/WhatsApp).
2. https://expo.dev/accounts/marble-studios/projects/marble-studios/credentials
   → Android → **pt.marble.app** → Service Credentials → FCM V1 → **substitui**
   a chave que lá está (é a do dev, carregada na Secção 6) por esta do prod.
   Desde a Secção 11, `pt.marble.app` é só produção.
3. A chave do dev (`serviceAccountKey.dev.json`) volta a ser carregada, no
   mesmo sítio, mas em **pt.marble.app.dev** — esse identificador só aparece
   no EAS depois da primeira build de desenvolvimento com o pacote novo
   (`npx.cmd eas-cli build --profile development --platform android`, quando
   quiseres; a dev build atual continua a funcionar até lá, mas sem push
   depois do passo 2).

### 8. Deploy das Functions no prod — 5 min, depois dos passos 5 e 6

Pede ao Claude (ou corre tu):

```
npx.cmd firebase-tools deploy --only functions --project prod
```

Falha 2 a 3 vezes na primeira vez por propagação de APIs — repetir resolve
(ver DEVELOPMENT.md, "Blaze no dev").

## Parte 2 (só depois das Secções 7, 8, 10 e 12 no master)

- **Conta de serviço do Google Play para o `eas submit`** (15 min): Play
  Console → Setup → API access → criar conta de serviço no Google Cloud →
  chave JSON → guardar como `serviceAccountKey.play.json` na pasta do projeto
  (já no `.gitignore`); dar-lhe permissões de "Release manager" na app.
- **Ficha da app** nas duas consolas com os textos de `docs/store/ficha-loja.md`
  e os formulários `data-safety.md` / `app-privacy.md`.
- **Conta de demonstração** para os revisores, criada no prod, com um carro
  com checkup pendente e alertas de exemplo.
- **Equipa com acesso ao backoffice no prod**: correr `scripts/set-admin.mjs`
  do backoffice com a chave do prod; publicar o backoffice num site de
  Hosting do prod (repositório do backoffice).
- **Domínio próprio** (opcional): `app.marble.pt` → Firebase Hosting, site
  `marble-studios-app` (dois registos DNS; SSL automático). Trocar os URLs na
  ficha das lojas.
- **Cláusula 5 dos termos** (fotos dos trabalhos no portfólio/redes sem
  identificar o dono, matrícula ocultada, salvo pedido em contrário) —
  confirmar com o dono; e **revisão por advogado** dos dois textos. Se
  mudarem: subir `LEGAL_VERSION`, `npm run build:legal`, publicar o Hosting.
- **iPhone** para testar a build iOS no TestFlight antes de submeter.

## O que o Claude já fez / faz sozinho (sem contas)

- Ícones, ícone adaptativo, splash, favicon e gráficos do Play a partir do
  logótipo (`npm run build:icons`).
- `app.json` / `app.config.js` / `eas.json` prontos para a build de
  produção; `.env.production` no git; `google-services.json` do dev na raiz
  (pacote `pt.marble.app.dev`) e o do prod no EAS.
- Regras e índices do Firestore publicados no prod; app Android registada no
  Firebase prod; páginas legais e de suporte publicadas em
  https://marble-studios-app.web.app/.
- Parte 2: build de produção, screenshots, `eas submit`, deploy das Functions
  no prod (com a tua confirmação).
