# Marble Studios App — notas de desenvolvimento

## Como correr o projeto

```
npx expo start --web      # preview no browser
npx expo start            # QR code para abrir na app Expo Go (Android/iOS)
```

**Se o PowerShell disser "running scripts is disabled on this system"**:
usa `npx.cmd` em vez de `npx` (ex: `npx.cmd expo start --web`). O `.cmd`
contorna a política de execução sem mexer em definições do Windows.

**Servidor para o telemóvel gerido pelo Claude (desde 2026-09-03):** em vez
de o Fábio correr `expo start` numa janela dele, o Claude arranca-o com a
configuração `marble-app-phone` de `.claude/launch.json` (porta 8081,
projeto principal, `--clear`), mesmo estando num worktree — o Expo aceita
`expo start <pasta>`. Vantagens: reinícios e limpeza de cache ficam do lado
do Claude, sem pedir nada ao Fábio. Regras: (1) só um servidor na 8081 —
se houver um `expo start` manual a correr, o Claude para-o com autorização
antes de arrancar o dele; (2) o servidor morre quando a conversa fecha, por
isso cada conversa nova arranca-o outra vez; (3) no telemóvel o Expo Go
liga-se ao mesmo endereço de sempre (`exp://<IP do PC>:8081`) — basta
RELOAD ou reabrir a app. Para a pré-visualização web num worktree continua
a usar-se `marble-app-web-8082` (ou `marble-app-web`, na 8083, quando há
duas secções em paralelo — uma por porta).

**Worktree novo:** copiar o `.env` do checkout principal e correr `npm ci`
na raiz **e em `functions/`** — o `npm run typecheck` da raiz também
compila `functions/src`, e sem as dependências das Functions dá erros
`Cannot find module 'firebase-functions/...'` que não são do teu código.

## Estado atual

Os seis ecrãs leem o Firestore de dev em tempo real (Secção 4, 2026-09-03):
- `src/screens/HomeScreen.tsx` — Início: carrossel = `works` com
  `featured: true`; ponto no sino = alertas por ler; cartões dos seis
  departamentos com a foto escolhida pela equipa (`settings/home`), cada
  um abre a página de serviços do departamento (Secção 9); botão do Perfil
  mostra a foto do cliente quando existe
- `src/screens/DepartmentScreen.tsx` — página de serviços de um
  departamento: conteúdo estático de `src/data/departmentContent.ts`,
  foto de `settings/home`, trabalhos recentes da categoria (`works`)
- `src/screens/PortfolioScreen.tsx` — Portfólio: `works` publicados
- `src/screens/WorkDetailScreen.tsx` — Detalhe: um doc de `works`, com a
  galeria `media[]` deslizável no topo e visualizador em ecrã inteiro
  (fotos + vídeo)
- `src/screens/EventsScreen.tsx` — Eventos: `events` (Próximos/Passados)
- `src/screens/AlertsScreen.tsx` — Alertas: `notifications` do uid; no
  telemóvel, cartão "Ativar notificações" até o push estar ativo
- `src/screens/ProfileScreen.tsx` — Perfil: `clients/{uid}` + `vehicles`;
  tocar no avatar muda/remove a foto de perfil (Cloudinary); "Os teus
  pedidos" (`requests` do uid, estado em tempo real)
- `src/screens/RequestQuoteScreen.tsx` — Pedir orçamento (Secção 7): a
  partir de um trabalho ("Pedir orçamento semelhante"), de um departamento
  (Secções 9/10) ou do Perfil; sem sessão cria a conta na hora

Já não há arrays de exemplo em nenhum ecrã. Ver "Dados reais" abaixo.
Todos os textos da interface existem em **PT e EN** (Secção 12,
2026-09-05), em `src/i18n/` — ver "Idiomas" abaixo antes de escrever
qualquer texto novo num ecrã.

## Por fazer a seguir

1. **Firebase real** — feito (2026-09-03): `marble-studios-dev` e
   `marble-studios-prod` existem, com Firestore (`eur3`, production mode) e
   Auth (email/password) ativos; config nos `.env` / `.env.production`.
   Ver "Firebase: os dois projetos" abaixo para o que falta (regras + seed).
2. **Autenticação** — feito (2026-09-03): ver "Autenticação" abaixo.
3. **Ligar os ecrãs ao Firestore** — feito (2026-09-03): ver "Dados reais"
   abaixo.
4. **Painel da equipa (backoffice)** — feito (2026-09-03): projeto
   separado em `C:\Users\VGodr\Projects\marble-backoffice`, publicado em
   https://marble-studios-backoffice-dev.web.app. Ver "Backoffice" abaixo.
5. **Notificações push** — feito (Secção 6, 2026-09-04): Cloud Functions
   em `functions/` (acompanhamento por trabalho, novo trabalho, eventos,
   retenção, Cloudinary) + `expo-notifications` na app. Ver "Notificações
   push e Cloud Functions" abaixo. Publicado no dev; dev build Android no
   telemóvel do Fábio. Pendente: segredos do Cloudinary (`CLOUDINARY_CLEANUP`).
6. **Fotos reais** — feito (Secções 5 e 5b, 2026-09-04): tudo no
   **Cloudinary** (plano gratuito). A equipa carrega as fotos e vídeos dos
   trabalhos no backoffice; a app só recebe URLs (`photoUrl` = capa,
   `media[]` = galeria) e cai num gradiente dourado quando estão vazios
   (`src/components/Photo.tsx`). O cliente carrega uma única foto: a de
   perfil (preset `marble-avatars`). A foto embutida do Jaguar
   (`src/data/localPhotos.ts`) foi apagada — a real está no Cloudinary;
   `assets/work-jaguar-purple.jpg` fica só como ficheiro de origem, a app
   não o usa. Ver "Galeria, fotos dos serviços e foto de perfil" abaixo.
7. **Lançamento nas lojas** — parte 1 feita (Secção 11, 2026-09-05):
   ícones/splash finais, variantes dev/prod, perfil de produção do EAS,
   regras e app Android no Firebase prod, páginas legais publicadas em
   https://marble-studios-app.web.app/, ficha das lojas em `docs/store/`.
   Falta o que só o Fábio faz (contas, Blaze, segredos —
   `docs/store/checklist-contas.md`) e a parte 2 (build, screenshots,
   submissão). Ver "Lançamento nas lojas" abaixo.

## Autenticação (Secção 2)

- Tudo passa por `src/auth/AuthContext.tsx` (`useAuth()`): `user` (Firebase
  Auth), `client` (doc `clients/{uid}`, em tempo real), `signIn`, `signUp`,
  `signOut`, `resetPassword`, `updateClient`. Nos ecrãs, usa sempre isto —
  nunca chames o Firebase Auth diretamente.
- Os tabs Perfil e Alertas estão envolvidos em `AuthGate`: sem sessão mostram
  o `LoginScreen` no lugar do tab. Início/Portfólio/Eventos ficam abertos.
- `src/firebase/authInstance.native.ts` (iOS/Android) usa
  `initializeAuth` + AsyncStorage para a sessão sobreviver a fechar a app;
  `authInstance.ts` (web) usa `getAuth`. O Metro escolhe pelo sufixo
  `.native`. O `// @ts-expect-error` lá dentro é esperado: o pacote
  `firebase` só publica os tipos web, que não têm `getReactNativePersistence`.
- Recuperar password envia um email do Firebase (template por defeito, em
  inglês). Para o traduzir/personalizar: Firebase Console > Authentication >
  Templates. Nos projetos novos a "proteção contra enumeração de emails" está
  ligada, por isso a app nunca revela se um email tem conta.
- Conta de teste criada no **dev** durante a Secção 2:
  `teste.seccao2@example.com` / `Teste1234!`. Para a apagar, usa a própria
  app: Perfil > Apagar a minha conta e dados (fica um doc anonimizado em
  `clients/<uid>`, que podes apagar à mão no Firestore se quiseres).

## RGPD (Secção 3)

- **Textos legais** vivem em `src/legal/texts.ts` — política de privacidade
  e termos, em português, mais `COMPANY` (dados da empresa) e
  `LEGAL_VERSION`. Esse ficheiro não importa nada de propósito: é lido pela
  app (ecrã `LegalScreen`) e pelo script `npm run build:legal`, que gera
  `docs/legal/*.html` (política, termos e "apagar conta" — a Apple e o
  Google pedem estes URLs públicos; ver Secção 11). Nunca edites os HTML à
  mão. `COMPANY` já tem os dados reais (Cacto Elegante, Lda.); se ainda
  houver `[A PREENCHER` em algum campo, o script avisa.
- **Subir a `LEGAL_VERSION`** (data) sempre que o texto muda de forma
  material. O Perfil passa a mostrar um cartão "Termos e privacidade
  atualizados" a todos os clientes até aceitarem; contas antigas sem
  `consent` recebem o mesmo cartão. Correr `npm run build:legal` depois.
- **Prova de consentimento** em `clients/{uid}.consent`: `termsVersion`,
  `termsAcceptedAt`, `marketing` (opt-in, false por defeito),
  `marketingUpdatedAt`. Ver `ClientConsent` em `src/firebase/models.ts`.
- **Marketing vs operacional.** `consent.marketing` é o interruptor
  "Ofertas e novidades" do Perfil; `notificationPrefs` (categorias) são
  sub-preferências que só contam quando `consent.marketing` é true. Os tipos
  `offer`, `new_work` e `event_reminder` são marketing
  (`MARKETING_NOTIFICATION_TYPES` em `models.ts`); `checkup_reminder` é
  operacional e não depende de consentimento. A Secção 6 tem de respeitar
  isto ao enviar.
- **Apagar conta** (`AuthContext.deleteAccount`) não usa Cloud Functions
  nem `delete` nas regras: re-autentica com a password, anonimiza o doc
  (name/email/phone vazios, `deletedAt`, marketing off) e apaga o utilizador
  do Auth. `vehicles`/`works` ficam a apontar a um cliente sem dados
  pessoais (política de retenção: histórico anonimizado fica; contas sem
  atividade há 3 anos são apagadas por um job da Secção 6, ainda por
  fazer). As regras do Firestore **não mudaram** nesta secção.
- **Pedidos por email** (acesso, portabilidade, apagar sem a app): chegam ao
  `COMPANY.privacyEmail`. Não há automatização; a equipa responde à mão
  (prazo legal: um mês). Para apagar por esse caminho, o Admin SDK ou o
  backoffice faz o mesmo que a app: anonimiza o doc e apaga o utilizador.

## Dados reais (Secção 4)

- **Camada de dados em `src/data/`.** `firestoreHooks.ts` tem os hooks
  genéricos (`useFirestoreList`, `useFirestoreDoc`, ambos com `onSnapshot` —
  tudo é em tempo real, sem botão de refrescar) e devolve sempre
  `{ data, loading, error }`. Os hooks por coleção (`works.ts`, `events.ts`,
  `notifications.ts`, `vehicles.ts`) constroem as queries; `categories.ts`
  tem os nomes de apresentação das 3 categorias. Nos ecrãs usa sempre estes
  hooks — nunca chames `getDocs`/`onSnapshot` diretamente.
- **Regra importante das regras:** `works` só é legível com
  `published == true`, e as regras do Firestore não filtram — recusam a
  query inteira. Qualquer query em `works` TEM de levar
  `where('published', '==', true)`. Um `getDoc` de um rascunho dá
  `permission-denied`, que `useFirestoreDoc` traduz em `missing: true`
  (o Detalhe mostra "já não está disponível").
- **Índices compostos** em `firestore.indexes.json` (4). Se uma query nova
  precisar de índice, o erro é `failed-precondition` com um link na consola
  do browser para o criar — mas acrescenta-o ao ficheiro e faz deploy, para
  o prod ficar igual.
- **Estados.** Toda a lista tem a carregar / vazio / erro
  (`src/components/ListState.tsx`). Nunca deixes um ecrã em branco.
- **Fotos.** `src/components/Photo.tsx` recebe `url` e `seed` (o ID do doc)
  e preenche o contentor pai (que define tamanho, cantos e
  `overflow: 'hidden'`). URL vazio ou que falha → gradiente estável por ID.
- **Datas** em `src/utils/dates.ts` (`timeAgo`, `formatDate`,
  `formatMonthYear`). Sempre a partir de `Timestamp`.
- **Escritas do cliente:** `clients/{uid}` (perfil), `read` em
  `notifications` (`markNotificationRead`), criar em `requests` (Secção 7)
  e `checkupRequest` em `vehicles/{id}` (Secção 8: pedir, confirmar a
  proposta, cancelar — `src/data/vehicles.ts`). Tudo o resto é da equipa.
- **Ecrãs empilhados** (Detalhe, Dados pessoais, Legal, Apagar conta) usam
  `edges={['top', 'bottom']}` no `SafeAreaView` porque não têm barra de tabs
  a proteger a margem inferior — sem isto o botão fixo em baixo fica tapado
  pela barra de navegação do Android. Os tabs ficam com `['top']` (a barra
  de tabs já soma o inset).
- **Verificar:** `npm run check:firestore` (regras + índices, sem login) e
  `npm run check:firestore:auth -- ./serviceAccountKey.dev.json` (Alertas e
  Perfil como a conta de teste, via custom token — sem password).

## Galeria, fotos dos serviços e foto de perfil (Secção 5b)

- **Galeria do Detalhe.** `galleryItems(work)` (`src/data/works.ts`)
  normaliza `works.media[]` (ordenado por `order`; sem `media`, a capa) para
  `src/components/WorkGallery.tsx` (deslizável no topo, contador "3 / 7",
  pontos, etiqueta "Ver vídeo" sobre a miniatura) e
  `src/components/MediaViewer.tsx` (Modal em ecrã inteiro, FlatList com
  paginação, fotos inteiras, vídeo com `expo-video` — o leitor só é criado
  para o item ativo e é libertado ao sair, para não descarregar vídeos que
  o cliente não vê). O hero tem proporção 4:3 da largura útil.
- **Fotos dos serviços (Início).** `settings/home.departmentCovers.{id}`
  (`HomeSettings` em `models.ts`, hook `useHomeSettings` em
  `src/data/settings.ts`) dá a foto de fundo de cada cartão; a lista de
  departamentos está em `src/data/departments.ts` (cópia no backoffice em
  `src/utils/departments.ts` — mantém iguais). A equipa escolhe as fotos no
  backoffice em **Destaques > Fotos dos serviços**. Sem foto, gradiente
  estável por ID; nunca ícones (regra 5 do CLAUDE.md). Regras: leitura
  pública, escrita `isAdmin()`.
- **Foto de perfil.** Fluxo em `src/media/avatarPicker.ts` (galeria ou
  câmara com `expo-image-picker`, recorte quadrado nativo, redução a 1024
  px com `expo-image-manipulator`) e `src/media/cloudinary.ts` (upload
  unsigned com o preset `marble-avatars` e as tags `avatar,uid_<uid>`;
  devolve o URL de entrega `c_fill,w_512,h_512,g_face`). O Perfil grava
  `clients/{uid}.avatarUrl` via `updateClient`; remover = `''`; apagar
  conta já apaga o campo. `src/components/Avatar.tsx` (foto ou iniciais)
  é usado no Perfil e no botão de Perfil do Início;
  `src/components/ActionSheet.tsx` é o menu no estilo da app. Variáveis:
  `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` e `..._PRESET_AVATARS` (ver
  `.env.example`); sem elas o avatar fica sem ação e sem o ícone da câmara.
- **Apagar o ficheiro no Cloudinary não é possível pela app** (API
  assinada). A política de privacidade promete 30 dias
  (`RETENTION.avatarFileDays`): até a Secção 6 automatizar com uma Cloud
  Function, a equipa apaga à mão na Media Library, procurando pela tag
  `uid_<uid>` (ver README do backoffice). O mesmo vale para fotos de
  trabalhos removidas no backoffice — mas essas não são dados pessoais.
- **Testar a foto de perfil no browser** (o seletor de ficheiros do
  sistema não se automatiza): o `expo-image-picker` na web cria um
  `<input type=file>` e dispara-lhe um `click`; intercetar
  `HTMLInputElement.prototype.dispatchEvent` para injetar um `File` gerado
  num canvas e disparar `change` exercita o fluxo inteiro (foi assim que a
  Secção 5b o verificou). No telemóvel testa-se a sério com o Expo Go.
- **Textos legais** ganharam a foto de perfil e o Cloudinary como
  subcontratante (`LEGAL_VERSION` 2026-09-04; HTML regenerado). Todas as
  contas veem o cartão "Termos e privacidade atualizados" uma vez.
- **Novos módulos nativos** (`expo-video`, `expo-image-picker`,
  `expo-image-manipulator`) estão todos no Expo Go — não é preciso build.
  O `app.json` leva o plugin do `expo-image-picker` com os textos de
  permissão em português (só contam em builds da Secção 11).

## Notificações push e Cloud Functions (Secção 6)

Duas peças novas: **Cloud Functions** (`functions/`, TypeScript, Node 22,
firebase-functions v2, região `europe-west1`) que criam os alertas
automáticos e mandam o push, e **push no telemóvel** na app
(`expo-notifications` + Expo Push Service). Regra de ouro que atravessa
tudo: **o doc em `notifications` é a fonte de verdade** — é o que aparece
no ecrã Alertas; o push é um acréscimo, e sem telemóvel registado o alerta
fica só na app. As Functions criam docs com exatamente o formato do
backoffice (`marble-backoffice/src/data/writes.ts` → `sendNotification`).

### O que as Functions fazem

| Function | Dispara | Faz |
|---|---|---|
| `onNotificationCreated` | doc novo em `notifications` (backoffice ou jobs) | push para `clients.pushTokens`; escreve `push` no doc (`sent`/`no_device`/`skipped`/`error`); tira tokens `DeviceNotRegistered`. `team_alert` nunca leva push. |
| `onWorkWritten` | `works/{id}` criado/alterado | passou a publicado → `new_work` a quem tem "Ofertas e novidades" **e** a categoria ligada (uma vez: `newWorkNotifiedAt`); com carro/chão ligado, `vehicles.lastServiceAt` ← `completedAt` se for mais recente. |
| `onClientUpdated` | `clients/{uid}` alterado | `avatarUrl` removido/trocado (ou conta apagada) → apaga no Cloudinary os ficheiros com a tag `uid_<uid>`, menos a foto atual. Cumpre os 30 dias da política de privacidade em segundos. |
| `onVehicleUpdated` (Secção 8) | `vehicles/{id}` alterado | só reage a `checkupRequest`: pedido/alteração do cliente → `team_alert` com dia, nota e telemóvel + `followUp.checkupConfirmedAt` no trabalho; proposta da equipa → `message` ao cliente; aprovado/confirmado → `message` "Checkup agendado" (+ `team_alert` se foi o cliente a confirmar); cancelado → `team_alert` + `checkupStatus: 'declined'`; voltar a pedir → `'pending'`. Ver "Agendamento de checkup". |
| `dailyJobs` | todos os dias às **10:00 de Lisboa** | recibos de push de ontem; acompanhamento pós-serviço; lembrete de eventos ("Amanhã: …", só com consentimento de marketing); retenção de contas (aviso aos 3 anos − 30 dias, anonimização + Auth + Cloudinary aos 3 anos; abrir a app cancela). |

Consentimento (RGPD, Secção 3) aplicado em `functions/src/consent.ts`
com as mesmas regras do backoffice: sem conta na app → nada;
`offer`/`new_work`/`event_reminder` só com `consent.marketing`; `new_work`
ainda exige a categoria; `checkup_reminder`/`message` vão sempre. O trigger
do push volta a verificar (o cliente pode ter desligado entretanto).

### Acompanhamento pós-serviço (é por trabalho)

Decisão do Fábio (2026-09-04): **não há cadência geral** — um PPF completo
tem checkup, só retrovisores não, um detail não, um teto estrelado sim. A
equipa define-o no backoffice **ao registar o trabalho concluído**, no
cartão "Acompanhamento pós-serviço" do formulário (só aparece com carro/
chão ligado; ao ligar um, entra o plano padrão 7 / 3 / 30):

- **Lembrete de checkup** ao cliente, N dias após `completedAt`
  (operacional). Ao enviar, o carro/chão fica `checkupStatus: 'pending'`
  ("Ação pendente" no Perfil). Cliente sem conta na app → em vez disso um
  alerta interno "Ligar a … : checkup do …".
- **Avisar a equipa se não confirmar**, N dias após o lembrete: `team_alert`
  no Painel do backoffice com o telemóvel do cliente. "Confirmado" =
  `vehicles.checkupDoneAt` (a equipa marcou em dia) ou
  `vehicles.checkupRequestedAt` (o cliente pediu na app — Secção 8)
  posteriores ao lembrete.
- **Oferta: lavagem grátis**, N dias após `completedAt`, **só carros**
  (chãos não têm oferta — decisão do Fábio). Marketing: sem
  `consent.marketing` na data fica `offerSkipped: 'no_consent'` e o
  formulário diz-o à equipa (que pode falar por telefone); não se envia
  meses depois se o cliente mudar de ideias.

Tudo vive em `works.followUp` (`WorkFollowUp` em `models.ts`): os dias, as
marcas `*At` que só as Functions escrevem, e `active` (o job só lê
trabalhos com `active == true` e fecha-o quando não resta nada). O
formulário mostra as datas calculadas antes e "Enviado a …" depois.

### Deploy, segredos e logs

Só o **dev** a partir do Claude (autorizado em `.claude/settings.json`);
prod na Secção 11. Exige o plano **Blaze** no projeto (cartão associado;
custo ~0 a este volume — as Functions v2 têm 2 M invocações/mês grátis e
o job diário faz umas dezenas de leituras).

```bash
npx.cmd firebase-tools deploy --project dev --only functions
```

(`firebase.json` compila `functions/` antes do deploy.) Os segredos do
Cloudinary — API key e API secret da conta, em Settings → API Keys na
consola do Cloudinary — vivem no **Secret Manager**, nunca no código nem
nos `.env`. Só o Fábio os introduz (o Claude não vê valores de segredos),
uma vez por projeto, no PowerShell dele, a partir da pasta do projeto:

```bash
npx.cmd firebase-tools functions:secrets:set CLOUDINARY_API_KEY --project dev
```

e o mesmo para `CLOUDINARY_API_SECRET`. **Depois** disso, muda
`CLOUDINARY_CLEANUP=off` para `on` em `functions/.env` e faz deploy outra
vez — só aí a `onClientUpdated` passa a declarar os segredos (declará-los
sem valor faz o deploy inteiro falhar, foi por isso que o interruptor
existe). Sem eles o deploy das funções que
os declaram falha; com eles em falta em execução, a limpeza no Cloudinary
é só registada nos logs (nada rebenta). O cloud name (público) está em
`functions/.env`. Logs: `npx.cmd firebase-tools functions:log --project dev`.

### Testar sem deploy (e sem esperar pelas 10:00)

A lógica está separada do wiring (`functions/src/index.ts` só liga
triggers a `push.ts`, `handlers.ts` e `jobs/`), por isso corre localmente
contra o dev com a chave de service account — **escreve a sério** (cria
alertas, marca passos como enviados):

```bash
npm run functions:build
npm run functions:jobs -- ../serviceAccountKey.dev.json --only followUps --now 2026-09-12
```

Opções: `--now AAAA-MM-DD` (esse dia às 10:00 de Lisboa), `--only`
(`receipts|followUps|events|retention|requests`), `--push <notificationId>` (push de
um alerta já criado — com um token inválido o Expo responde
`DeviceNotRegistered` e o token sai da conta), `--work <workId>` (simula o
trigger de publicação), `--avatar <uid>` (limpeza no Cloudinary; precisa de
`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` no ambiente), `--request <id>`
(simula o trigger de um pedido de orçamento acabado de criar — Secção 7; o
email só sai com `RESEND_API_KEY` no ambiente), `--vehicle <id>
[--before none|pending|proposed|approved]` (simula o trigger do
agendamento de checkup — Secção 8 — a partir do estado atual de
`vehicles/{id}.checkupRequest`; `--before` diz qual era o estado anterior,
senão adivinha-se o plausível). Foi assim que a
Secção 6 verificou o fluxo inteiro (checkup → alerta interno → oferta
recusada por falta de consentimento; aviso e anonimização por
inatividade; `new_work` só a quem tem categoria e consentimento).

### Push no telemóvel (app)

- `src/push/push.native.ts` (iOS/Android) e `push.ts` (web, inerte). A
  permissão **nunca é pedida no arranque**: o ecrã Alertas mostra um cartão
  "Recebe os alertas no telemóvel" e o pedido do sistema só aparece ao tocar
  em "Ativar notificações" (`enablePush`). Recusada → "Abrir definições".
  Já autorizada → ao entrar, `syncPushToken` garante o token na conta sem
  perguntar. Terminar sessão e apagar conta tiram o token
  (`forgetPushToken`), senão o próximo cliente neste telemóvel recebia os
  alertas do anterior. Token em `clients/{uid}.pushTokens` (lista: vários
  telemóveis).
- **Tocar num push** abre o mesmo que tocar no alerta no ecrã Alertas
  (trabalho / tab Eventos / Perfil) e marca-o como lido —
  `RootNavigator.tsx` → `openFromPush`, via `navigationRef`; funciona com a
  app fechada (arranque a frio espera pelo `onReady`). Os ids viajam no
  `data` do push (`functions/src/push.ts` → `pushData`).
- `lastActiveAt` em `clients/{uid}`: a app grava-o no máximo uma vez por
  dia (`AuthContext.touchLastActive`) — é a "atividade" do job de
  retenção.
- **Expo Go no Android já não recebe push remoto** (SDK 53+). Para ver um
  push a sério é preciso a **development build** (ver abaixo); no Expo Go e
  no web `pushSupported` é false e o cartão não aparece. Sem
  `extra.eas.projectId` no `app.json` também não (é o que
  `getExpoPushTokenAsync` exige).
- Ícone da barra de notificações (Android exige silhueta branca com
  transparência): `assets/notification-icon.png`, gerado a partir do
  logótipo real (`assets/logo.png`) — não é um sino genérico. Cor de
  destaque dourada e canal `default` no plugin `expo-notifications`
  (`app.json`).

### Development build (Android) com EAS

Substitui o Expo Go no telemóvel do Fábio: é "o Expo Go desta app", com o
push a funcionar, e liga-se ao mesmo servidor (`marble-app-phone`, 8081).
Passos (uma vez):

1. Conta Expo (grátis) e login na CLI, **pelo Fábio**, no PowerShell dele:
   `npx.cmd eas-cli login` (a password fica na CLI do Expo).
2. `npx.cmd eas-cli init` na pasta do projeto — cria o projeto no EAS e
   escreve `extra.eas.projectId` no `app.json` (commitar).
3. App Android no Firebase (pacote `pt.marble.app`, definido em `app.json`
   em `android.package` e `ios.bundleIdentifier`):
   `npx.cmd firebase-tools apps:create ANDROID "Marble Studios App" --package-name pt.marble.app --project dev`
   e `npx.cmd firebase-tools apps:sdkconfig ANDROID <appId> --project dev --out google-services.json`.
   O ficheiro fica na raiz e em `android.googleServicesFile` (só tem
   identificadores públicos; pode ir para o git). O prod tem o seu próprio,
   no EAS (Secção 11). **Desde a Secção 11 a dev build usa o pacote
   `pt.marble.app.dev`** ("Marble Dev") e o ficheiro da raiz já tem esse
   cliente — ver "Lançamento nas lojas" abaixo.
4. Credencial FCM V1 no EAS (é o que deixa o Expo entregar no Android): em
   https://expo.dev → projeto → Credentials → Android → Service
   Credentials → FCM V1 → carregar a chave de service account do Firebase
   (a mesma `serviceAccountKey.dev.json` serve). Ou `npx.cmd eas-cli credentials`
   (interativo). A credencial é **por nome de pacote**: a do dev fica em
   `pt.marble.app.dev`; `pt.marble.app` é só produção (Secção 11).
5. Build na nuvem: `npx.cmd eas-cli build --profile development --platform android`
   (perfis em `eas.json`; o keystore é gerado pelo EAS). Demora 10–20 min
   na fila gratuita; no fim há um link/QR para instalar o APK no telemóvel.
6. No telemóvel: abrir a app instalada → ela procura o servidor de
   desenvolvimento (`exp://<IP>:8081`, o mesmo do Expo Go) → Perfil → entrar
   → Alertas → "Ativar notificações". Enviar um alerta no backoffice: chega
   como push.

Depois disto, `expo-dev-client` faz com que `expo start` sirva a dev build
e o Expo Go ao mesmo tempo — os dois continuam a funcionar (o Expo Go sem
push).

### Blaze no dev — o que aconteceu a 2026-09-04 (para não repetir no prod)

- O upgrade para Blaze na consola do Firebase ligou o projeto a uma conta
  de faturação antiga e **fechada** ("Firebase Payment"); a Google não a
  deixa reabrir. Sintoma na CLI: `Billing account for project … is not
  open` ao ativar APIs.
- A conta nova criada com o **Visa Electron** da empresa também foi fechada
  pela Google: os Electron não passam na verificação (sem
  pré-autorização). Resolveu-se com outro cartão (Visa/Mastercard normal)
  e o pagamento único de 10 € (fica como crédito). A conta que ficou é
  **"My Billing Account"** (`013056-591FBF-81EA13`), ligada ao
  `marble-studios-dev` em Google Cloud → Billing → Your projects → ⋮ →
  Change billing. Para o prod (Secção 11) é só ligar o projeto prod a esta
  mesma conta — nada de cartão outra vez.
- O primeiro deploy de Functions de 2.ª geração falha 2–3 vezes por
  propagação (APIs, Secret Manager, identidades Eventarc/Pub/Sub): a
  própria CLI diz "retry in a few minutes". Repetir o mesmo comando
  resolve. A API do Secret Manager foi ligada criando (e destruindo) um
  segredo de teste `SM_PROBE`.
- O deploy em modo não interativo falha se `defineSecret` for chamado para
  um segredo sem valor — daí o interruptor `CLOUDINARY_CLEANUP` em
  `functions/.env`.

### EAS — o que ficou criado

- Conta Expo do Fábio: `vampiregodric` (v.godric@gmail.com); o projeto vive
  na organização **marble-studios** (`owner` no `app.json`), slug
  `marble-studios`, `projectId 2d792556-5f26-493d-8534-3250945a10f0`.
- App Android `pt.marble.app` registada no Firebase dev
  (`1:418501225214:android:caea02432c45ce895ed3af`);
  `google-services.json` na raiz. Chave FCM V1 (a
  `serviceAccountKey.dev.json`) carregada pelo Fábio no dashboard do Expo.
  **Secção 11 (2026-09-05):** app `pt.marble.app.dev` "Marble Studios Dev"
  também no dev (`1:418501225214:android:d65581b56503bca85ed3af`, no mesmo
  `google-services.json`); no **prod**, `pt.marble.app`
  (`1:1081673947718:android:4fab7bdcfd8fb0bb4d4847`, ficheiro só no EAS).
- Primeira development build:
  https://expo.dev/accounts/marble-studios/projects/marble-studios/builds/31ef345b-3867-41d4-a527-3a3155815632
  (APK instalado no Android do Fábio; keystore gerado pelo EAS). Push real
  verificado: ticket aceite, recibo sem erros, toque abriu os Alertas e
  marcou o alerta como lido.
- Builds novas só são precisas quando mudam módulos nativos ou o
  `app.json` (plugins, ícones, permissões); alterações de JS chegam pelo
  servidor `marble-app-phone` como no Expo Go.

### Login por token de dev na app web

Igual ao backoffice: `npm run dev-token -- ./serviceAccountKey.dev.json teste.seccao2@example.com`
imprime `http://localhost:8082/#token=…` (1 hora). A app
(`src/auth/devToken.ts`) só o aceita no browser **e** quando o projeto
acaba em `-dev`; em produção é código morto. Serve para o Claude verificar
Alertas e Perfil sem escrever a password de ninguém — foi assim que a
Secção 6 viu os alertas automáticos a chegar ao ecrã Alertas em tempo
real.

## Pedidos de orçamento (Secção 7)

O botão "Pedir orçamento semelhante" do Detalhe abre
`src/screens/RequestQuoteScreen.tsx` (rota `RequestQuote`, params
`{ workId?, department? }`). As páginas de departamento das Secções 9 e 10
navegam para lá com `{ department: 'ai' | 'ads' | 'xps' }`; o Perfil tem
"Pedir orçamento" sem parâmetros (o cliente escolhe o departamento). O
formulário em si — opções, campos, se há fotos — vive em
`src/data/requestForms.ts`, por departamento; o ecrã é genérico. As opções
escolhidas ficam guardadas como texto (`services`, `fields[].label`), por
isso o backoffice e os emails não precisam de conhecer esse ficheiro.

**Decisão do Fábio (2026-09-04): o pedido cria conta.** Sem sessão, o
formulário pede nome, email e telemóvel e a aceitação dos termos (checkbox
não pré-marcada, como no registo); ao enviar,
`AuthContext.createAccountFromRequest` cria a conta com uma password
aleatória, deixa o cliente com sessão iniciada nesse dispositivo e dispara o
email do Firebase "repor password" — que é como o cliente define a sua
(personaliza o texto em Firebase Console > Authentication > Templates; por
defeito vai em inglês). Se o email já tiver conta, o formulário pede só a
password e entra. Com sessão, os contactos vêm da conta e não se pedem.
Consequência: **todos os pedidos têm `clientId` = uid** e as regras exigem-no.

- **Dados:** coleção `requests` (`ServiceRequest` em `models.ts`), com
  `type: 'quote'` — a Secção 8 acrescenta `type: 'checkup'` ao mesmo doc,
  à mesma página do backoffice e à mesma Function. Estados `new` →
  `contacted` → `closed`, só o backoffice os muda. Regras: o cliente cria
  (validação campo a campo em `validNewRequest`, limites em
  `REQUEST_LIMITS`) e lê os seus; `update`/`delete` só a equipa. Índice
  `requests` (clientId, createdAt desc) em `firestore.indexes.json`.
- **Cloud Function `onRequestWritten`** (`functions/src/requests.ts`): ao
  criar → anti-spam (o mesmo cliente com 3+ pedidos em 24 h fica
  `flagged`, sem alertas nem email), `team_alert` no Painel do backoffice
  ("Ver pedido"), alerta `message` "Recebemos o teu pedido" ao cliente (com
  push pela `onNotificationCreated`), e — com o Resend ligado — email à
  equipa (`QUOTES_EMAIL_TO`, quotes@marble.pt, com "responder a" = o
  cliente) e email de confirmação ao cliente, ambos de `EMAIL_FROM`
  (app@marble.pt). Fotos removidas ou pedido apagado → ficheiros fora do
  Cloudinary pela tag `request_<id>`. Tudo idempotente (`processedAt`).
- **Email (Resend), pendente do Fábio:** conta em resend.com, verificar o
  domínio marble.pt (registos DNS que o Resend indica) e guardar a chave:
  `npx.cmd firebase-tools functions:secrets:set RESEND_API_KEY --project dev`.
  Só depois mudar `QUOTE_EMAIL=off` → `on` em `functions/.env` e fazer
  deploy (mesmo interruptor que o do Cloudinary: declarar o segredo sem
  valor faz o deploy falhar). Desligado, tudo o resto funciona; o doc fica
  sem `emailSentAt` e o log diz "email desligado".
- **Fotos (opcionais, até 5):** `src/media/requestPhotos.ts` (galeria com
  seleção múltipla ou câmara, redução a 1600 px) →
  `uploadRequestPhoto` em `src/media/cloudinary.ts` (preset unsigned
  `marble-requests`, variável `EXPO_PUBLIC_CLOUDINARY_PRESET_REQUESTS`;
  sem ela a secção das fotos não aparece). **Pendente do Fábio:** criar o
  preset na consola do Cloudinary (Unsigned, folder `requests`, só imagens,
  incoming transformation `c_limit,w_2000,h_2000`) — até lá, juntar fotos
  dá o erro "Upload preset not found" do Cloudinary e o pedido não sai.
- **Anti-spam na app:** `REQUEST_LIMITS.perDayMax` (3) pedidos por
  dispositivo em 24 h, em AsyncStorage (`src/data/requests.ts`). Não é
  segurança — a Function marca do lado dela. App Check fica para a Secção 11.
- **RGPD:** política de privacidade com os pedidos (dados, base legal =
  diligências pré-contratuais, fotos, Resend como subcontratante, prazo) e
  `LEGAL_VERSION` 2026-09-05 (todas as contas veem uma vez o cartão
  "Termos atualizados"). Retenção: `RETENTION.requestMonths` (12) — o job
  diário (`--only requests`) anonimiza pedidos fechados há mais de 365
  dias (contactos, texto, campos, fotos e notas apagados; fica
  departamento, opções, estado e datas); apagar a conta anonimiza logo os
  pedidos do cliente (`handleClientUpdated`).
- **Backoffice:** página **Pedidos** (lista com filtros, detalhe com
  estados, notas internas, fotos, registo do automático), secção "Pedidos
  de orçamento por responder" no Painel, contagem na barra lateral, secção
  na ficha do cliente, "Ver pedido" nos alertas internos. Modelo
  sincronizado (`src/firebase/models.ts`).
- **Testar:** `npm run check:firestore` (sem login: nada em `requests`) e
  `npm run check:firestore:auth -- ./serviceAccountKey.dev.json` (cria um
  pedido válido, tenta cinco inválidos, tenta alterar; apaga tudo no fim).
  No browser (8082): o Firebase guarda a sessão por origem — se o tab já
  esteve com sessão, o formulário aparece na versão "com conta"; termina
  sessão no Perfil para ver a criação de conta. `npm run functions:jobs --
  <chave> --request <id>` simula o trigger sem deploy. Contas de teste
  criadas nesta secção no dev: `teste.seccao7@example.com` (pedido AI
  Business, criada pelo próprio formulário).

## Agendamento de checkup (Secção 8)

O botão "Agendar agora" do Perfil abre uma folha no estilo da app
(`src/components/CheckupSheet.tsx`) onde o cliente escolhe um **dia e um
período** entre os que a equipa abriu, deixa uma nota opcional e pede. O
pedido fica **a aguardar aprovação**; a equipa aprova ou propõe outro dia;
o cliente recebe alerta com push; pode alterar e cancelar. Decisões do
Fábio em SPEC.md ("Decidido … Secção 8").

- **Onde vive o pedido:** no próprio carro/chão, `vehicles/{id}.checkupRequest`
  (`CheckupRequest` em `models.ts`: `day` "AAAA-MM-DD", `period`
  `morning|afternoon`, `note`, `status`, `requestedAt`; da equipa: `time`
  "HH:MM", `teamNote`, `decidedAt`; `confirmedAt`/`cancelledAt`). Estados:
  `pending` (cliente pediu) → `proposed` (equipa propôs outro dia) ou
  `approved` (equipa aprovou, ou cliente confirmou a proposta) →
  `cancelled` (cliente). `checkupRequestedAt` no doc é o que o job de
  acompanhamento já lia ("lembrete atendido"). `CheckupStatus` ganhou
  `'declined'` = cancelou ("não quis"); sai do cartão "Ação pendente" e dos
  checkups pendentes do backoffice, mas a linha do carro/chão no Perfil
  deixa voltar a pedir (a Function repõe `'pending'`). Não se usou a
  coleção `requests` da Secção 7 (fluxo de estados diferente).
- **Disponibilidade:** `settings/checkups` (`CheckupAvailability`:
  `weekly` seg–dom × períodos, `closedDays`, `weeksAhead`, `minDaysAhead`).
  Sem doc, a app usa `CHECKUP_AVAILABILITY_DEFAULT` (seg–sex, manhã e
  tarde, 3 semanas, a partir de amanhã). `src/data/checkups.ts` calcula as
  opções (`checkupOptions`), lê o estado (`checkupState`) e formata
  (`formatCheckupSlot` → "seg, 7 set, de manhã" / "às 10:30" — o mesmo
  texto que as Functions escrevem). Leitura pública como `settings/home`.
- **Regras** (`match /vehicles`, função `ownerCheckupWrite`): o dono só
  pode (1) pedir/alterar — escreve o mapa `checkupRequest` inteiro com
  `status: 'pending'`, dia no formato certo, período válido, nota até 300
  caracteres, `requestedAt`/`checkupRequestedAt` iguais a `request.time`;
  (2) confirmar uma proposta — `proposed` → `approved`, só `status` e
  `confirmedAt`; (3) cancelar — só `status` e `cancelledAt`. Só enquanto
  `checkupStatus` for `pending`/`declined`. Aprovar, propor e "marcar em
  dia" são `isAdmin()`. `npm run check:firestore:auth` cobre os 12 casos.
- **Perfil:** o cartão muda com o estado — Ação pendente ("Agendar
  agora"), A aguardar aprovação ("Alterar" / "Cancelar pedido"), Proposta
  da equipa ("Confirmar" / "Escolher outro dia" / "Cancelar"), Agendado
  ("Alterar" / "Cancelar"). O cartão escolhe primeiro o carro/chão que
  precisa de decisão do cliente (`pendingCheckup`). Cada linha da lista é
  tocável: sem pedido abre a folha; com pedido abre um menu com as mesmas
  ações. Escritas em `src/data/vehicles.ts` (`requestCheckup`,
  `confirmCheckupProposal`, `cancelCheckupRequest`).
- **Function `onVehicleUpdated`** (`handlers.ts` → `handleVehicleUpdated`,
  textos em `texts.ts`): compara `checkupRequest` antes/depois e, por
  transição, cria o alerta interno (pedido, alteração, cliente confirmou,
  cancelou — sempre com o telemóvel) ou o `message` ao cliente (proposta,
  agendado — com push pela `onNotificationCreated`). Ao pedir ou cancelar,
  marca `followUp.checkupConfirmedAt` nos trabalhos ativos do carro/chão —
  o job diário nunca chega a mandar ligar. Ao cancelar, `checkupStatus` →
  `'declined'`; ao voltar a pedir, → `'pending'`.
- **O papel da equipa na linha de comandos** (a página Checkups do
  backoffice faz o mesmo desde a Secção 7b; o script fica para testes):
  `npm run checkup:admin -- ./serviceAccountKey.dev.json list|show <id>|approve <id> [--time 10:30] [--note "…"]|propose <id> --day AAAA-MM-DD --period morning|afternoon [--time] [--note]|done <id>|reset <id>|availability [--weekly "mon:morning,afternoon;sat:morning" --closed 2026-09-15 --weeks 3 --min 1]`.
  Escreve exatamente o que o backoffice vai escrever; a Function publicada
  no dev faz o resto (o cliente recebe o alerta e o push). `reset` limpa o
  pedido e volta a pôr o checkup pendente, para testar outra vez.
- **Testar de ponta a ponta:** app web na 8084 com `npm run dev-token`
  (ou o telemóvel com a dev build, para ver o push) → Perfil → "Agendar
  agora" → pedir; `npm run checkup:admin -- <chave> propose …` → alerta
  "Proposta de checkup" nos Alertas + cartão "Proposta da equipa" →
  Confirmar → "Checkup agendado"; Cancelar → linha "Sem checkup" → tocar →
  voltar a pedir. Sem deploy: `npm run functions:jobs -- <chave> --vehicle <id>`
  simula o trigger. Nos testes no browser, um clique programático em
  vários chips e no botão no mesmo instante usa os valores anteriores (o
  React ainda não re-renderizou) — clica, espera, e só depois submete.
- **Backoffice (Secção 7b, feito 2026-09-05):** página **Checkups**
  (`/checkups`) com três blocos — A aprovar (Aprovar com hora opcional e
  nota / Propor outro dia, só dias abertos na disponibilidade a partir de
  amanhã, com saída avisada), Agendados (Marcar em dia / Propor outro dia;
  dias já passados com selo "Por fechar") e Disponibilidade (editor de
  `settings/checkups`, grava com "Guardar") — mais "Cancelados pelo
  cliente", a coluna "Pedido na app" no Painel, "Ver em Checkups" nos
  alertas internos e na ficha do cliente, e `'declined'` = "Cancelou o
  checkup". As escritas (`marble-backoffice/src/data/writes.ts`:
  `decideCheckupRequest`, `proposeCheckupDay`, `markCheckupDone`,
  `saveCheckupAvailability`) são as do `checkup-admin.mjs`; `models.ts`
  copiado. Detalhe no README do backoffice, "Checkups (Secção 7b)".
  **Function (2026-09-06):** `handleVehicleUpdated` distingue quem passou
  a proposta a `approved` — o cliente (só `status` + `confirmedAt`) gera o
  alerta interno "confirmou o checkup"; a equipa ("Aprovar na mesma",
  mexe em `decidedAt`) não. `'checkup'` saiu de `RequestType` e
  `vehicleId` de `ServiceRequest` (modelo, `functions/src/types.ts`,
  `texts.ts`, regras): pedidos são só orçamentos.

## Páginas de departamento (Secção 9)

Tocar num cartão do Início abre `src/screens/DepartmentScreen.tsx` (rota
`Department { id }`, URL web `services/:id`) — decisão do Fábio
(2026-09-04): serviços primeiro, o Portfólio filtrado fica a um toque
dentro da página. Regras:

- **O conteúdo é código, não Firestore.** Tudo em
  `src/data/departmentContent.ts` (`CONTENT.pt[id]`: `headline`, `intro`,
  `services[]`, `steps[]`, `pricing`, `labels?`, `related?`, `cta`). Para
  mudar um texto edita-se aí e sai numa versão nova da app. Não há
  coleção, regras nem ecrã de backoffice para isto. O nome e a tagline
  vêm de `DEPARTMENTS` (`src/data/departments.ts`); a foto do topo é a do
  cartão (`settings/home.departmentCovers`, escolhida no backoffice).
- **Um departamento novo = uma entrada nova.** `hasDepartmentContent(id)`
  decide se o cartão do Início abre a página; sem entrada o cartão fica
  inerte. Todos os seis têm entrada desde a Secção 10. Para a Inozetek
  (sem cartão até a parceria ser oficial) é preciso ainda o
  `DepartmentId` em `models.ts` (app e backoffice, iguais) e a linha em
  `DEPARTMENTS`; o conteúdo já está escrito em `INOZETEK_CONTENT_PT` —
  passos exatos no ROADMAP, Secção 10.
- **`cta`** é `{ kind: 'quote', label }` (abre `RequestQuote` com
  `{ department }`) ou `{ kind: 'link', label, url }` (abre um URL externo
  — a loja online da Xtreme, quando existir; até lá a Xtreme usa `quote`,
  "Pedir cotação"). Nunca inventar URLs: o link tem de ser a loja da
  Marble, não o site do fabricante.
- **`labels`** (Secção 10) troca os rótulos "O que fazemos" / "Como
  funciona" por outros ("O que vendemos" / "Como comprar" na distribuição).
- **`related`** (Secção 10) é a secção "Ver também": cartões
  `{ department, title, text }` que abrem outra página de departamento
  (`navigation.push('Department')`, para o "voltar" regressar à página
  de origem). Xtreme ↔ Epoxy Floors. `RelatedLinks` só mostra destinos
  com conteúdo, para nunca abrir uma página vazia.
- **Idiomas:** `CONTENT.en` existe e está vazio; `departmentContent(id,
  locale)` cai para PT. Quando a app inteira ganhar inglês, preenche-se.
- **Trabalhos recentes:** os departamentos com `category` mostram os 6
  trabalhos publicados mais recentes dessa categoria, com a mesma escuta
  do Portfólio (`usePublishedWorks`, filtro em memória) — sem índice novo.
  A Xtreme tem `category: 'Epoxy Floors'` só para isto (os pavimentos
  feitos com os produtos dela); a cópia da lista no backoffice
  (`src/utils/departments.ts`) não precisa do campo, que só a app usa.
- **`RequestQuote`** é o formulário da Secção 7 (ver "Pedidos de
  orçamento" acima): `cta.kind === 'quote'` abre-o com `{ department }` e
  o formulário desse departamento vem de `src/data/requestForms.ts` —
  a Xtreme ("Pedir cotação") usa o mesmo caminho, com `department: 'xps'`.

## Tags nos trabalhos (Secção 13)

Cada trabalho leva o **sistema/serviço** (lista fixa por categoria) e as
**marcas** (texto). Pedido do Fábio (2026-09-04); decisões no ROADMAP,
Secção 13 — Tags nos trabalhos: marca e sistema/serviço.

- **Modelo:** `works.services: WorkServiceId[]` — ids de `WORK_SERVICES`
  (`src/firebase/models.ts`: id, `category`, rótulo PT), sempre da
  categoria do trabalho; `works.brands: string[]` — nomes próprios, sem
  tradução. `products[]` (`{ brand, item }`) é **legado**: opcional, só em
  trabalhos anteriores à Secção 13 ainda não migrados. `WORK_SERVICE_KIND`
  diz como a tag se chama ("Sistema" nos chãos, "Serviço" no resto).
  **Acrescentar um sistema/serviço** = uma linha em `WORK_SERVICES` (app e
  backoffice — o `models.ts` do backoffice é cópia), a tradução em
  `src/i18n/pt.ts` e `en.ts` (`workServices`; sem ela o typecheck falha) e
  uma versão nova da app. Não há regras novas: as escritas em `works` já
  eram só da equipa, sem validação de campos.
- **Idioma:** guarda-se o id; a app mostra `S.workServices[id]` (pt/en) e
  cai no rótulo PT de `models.ts` se receber um id que não conhece
  (backoffice mais novo do que a app instalada). Os sistemas de epóxi são
  nomes da Xtreme e ficam iguais nos dois idiomas. Optou-se por isto em vez
  de `LocalizedText` em `models.ts` (sugestão da Secção 12) para o ficheiro
  continuar igual nos dois projetos.
- **App:** `data/works.ts` → `workTags(work)` devolve as tags pela ordem
  **serviço → marcas** (chips no Detalhe: serviço em maiúsculas com contorno
  dourado, marca em texto normal) e cai em `products` quando não há tags;
  `hasService()` serve o Portfólio, que dentro de uma categoria mostra uma
  segunda fila de chips com os serviços que têm trabalhos publicados (tocar
  outra vez desliga; em "Todos" não há segunda fila; mudar de categoria
  limpa o serviço).
- **Backoffice:** cartão "Tags" no formulário do trabalho — chips de
  escolha múltipla do sistema/serviço da categoria (mudar a categoria deixa
  cair os que não pertencem), marcas com Enter/vírgula e sugestões
  (`datalist`) das fixas + já usadas noutros trabalhos. Publicar sem
  serviço **só avisa** (toast; decisão do Fábio, 2026-09-06): o trabalho sai
  na app, mas fica fora do filtro por serviço. Trabalhos antigos:
  marcas pré-preenchidas a partir de `products`, aviso com o texto antigo,
  `products` apagado ao guardar. A lista mostra a linha das tags, o selo
  "Sem tags" nos publicados sem serviço, e a pesquisa apanha tags.
- **Migrar os trabalhos antigos:**
  `npm run works:migrate-tags -- ./serviceAccountKey.dev.json` mostra o que
  faria (marca → `brands`; título, modelo e itens → serviço por
  palavras-chave, só entre os serviços da categoria do trabalho; ignora
  quem já tem tags); `--apply` escreve e apaga `products` onde reconheceu
  um serviço (onde não reconheceu, mantém-o para a equipa ver no
  formulário). Só aceita chaves `-dev`; o prod ainda não tem trabalhos,
  nascem já com tags. O seed (`npm run seed`) já escreve
  `services`/`brands`. Feito no dev a 2026-09-05 (8 trabalhos).

## Firebase: os dois projetos

| | dev | prod |
|---|---|---|
| Project ID | `marble-studios-dev` | `marble-studios-prod` |
| Firestore | `(default)`, `eur3`, production mode | idem |
| Auth | Email/Password | Email/Password |
| App web | "Marble Studios App" | "Marble Studios App" |
| App Android | `pt.marble.app` (dev build antiga) e `pt.marble.app.dev` ("Marble Dev") | `pt.marble.app` |
| Config | `.env` (fora do git) | `.env.production` (no git desde a Secção 11) |
| Hosting | `marble-studios-backoffice-dev` (backoffice) | `marble-studios-app` (páginas legais/suporte da app) |
| Blaze / Functions | ativo / publicadas (Secção 6) | **por fazer** (Secção 11, parte 2) |
| Analytics / Gemini / Dev Program | desligados | desligados |

Conta Google dona dos dois: `v.godric@gmail.com`. Se um dia a Marble
Studios tiver conta Google própria, adiciona-a como Owner em
**Definições do projeto > Users and permissions** nos dois projetos.

Ambos foram criados em **production mode** (tudo negado por defeito) — não
há janela de 30 dias de base de dados aberta. As regras reais estão em
`firestore.rules` e os índices em `firestore.indexes.json`; publicados no
**dev** (Secção 4, 2026-09-03) e no **prod** (Secção 11, 2026-09-05, com a
versão do master desse dia, que já inclui as Secções 7 e 8). Sempre que as
regras ou os índices mudarem, o prod tem de ser republicado antes do
lançamento — é um dos passos da parte 2 da Secção 11.

O Firebase CLI já está autenticado nesta máquina (`v.godric@gmail.com`).
Sempre que mudares `firestore.rules` ou `firestore.indexes.json`, corre a
partir da pasta do projeto (ou do worktree onde a alteração está):

```bash
npx.cmd firebase-tools deploy --only firestore --project dev
```

(publica regras e índices de uma vez; troca `dev` por `prod` para o outro
projeto — os aliases estão em `.firebaserc`). Os índices demoram 1 a 3
minutos a construir.

**O Claude pode fazer isto sozinho no dev** (desde 2026-09-03): as
definições do projeto (`.claude/settings.json`, `permissions.allow`)
autorizam o deploy para `--project dev`, o seed (`npm run seed`, incluindo
`--client email`) e os scripts `check:firestore*`, na ferramenta PowerShell
(no Bash do Claude o `node` não está no PATH). A secção `autoMode.allow` do
mesmo ficheiro explica ao classificador do modo automático porque é que
isso é seguro. Deploys para **prod** continuam a pedir-te confirmação, de
propósito — mas, dada essa confirmação na conversa, o Claude consegue
corrê-los (foi assim na Secção 11: regras, app Android e Hosting no prod).
Se uma conversa aberta antes destas regras existirem for bloqueada, corre
tu o comando no teu PowerShell.

Para confirmar que tudo está ligado (config do `.env` + regras):

```bash
npm run check:firestore
```

### Popular com dados de exemplo

O script de seed cria dados realistas em todas as coleções: 8 trabalhos
(3 categorias, 3 em destaque, 1 rascunho não publicado), 3 eventos (2
futuros, 1 passado), 2 carros/chãos e 4 alertas. É idempotente (IDs fixos).
Precisa de uma chave de service account porque as regras negam escritas de
cliente:

```bash
# 1. Descarrega uma chave de service account:
#    Definições do projeto > Contas de serviço > Gerar nova chave privada
#    (guarda como serviceAccountKey.dev.json na raiz do projeto — já está
#    no .gitignore, nunca vai para o git)
# 2. Corre:
npm run seed -- ./serviceAccountKey.dev.json
```

Os carros/chãos e alertas ficam ligados ao uid da conta de teste
(`teste.seccao2@example.com`). Para os veres com **outra** conta (ex: a tua,
no telemóvel), aponta o seed a esse email — os docs mudam de dono:

```bash
npm run seed -- ./serviceAccountKey.dev.json --client o.teu.email@exemplo.pt
```

O script recusa chaves do `prod` — o roadmap diz para o deixar vazio até ao
lançamento (Secção 11).

### Trocar entre dev e prod

Nunca à mão. `npx expo start` lê sempre `.env` (dev). Só o `expo export`
de produção — o que o EAS Build corre nos perfis `preview` e `production` —
lê `.env.production` (que está no git desde a Secção 11). Se precisares de
testar contra prod localmente (raro, e só depois do lançamento), cria
`.env.local` com os valores de prod — está no `.gitignore` e sobrepõe-se ao
`.env`; apaga-o quando acabares.

## Idiomas (Secção 12)

A app está em **português e inglês**, escolhido pelo idioma do telemóvel
(decisão do Fábio, 2026-09-05: sem seletor próprio — português → PT,
qualquer outro idioma → EN; o sistema reinicia a app quando o idioma
muda). Tudo vive em `src/i18n/`:

- `locale.ts` — deteção com `expo-localization` (`getLocales()[0]`),
  `locale` ('pt' | 'en'), `languageTag` (para o Firebase Auth e o `lang`
  da web), o tipo `LocalizedText = { pt, en }` e `tx()` que escolhe a
  versão atual. **No browser, `?lang=en` (ou `?lang=pt`) no URL força o
  idioma** — é assim que se testa a app web nos dois idiomas
  (`http://localhost:8082/profile?lang=en`; com o token de dev:
  `http://localhost:8082/?lang=en#token=…`).
- `pt.ts` — **a fonte de verdade**, organizada por ecrã/componente
  (`common`, `tabs`, `home`, `profile`, `checkup`, `request`, `errors`,
  `dates`, …). Texto com valores dentro é uma função:
  `count: (n) => \`${n} trabalhos publicados\``.
- `en.ts` — as mesmas chaves em inglês, tipado como `Strings = typeof pt`
  (`types.ts`): **uma chave em falta ou com outra forma é erro de
  `npm run typecheck`**. É a única verificação — não há teste de que os
  dois textos dizem o mesmo.
- `index.ts` — `useT()` nos componentes (`const T = useT();
  T.profile.signOut`) e `S` fora deles (`S.errors.cameraDenied` em
  `media/`, `auth/errors.ts`, `data/checkups.ts`, `utils/dates.ts`). É uma
  constante decidida no arranque; se um dia houver seletor no Perfil,
  `useT()` passa a ler de um estado e os ecrãs não mudam.

**Para acrescentar um texto novo:** escreve-o em `pt.ts` na secção do ecrã
(ou cria uma), escreve o mesmo em `en.ts` com a mesma chave, e usa
`T.secção.chave` no ecrã. Sem a tradução o typecheck falha — é de
propósito. Nunca escrevas texto solto num ecrã.

**O que NÃO está em `src/i18n`:**
- `src/legal/texts.ts` — política e termos **só em PT** (a revisão
  jurídica é de um texto). Em EN o `LegalScreen` mostra a linha
  "This document is available in Portuguese only" por cima do texto.
- `src/data/departmentContent.ts` — o conteúdo das páginas de departamento
  tem `PT` e `EN` completos, um objeto por departamento;
  `departmentContent(id)` devolve o idioma da app e cai para PT se a
  tradução faltar. Ao mudar um texto em PT, muda o de EN.
- `src/data/requestForms.ts` — cada opção/etiqueta é `{ pt, en }`
  (`t('Vinil / wrap', 'Vinyl / wrap')`). `requestForm(department)` devolve
  o formulário no idioma da app com `value` (o texto PT, **o que se
  guarda** em `requests.services` / `fields[].label` via `storedLabel`) e
  `label` (o que se vê). Assim o backoffice e o email à equipa leem sempre
  PT, seja qual for o idioma do cliente. `OptionChips` recebe
  `{ key, label }` e devolve a chave.
- `src/data/departments.ts` — nomes são marca (não se traduzem); taglines e
  o selo "Oficial" vêm de `S.departments`.
- `src/firebase/models.ts` — `REQUEST_STATUS_LABEL` e
  `CONTACT_PREFERENCE_LABEL` ficam em PT (o ficheiro é copiado para o
  backoffice); a app usa `S.requestStatus` / `S.contactPreference`.
- **Alertas** (`notifications`): os escritos pela equipa no backoffice e
  pelas Cloud Functions (`functions/src/texts.ts`) são em PT e assim
  ficam (decisão do Fábio). Se um dia os automáticos tiverem de sair em EN:
  gravar o idioma em `clients/{uid}.locale` (app, no `touchLastActive`),
  `texts.ts` bilingue e `models.ts` do backoffice sincronizado — é uma
  mini-secção própria.

**Datas:** `utils/dates.ts` e `data/checkups.ts` usam as tabelas de meses e
dias de `S.dates` (não `Intl`, que varia entre iOS/Android/web e o Hermes
só implementa em parte). Em PT o resultado é igual ao que as Functions
escrevem nos alertas ("seg, 7 set às 10:30"); em EN "Mon, 7 Sep at 10:30".

**Firebase Auth:** `AuthContext` define `auth.languageCode = languageTag`
no arranque — os templates **por defeito** do Firebase (repor password,
que é também o "define a tua password" das contas criadas por um pedido de
orçamento) saem em PT ou EN conforme o telemóvel. Um template
personalizado na consola é só numa língua; se o Fábio o traduzir na
Secção 11, é ele que manda.

**Builds (só contam na parte 2 da Secção 11):** o plugin
`expo-localization` no `app.json` leva `supportedLocales: ["pt", "en"]`
(iOS: `CFBundleLocalizations`, aparece "Idioma" nas Definições da app;
Android 13+: `locales_config.xml`, idem) e `locales/pt.json` +
`locales/en.json` têm os textos de permissão iOS (câmara e fotos) nos dois
idiomas, com `CFBundleAllowMixedLocalizations`. O `expo-image-picker`
continua com os textos PT como reserva. O nome da app não está localizado
(é "Marble Studios" nos dois).

**Push (Android):** o nome do canal de notificações
("Alertas da Marble Studios" / "Marble Studios alerts") é decidido na
primeira vez que a app cria o canal; mudar o idioma do telemóvel depois
não o renomeia (limitação do Android, cosmético).

## Lançamento nas lojas (Secção 11)

Parte 1 feita a 2026-09-05 — **sem builds nem submissão**, que são a parte
2 (depois das Secções 7, 8, 10 e 12 estarem no master). O que só o Fábio
pode fazer (contas Apple/Google, D-U-N-S, Blaze no prod, segredos, chave
FCM do prod), com links e prazos, está em `docs/store/checklist-contas.md`;
a ficha das lojas (PT/EN) e os formulários "Data safety" / "App Privacy"
em `docs/store/ficha-loja.md`, `data-safety.md` e `app-privacy.md`.

### Ícones, ícone adaptativo e splash

- Tudo sai de `npm run build:icons` (`scripts/build-icons.mjs`) a partir do
  `assets/logo.png` (dourado sobre preto puro, sem alfa): o script recorta o
  logo, deriva a transparência da luminosidade e redimensiona por média de
  área. Nunca edites os PNG à mão — troca o logo e corre o script. Usa o
  `pngjs` que já vem com o Expo (sem dependências novas; o `sharp` foi
  evitado porque o npm bloqueia scripts de instalação).
- Ficheiros: `assets/icon.png` (1024, opaco — a Apple recusa transparência),
  `android-icon-foreground.png` (logo a 600 px em 1024: dentro da zona
  segura de 66 % de qualquer máscara), `android-icon-monochrome.png`
  (silhueta branca com alfa, ícones temáticos do Android 13+),
  `splash-icon.png` (transparente; o plugin `expo-splash-screen` centra-o
  num fundo preto com `imageWidth: 260`), `favicon.png`,
  `logo-transparent.png` (o logo com alfa real, para materiais futuros — o
  SPEC pedia-o) e, para o Play Console, `docs/store/play-icon-512.png` e
  `docs/store/feature-graphic-1024x500.png`.
- `app.json`: `name` "Marble Studios" (era "marble-app" — é o nome que
  aparece debaixo do ícone), `userInterfaceStyle: "dark"` e
  `backgroundColor: "#000000"` (a app é preta; sem flash branco entre o
  splash e o primeiro ecrã, e os diálogos nativos saem escuros),
  `ios.supportsTablet: false` (sem screenshots nem revisão de iPad),
  `ios.config.usesNonExemptEncryption: false` (só HTTPS; evita a pergunta de
  export compliance em cada build), `android.adaptiveIcon.backgroundColor`
  preto (o PNG de fundo do template foi apagado). Nada disto chega ao
  telemóvel sem uma build EAS nova.

### Variantes: "Marble Dev" e "Marble Studios"

`app.config.js` (config dinâmica, por cima do `app.json`, que continua a
ser a fonte de tudo o que é estático) escolhe pela variável `APP_VARIANT`:

| `APP_VARIANT` | Nome | Pacote / bundle | Firebase | Quando |
|---|---|---|---|---|
| `production` | Marble Studios | `pt.marble.app` | prod | perfis `production` e `preview` do `eas.json` |
| outro / vazio | Marble Dev | `pt.marble.app.dev` | dev | perfil `development`, `expo start`, `expo config` |

Porquê: no EAS as credenciais Android (keystore e a chave FCM V1 que
entrega o push) são guardadas **por nome de pacote**, não por perfil. Com um
só pacote, dev e prod partilhariam a chave FCM e o push só chegaria a um
deles. Consequências: (1) a próxima development build sai como "Marble
Dev" e instala-se ao lado da app real; (2) `pt.marble.app` no EAS passa a
ser só produção — a chave FCM V1 que lá está é a do **dev** e tem de ser
trocada pela do prod (checklist, passo 7), e a do dev volta a ser carregada
em `pt.marble.app.dev` depois da primeira dev build nova; (3) a dev build
atual continua a funcionar, mas fica sem push a partir dessa troca.

### Firebase Android: `google-services.json`

- O da **raiz** é o do dev e traz os dois clientes do projeto dev
  (`pt.marble.app`, o antigo, e `pt.marble.app.dev`) — o plugin do Gradle
  escolhe o que bate com o pacote. Vai para o git (só identificadores
  públicos).
- O do **prod** (`google-services.prod.json`, pacote `pt.marble.app`) está
  no `.gitignore` e carregado no EAS como variável **secreta de ficheiro**
  `GOOGLE_SERVICES_JSON` do ambiente `production` (`npx.cmd eas-cli env:list
  --environment production`). Os perfis `preview`/`production` têm
  `environment: "production"`, o EAS expõe a variável como caminho absoluto
  e `app.config.js` usa-a em `android.googleServicesFile`; sem a variável
  (local, dev) cai no ficheiro da raiz. Para o refazer:
  `npx.cmd firebase-tools apps:sdkconfig ANDROID 1:1081673947718:android:4fab7bdcfd8fb0bb4d4847 --project prod --out google-services.prod.json`
  e depois `npx.cmd eas-cli env:set --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.prod.json --visibility secret --scope project`
  (o `env:create` ainda funciona mas está deprecado).
- iOS não precisa de `GoogleService-Info.plist`: a app usa o SDK JS do
  Firebase e o push no iOS vai por APNs através do Expo.

### `.env.production` e perfis do EAS

- `.env.production` **está no git** desde a Secção 11 (o `.gitignore`
  deixou de o excluir): os valores são públicos e o EAS Build só vê
  ficheiros que o git conhece. O Expo carrega-o sempre que
  `NODE_ENV=production` — o `expo export` que o EAS corre — e nunca no
  `expo start`. O `.env` (dev) continua fora do git.
- `eas.json`: `development` (dev client, APK, `APP_VARIANT=development`,
  ambiente `development`); `preview` (APK interno **com config de prod**,
  para testar a release candidate antes da loja; para testar contra dados
  de dev usa-se a dev build + `expo start`); `production` (AAB para a loja,
  `autoIncrement` do `versionCode`/`buildNumber` geridos no EAS —
  `appVersionSource: remote`). `submit.production.android` usa
  `serviceAccountKey.play.json` (chave da conta de serviço do Play, parte 2;
  já no `.gitignore`), track `internal`, estado `draft`. iOS submete-se
  interativamente (`eas submit` pergunta o Apple ID e cria o registo no App
  Store Connect).
- Parte 2: `npx.cmd eas-cli build --profile production --platform android`
  (e `ios`), depois `npx.cmd eas-cli submit --profile production --platform android`.

### Páginas públicas (Firebase Hosting)

- `docs/` é publicado no site **`marble-studios-app`** do projeto prod
  (target `legal` em `.firebaserc`; `firebase.json` ignora `store/**` e
  `*.md`): https://marble-studios-app.web.app/ (suporte, com resumo em
  inglês), `/legal/politica-de-privacidade.html`,
  `/legal/termos-de-utilizacao.html` e `/legal/apagar-conta.html`. São os
  URLs que vão para as duas lojas (`docs/store/ficha-loja.md`).
- `npm run build:legal` gera também `docs/index.html`. Depois de mudar
  `src/legal/texts.ts`: `npm run build:legal` e
  `npx.cmd firebase-tools deploy --only hosting:legal --project prod` (prod:
  pede confirmação ao Fábio).
- GitHub Pages ficou de fora: o repositório é privado e o Pages em
  repositórios privados exige GitHub Pro.
- Domínio próprio (ex. `app.marble.pt`): consola Firebase → Hosting → site
  `marble-studios-app` → Add custom domain (dois registos DNS, SSL
  automático). Trocar depois os URLs na ficha das lojas.

### Estado do prod (2026-09-05)

| | Estado |
|---|---|
| Regras e índices do Firestore | publicados (versão do master de 2026-09-05, já com as Secções 7 e 8; republicar na parte 2 se mudarem entretanto) |
| App Android `pt.marble.app` | registada; `google-services.prod.json` no EAS |
| Hosting `marble-studios-app` | publicado (4 páginas) |
| Blaze | **por fazer (Fábio)** — ligar o projeto à "My Billing Account" |
| Segredos do Cloudinary e do Resend | **por fazer (Fábio)** — `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY` |
| Cloud Functions | **por publicar** (depois do Blaze): `deploy --only functions --project prod`; depois dos segredos, `CLOUDINARY_CLEANUP=on`, `QUOTE_EMAIL=on` e `BACKOFFICE_URL` do prod em `functions/.env` |
| Chave FCM V1 do prod no EAS | **por fazer (Fábio)** |
| App Check (pedidos de orçamento) | **por fazer** (parte 2, precisa das apps nas lojas) |
| Auth | Email/Password ativo; templates de email por defeito em inglês — traduzir em Authentication → Templates (o "Password reset" é também o "define a tua password" das contas criadas por um pedido de orçamento) |
| Dados | vazio (o seed recusa chaves do prod, de propósito) |

## Onde vive o projeto (e porquê)

`C:\Users\VGodr\Projects\marble-app` — **fora do OneDrive, de propósito.**
Esteve dentro do OneDrive no início e o Metro (o compilador do Expo) não
detetava alterações aos ficheiros, porque o OneDrive interfere com a
monitorização de ficheiros do Windows. Foi movido em 2026-09-02 e o
problema desapareceu. Nunca o movas de volta para uma pasta sincronizada
(OneDrive/Dropbox/Google Drive). Se algum dia editares um ficheiro e a app
continuar a mostrar a versão antiga, para o servidor (Ctrl+C) e volta a
correr `npx expo start`.

**Depois de um `git merge` que traz ficheiros novos** (típico no fim de
cada secção), o Metro que já estava a correr pode não os ver e a app no
telemóvel mostra um ecrã vermelho "Unable to resolve module ...". Não é
erro no código: para o servidor (Ctrl+C) e arranca com a cache limpa:

```bash
npx.cmd expo start --clear
```

## GitHub: cópia de segurança e trabalhar noutro computador

O repositório está em **https://github.com/vampiregodric/marble-app**
(privado, conta `vampiregodric`). É a única cópia fora deste PC — por isso
**cada commit tem de ser enviado**:

```bash
git push
```

O `git push` está autorizado para o Claude nas definições do projeto
(`.claude/settings.json`), por isso cada conversa deve fazê-lo sozinha no
fim do trabalho. Se alguma vez for bloqueado (conversa aberta antes destas
definições existirem), corre tu o `git push` no teu PowerShell. Na primeira vez em cada
máquina abre-se uma janela "Connect to GitHub": escolhe "Sign in with your
browser". Se a fechares por engano e o terminal pedir `Username`, faz
Ctrl+C e corre o push outra vez.

Para continuar o trabalho **noutro computador** (o tablet só serve para
acompanhar a conversa — não corre código):

```bash
git clone https://github.com/vampiregodric/marble-app.git
```

Depois, dentro da pasta: `npm install`, copia `.env.example` para `.env` e
preenche com os valores do projeto `marble-studios-dev` (consola Firebase >
Definições do projeto > Your apps). O `.env` não vem do git de propósito.
Node.js tem de estar instalado (versão LTS).
