# Checklist do Fábio — contas, pagamentos e segredos (Secção 11)

O que só tu podes fazer, por ordem. Cada passo tem o link, o que pedem e
quanto tempo costuma demorar. O que o Claude faz está no fim. Atualizado
a 2026-09-05.

## Ordem recomendada

Começa **hoje** pelo passo 1: é o que mais demora e destrava as duas lojas.
A Apple é o caminho crítico (2 a 4 semanas no pior caso); o Play aprova em
dias; o resto são minutos.

### 1. Número D-U-N-S da Cacto Elegante, Lda. — FEITO (2026-09-06)

**D-U-N-S: 348571438** (já existia na D&B; a Apple enviou-o por email a
2026-09-06). Serve para a Apple e para o Google Play. Atenção: o registo
da D&B tem a morada como "Rua Quinta das Rosas, 12H" e os textos legais da
app dizem "12A" — confirmar na certidão permanente qual é o certo e alinhar
o outro lado.

Instruções originais, para referência:

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

### 2. Apple ID da empresa com verificação em dois passos — FEITO (2026-09-06)

- Apple ID **app@marble.pt**, com verificação em dois passos; foi o usado
  na procura do D-U-N-S e na inscrição do passo 3. A conta de developer
  fica ligada à empresa, não a uma pessoa.

### 3. Apple Developer Program, como organização — SUBMETIDO (2026-09-06), à espera da Apple

**Enrollment ID: KM69M55CW8**, Apple ID `app@marble.pt`, entidade
"Company / Organization", site `https://app.marble.pt`, autoridade
"owner/founder". A Apple verifica a autoridade de assinatura (email e/ou
chamada) e envia depois um email com o link para pagar os 99 € e concluir.
Estado a acompanhar em https://developer.apple.com/enroll/ (entrar com o
app@marble.pt). Instruções originais, para referência:

- https://developer.apple.com/programs/enroll/ (entra com o Apple ID do
  passo 2; podes inscrever-te pela app "Apple Developer" no iPhone ou no
  site).
- Pedem: D-U-N-S (348571438), nome legal, morada, **site público com
  domínio associado à empresa** — usar `https://app.marble.pt` (ligado a
  2026-09-06 às páginas de suporte e legais; o marble.pt em si não tem
  site) — e que quem se inscreve tenha **poder para vincular a empresa**
  (gerente) ou uma carta de autorização. Costumam ligar por telefone para
  confirmar.
- O nome do vendedor na App Store passa a ser **Cacto Elegante, Lda.** (é
  sempre o nome legal). A app chama-se "Marble Studios" na mesma.
- Depois de aprovado: nada mais para já. O EAS cria as certificações de
  assinatura e a chave de push (APNs) sozinho na parte 2, com o teu login.

### 4. Google Play Console, como organização — CRIADA (2026-09-06), verificações pendentes

Conta **Marble Studios Portugal** (organização, Account ID
6700585085532729198), dona: `v.godric@gmail.com`, contacto app@marble.pt,
25 $ pagos. Verificações da página inicial da Play Console:
(a) **identidade** — documentos carregados a 2026-09-06, em análise pela
Google (dias; responde por email); (b) **site da organização** — **FEITO
2026-09-07** ("Website verified": `https://app.marble.pt`, provado na Search
Console com a propriedade Domain `marble.pt`); (c) **telefones** — só
depois de (a) aprovada. Sem as três não se publica.

Nota sobre a Search Console: o marble.pt tem **dois donos**, cada um com o
seu registo TXT `google-site-verification=...` no DNS (cPanel da PTisp):
o primeiro foi feito por engano com outra conta Google do Fábio, o segundo
com a `v.godric@gmail.com` (a dona da Play Console). Não apagar nenhum dos
dois TXT, senão a conta correspondente perde a verificação.
Instruções originais, para referência:

- https://play.google.com/console/signup com uma conta Google da empresa
  (podes usar a `v.godric@gmail.com` que já é dona do Firebase, mas o ideal
  é uma conta Google criada com app@marble.pt, para a Marble não depender de
  uma conta pessoal).
- Pedem: tipo de conta **Organização**, D-U-N-S, nome legal e morada, email
  de contacto (recebes um código), telefone (código por SMS), perfil de
  pagamentos (cartão para os 25 $), e o **nome de programador** que aparece
  na loja — **Marble Studios Portugal** ("Marble Studios" já estava
  registado por outra conta no Play; decidido 2026-09-06).
- Requisitos oficiais: https://support.google.com/googleplay/android-developer/answer/6112435
- Vantagem de ser organização: as contas pessoais novas são obrigadas a um
  teste fechado com 12 testadores durante 14 dias antes de publicar; as de
  organização não.

### 5. Plano Blaze no projeto de produção — FEITO (2026-09-06)

- Feito pela consola do Firebase (Usage and billing → Upgrade → My Billing
  Account). A página do Google Cloud "Change billing" dizia "No available
  billing accounts" e não deixou; o caminho pelo Firebase funcionou.
- Sem isto não havia Cloud Functions no prod: nem push, nem lembretes de
  checkup, nem limpeza no Cloudinary.

### 6. Segredos do Cloudinary no prod — FEITO (2026-09-06)

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

O preset unsigned `marble-requests` (fotos dos pedidos de orçamento, Secção
7) vive na mesma conta Cloudinary que o dev, por isso já serve o prod — só
confirma na consola do Cloudinary que existe.

### 6b. Chave do Resend no prod (emails dos pedidos de orçamento) — FEITO (2026-09-06)

A Secção 7 envia por email cada pedido de orçamento (à equipa e a
confirmação ao cliente) através do Resend, com o domínio marble.pt
verificado lá. No prod é preciso o mesmo segredo:

```
npx.cmd firebase-tools functions:secrets:set RESEND_API_KEY --project prod
```

(a chave está em https://resend.com → API Keys; a mesma do dev serve). Sem a
chave o pedido chega na mesma ao Painel e à app; só o email fica por enviar.

### 6c. Domínio marble.pt no Resend — FEITO (2026-09-07)

Domínio `marble.pt` verificado no Resend (região Irlanda, eu-west-1) com
quatro registos no cPanel da PTisp: TXT `resend._domainkey` (DKIM), CNAME
`rsend` e `send` (SPF/return-path do Resend), TXT `_dmarc` (`v=DMARC1;
p=none;`). "Enable Receiving" ficou desligado de propósito (mudaria o MX e
o email atual deixava de chegar). Logo a seguir o Claude pôs
`QUOTE_EMAIL=on` e `BACKOFFICE_URL=https://marble-studios-backoffice.web.app`
em `functions/.env.marble-studios-prod` e republicou as Functions no prod:
os pedidos de orçamento em produção passam a enviar email à equipa
(quotes@marble.pt, caixa confirmada) e a confirmação ao cliente, ambos de
app@marble.pt. Instruções originais, para referência:

A conta do Resend não tinha domínio. Sem ele o Resend só envia do
endereço de teste dele, e os emails "de app@marble.pt" são recusados.

- https://resend.com/domains → **Add domain** → `marble.pt` → o Resend
  mostra 2 ou 3 registos DNS (TXT/MX/CNAME) para copiar para o painel onde
  o domínio marble.pt está registado (o registrar ou o alojamento). A
  verificação demora de minutos a algumas horas.
- Quando estiver "Verified", diz ao Claude: ele muda `QUOTE_EMAIL=off` →
  `on` e põe o `BACKOFFICE_URL` do backoffice de produção em
  `functions/.env.marble-studios-prod` e faz novo deploy das Functions no
  prod. Até lá os pedidos de orçamento chegam ao Painel e à app, sem email.

### 6d. Trocar as chaves que ficaram na conversa — 10 min, antes do lançamento

A chave do Resend e o API secret do Cloudinary foram colados por engano no
chat com o Claude a 2026-09-06. Não é grave (a conversa é privada), mas
antes do lançamento convém rodá-los:

- Resend: https://resend.com/api-keys → apagar a chave atual, **Create API
  Key** → correr outra vez `npx.cmd firebase-tools functions:secrets:set
  RESEND_API_KEY --project prod` (e `--project dev`) com a nova.
- Cloudinary: **Settings → API Keys → Generate New API Key**, desativar a
  "Root" antiga → correr outra vez os dois comandos `CLOUDINARY_API_KEY` e
  `CLOUDINARY_API_SECRET` (prod e dev) com o par novo. O cloud name não muda.
- Depois de cada troca, pedir ao Claude um novo deploy das Functions
  (`deploy --only functions --project prod`), para as funções passarem a
  ler a versão nova do segredo.

Regra para o futuro: as chaves colam-se só na janela do PowerShell, na
pergunta `Enter a value for …`, nunca na conversa.

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
   mesmo sítio, mas em **pt.marble.app.dev**. A primeira build de
   desenvolvimento com o pacote novo foi lançada a 2026-09-06
   (https://expo.dev/accounts/marble-studios/projects/marble-studios/builds/419b6df0-fb60-4cf6-b610-81d5f8f69a82),
   por isso o identificador já aparece nas credenciais do EAS. Instala o
   APK dessa build no telemóvel ("Marble Dev", fica ao lado da app antiga)
   e carrega lá a chave; a dev build antiga (`pt.marble.app`) deixa de
   receber push depois do passo 2.

### 8. Deploy das Functions no prod — FEITO (2026-09-06)

As seis Functions estão no prod (`functions:list --project prod`), com
`functions/.env.marble-studios-prod` (limpeza do Cloudinary ligada; emails
dos orçamentos desligados até ao passo 6c). Para republicar, pede ao Claude
(ou corre tu):

```
npx.cmd firebase-tools deploy --only functions --project prod
```

Falha 2 a 3 vezes na primeira vez por propagação de APIs — repetir resolve
(ver DEVELOPMENT.md, "Blaze no dev").

## Parte 2 — o que fica à espera das contas

As Secções 7, 8, 10, 12 e 13 já estão no master e o que não dependia das
contas ficou feito a 2026-09-06 (regras no prod, dev build nova, emails do
Auth no dev, tecto diário de pedidos, docs das lojas revistos). A ordem do
que falta está no ROADMAP, Secção 11, "Bloqueado nas contas". Do teu lado:

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
- **Emails do Firebase Auth no prod** (5 min). Decisão de 2026-09-06: os
  templates ficam **por defeito** — a app diz ao Firebase o idioma do
  telemóvel e o email "repor password" (que é também o "define a tua
  password" das contas criadas por um pedido de orçamento) sai em PT ou EN
  sozinho; um template personalizado ficaria só numa língua. Muda-se só o
  idioma de reserva do projeto para português e o nome do remetente para
  "Marble Studios". No dev já está. No prod, uma de duas:
  - com a chave do prod do passo 7.1 na pasta do projeto, pede ao Claude
    `npm run auth:emails -- ./serviceAccountKey.prod.json --apply` (mostra
    o estado antes e depois e confirma que nenhum template ficou
    personalizado);
  - ou na consola: https://console.firebase.google.com/project/marble-studios-prod/authentication/emails
    → lápis ao lado de "Idioma do modelo" (Template language) → Português;
    e em cada template, só o campo **Nome do remetente** → `Marble Studios`
    (não toques no assunto nem na mensagem).
  Opcional, precisa do DNS: no mesmo ecrã, "Personalizar domínio" põe o
  remetente em `noreply@marble.pt` em vez de `noreply@marble-studios-prod.firebaseapp.com`
  (registos DNS como no Resend).

## Depois das lojas — Secção 11c, App Check (anti-spam a sério)

Só faz sentido quando as duas contas existirem, e a app usa o SDK JS do
Firebase, por isso é uma mini-secção própria (o Claude faz o código; tu
destravas três coisas):

1. **Play Console → App integrity → Play Integrity API → Link Cloud
   project** → escolhe `marble-studios-prod` (e `marble-studios-dev`, se
   quiseres testar a sério no dev). Sem isto o Android não recebe tokens.
2. **Apple Developer → Certificates, Identifiers & Profiles → Keys → +** →
   ativa **DeviceCheck** → descarrega o `.p8` (uma vez só; guarda-o) e
   anota o **Key ID** e o **Team ID**. É o que a consola do Firebase pede ao
   registar a app iOS no App Check.
3. Dá ao Claude luz verde para a build nova: entra o módulo nativo
   `@react-native-firebase/app-check` (Play Integrity + App Attest com
   DeviceCheck de reserva, debug tokens nas dev builds), a ponte para o SDK
   JS, o registo das apps no App Check (SHA-256 do keystore do EAS, chave
   DeviceCheck, reCAPTCHA para a app web), e a criação do pedido de
   orçamento passa para uma Cloud Function callable com `enforceAppCheck`
   — assim só os pedidos ficam protegidos e o backoffice não muda. Primeiro
   em modo "só regista" (métricas na consola), depois obrigatório.

Até lá, a defesa do lado do servidor é o tecto diário de pedidos
(`REQUEST_DAILY_CAP` em `functions/.env`, ver DEVELOPMENT.md).

## O que o Claude já fez / faz sozinho (sem contas)

- Ícones, ícone adaptativo, splash, favicon e gráficos do Play a partir do
  logótipo (`npm run build:icons`).
- `app.json` / `app.config.js` / `eas.json` prontos para a build de
  produção; `.env.production` no git; `google-services.json` do dev na raiz
  (pacote `pt.marble.app.dev`) e o do prod no EAS.
- Regras e índices do Firestore publicados no prod (republicados a
  2026-09-06); app Android registada no Firebase prod; páginas legais e de
  suporte publicadas em https://marble-studios-app.web.app/.
- 2026-09-06: dev build "Marble Dev" (`pt.marble.app.dev`) lançada no EAS;
  emails do Auth no dev (idioma de reserva PT, remetente "Marble Studios");
  tecto diário de pedidos nas Functions; `data-safety.md`, `app-privacy.md`
  e `ficha-loja.md` revistos contra a app atual (prontos a copiar).
- Falta (com a tua confirmação em cada passo): deploy das Functions no prod
  depois da Secção 12b, builds de produção, screenshots, `eas submit`, conta
  de demonstração no prod.
