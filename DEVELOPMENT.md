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
- **Escritas do cliente:** só `clients/{uid}` (perfil) e `read` em
  `notifications` (`markNotificationRead`). Tudo o resto é da equipa.
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
email só sai com `RESEND_API_KEY` no ambiente). Foi assim que a
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
   identificadores públicos; pode ir para o git). O prod precisa do seu
   próprio (Secção 11).
4. Credencial FCM V1 no EAS (é o que deixa o Expo entregar no Android): em
   https://expo.dev → projeto → Credentials → Android → Service
   Credentials → FCM V1 → carregar a chave de service account do Firebase
   (a mesma `serviceAccountKey.dev.json` serve). Ou `npx.cmd eas-cli credentials`
   (interativo).
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

## Páginas de departamento (Secção 9)

Tocar num cartão do Início abre `src/screens/DepartmentScreen.tsx` (rota
`Department { id }`, URL web `services/:id`) — decisão do Fábio
(2026-09-04): serviços primeiro, o Portfólio filtrado fica a um toque
dentro da página. Regras:

- **O conteúdo é código, não Firestore.** Tudo em
  `src/data/departmentContent.ts` (`CONTENT.pt[id]`: `headline`, `intro`,
  `services[]`, `steps[]`, `pricing`, `cta`). Para mudar um texto edita-se
  aí e sai numa versão nova da app. Não há coleção, regras nem ecrã de
  backoffice para isto. O nome e a tagline vêm de `DEPARTMENTS`
  (`src/data/departments.ts`); a foto do topo é a do cartão
  (`settings/home.departmentCovers`, escolhida no backoffice).
- **Um departamento novo = uma entrada nova.** `hasDepartmentContent(id)`
  decide se o cartão do Início abre a página; sem entrada o cartão fica
  inerte (é o caso da Xtreme até à Secção 10). Para a Inozetek é preciso
  ainda o `DepartmentId` em `models.ts` (app e backoffice, iguais) e a
  linha em `DEPARTMENTS`.
- **`cta`** é `{ kind: 'quote', label }` (abre `RequestQuote` com
  `{ department }`) ou `{ kind: 'link', label, url }` (abre um URL externo
  — loja da Xtreme).
- **Idiomas:** `CONTENT.en` existe e está vazio; `departmentContent(id,
  locale)` cai para PT. Quando a app inteira ganhar inglês, preenche-se.
- **Trabalhos recentes:** os departamentos com `category` mostram os 6
  trabalhos publicados mais recentes dessa categoria, com a mesma escuta
  do Portfólio (`usePublishedWorks`, filtro em memória) — sem índice novo.
- **`RequestQuote`** é o formulário da Secção 7 (ver "Pedidos de
  orçamento" acima): `cta.kind === 'quote'` abre-o com `{ department }` e
  o formulário desse departamento vem de `src/data/requestForms.ts`.

## Firebase: os dois projetos

| | dev | prod |
|---|---|---|
| Project ID | `marble-studios-dev` | `marble-studios-prod` |
| Firestore | `(default)`, `eur3`, production mode | idem |
| Auth | Email/Password | Email/Password |
| App web | "Marble Studios App" | "Marble Studios App" |
| Config | `.env` | `.env.production` |
| Analytics / Gemini / Dev Program | desligados | desligados |

Conta Google dona dos dois: `v.godric@gmail.com`. Se um dia a Marble
Studios tiver conta Google própria, adiciona-a como Owner em
**Definições do projeto > Users and permissions** nos dois projetos.

Ambos foram criados em **production mode** (tudo negado por defeito) — não
há janela de 30 dias de base de dados aberta. As regras reais estão em
`firestore.rules` e os índices em `firestore.indexes.json`; ambos publicados
no **dev** (versão da Secção 4, 2026-09-03). O **prod** ainda tem as regras
iniciais de production mode (tudo negado) e nenhum índice — publica lá na
Secção 11, antes do lançamento.

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
propósito. Se uma conversa aberta antes destas regras existirem for
bloqueada, corre tu o comando no teu PowerShell.

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

Nunca à mão. `npx expo start` lê sempre `.env` (dev). Só uma build de
produção (`eas build --profile production`) lê `.env.production`. Se
precisares de testar contra prod localmente (raro, e só depois do
lançamento), cria `.env.local` com os valores de prod — está no
`.gitignore` e sobrepõe-se ao `.env`; apaga-o quando acabares.

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
