# Auditoria 2026-09-12 — arquitetura

## Âmbito

Lidos (só leitura, nada alterado):

- App: `src/**` (72 ficheiros — inteiros: `firebase/models.ts`,
  `auth/AuthContext.tsx`, `data/*.ts`, `legal/texts.ts`, `i18n/*`,
  `media/cloudinary.ts`; por amostragem dirigida nos ecrãs, que não tocam no
  Firestore), `App.tsx`, `firestore.rules`, `firestore.indexes.json`.
- Functions: `functions/src/**` (20 ficheiros — inteiros: `types.ts`,
  `consent.ts`, `index.ts`, `handlers.ts`, `simulations.ts`,
  `jobs/followUps.ts`, `jobs/retention.ts`; `texts.ts` e `requests.ts` nas
  partes de formatação e constantes).
- Backoffice: `../marble-backoffice/src/**` (40 ficheiros — inteiros:
  `firebase/models.ts`, `data/writes.ts`, `data/DataContext.tsx`,
  `utils/departments.ts`, `utils/checkups.ts`, `utils/followUp.ts`,
  `components/SendAlertModal.tsx`; grep dirigido no resto).
- Scripts: cabeçalhos e guardas dos 14 `.mjs` da app + os 2 do backoffice.
- Configuração: `.env`, `.env.example`, `.env.production`, `functions/.env`,
  `functions/.env.marble-studios-prod`, `app.json`, `app.config.js`,
  `eas.json`, `.firebaserc`, `../marble-backoffice/.env.example`,
  `package.json` dos dois repositórios.
- Contexto: `CLAUDE.md` (app e backoffice), `AGENTS.md`, `SPEC.md`
  ("Decisões de arquitetura"), `ROADMAP.md` (linhas `**Estado:**`, Secções 11
  e 16), `DEVELOPMENT.md` (App Check/Secção 11c, `.env.production` e perfis
  do EAS, Simulador, retenção).

Ficou de fora: `docs/store/**` (ficha das lojas, sem código),
`assets/**`, `scripts/build-icons.mjs` e `scripts/build-audit.mjs` (só
geram ficheiros locais), o painel do EAS e a consola Firebase (sem acesso).

Comandos corridos (todos só de leitura):

| Comando | Resultado |
|---|---|
| `diff --strip-trailing-cr -u src/firebase/models.ts ../marble-backoffice/src/firebase/models.ts` | saída vazia, código 0 — as duas cópias são idênticas (só diferem no fim de linha: app CRLF, backoffice LF) |
| `git log -1 --format=%h -- src/legal/texts.ts` e `-- docs/legal` | ambos `3111a4c` — o HTML legal foi regenerado no mesmo commit que o texto |
| `git show --stat 3111a4c \| grep env` | o commit da Secção 16 tocou em `.env.example` e `functions/.env`, **não** em `.env.production` |
| `git log --oneline -3 -- .env.production` | último toque `37b78b0`/`447aabc` (Secção 11) — anterior à Secção 16 |
| `grep -rn "from 'firebase/firestore'" src \| grep -v src/data\|src/firebase` | só `AuthContext.tsx`, `push.native.ts`, `ListState.tsx` (tipo) e `utils/dates.ts` (tipo) — nenhum ecrã fala com o Firestore |
| `grep -rln "'xps'" src functions/src firestore.rules ../marble-backoffice/src` | 10 ficheiros nos dois repositórios |
| `grep -rn "^export const [A-Z_]* = " functions/src` | constantes de domínio duplicadas (ver ARQ-03) |
| `git log --oneline -1` (app / backoffice) | `28b0700` / `1c532f2` |

## Contagem

| Severidade | Achados |
|---|---|
| Crítico | 0 |
| Alto | 2 |
| Médio | 7 |
| Baixo | 5 |
| Sugestão | 2 |

## Mapa

```
                       ┌──────────────────────────────────────────────┐
                       │           Firebase Auth (um só)              │
                       │  cliente (app)  ·  equipa (custom admin:true)│
                       └───────┬──────────────────────┬───────────────┘
                               │                      │
  ┌────────────────────────────▼──────┐   ┌───────────▼────────────────────┐
  │  APP  (Expo/RN, SDK cliente JS)   │   │  BACKOFFICE (Vite/React,       │
  │  ecrãs → src/data/*  → src/firebase│   │  SDK CLIENTE, sem servidor)    │
  │  AuthContext (clients/{uid})      │   │  data/DataContext (tudo em     │
  │  V: só UI (limites, consentimento)│   │  memória) → data/writes.ts     │
  └────────────┬──────────────────────┘   │  V: só UI (RGPD em             │
               │                          │  sendNotification)             │
               │  escrita validada        └───────────┬────────────────────┘
               │  campo a campo                       │  escrita sem
               ▼                                      ▼  validação (isAdmin)
      ╔════════════════════════════════════════════════════════════════╗
      ║ FIRESTORE  (eur3)   —  firestore.rules  = a ÚNICA validação     ║
      ║  works  events  settings  clients  vehicles  notifications      ║
      ║  requests  samples  simulations   (+ system/* só Admin SDK)     ║
      ║  V: validNewRequest, validNewSimulation, ownerCheckupWrite      ║
      ║     clients/{uid}: update do dono SEM restrição de campos ◄ARQ-02║
      ╚═══╦═══════════════╦═══════════════════╦════════════════════╦════╝
          │ triggers      │                   │                    │ Admin SDK
          ▼               ▼                   ▼                    ▼
  ┌───────────────────────────────────────────────────┐   ┌──────────────────┐
  │ CLOUD FUNCTIONS v2 (europe-west1, Admin SDK)      │   │ scripts/*.mjs    │
  │  onNotificationCreated  onWorkWritten             │   │ (14, chave de    │
  │  onClientUpdated  onRequestWritten                │   │  service account,│
  │  onSimulationWritten  onVehicleUpdated            │   │  guarda "-dev"   │
  │  dailyJobs 10:00 Lisboa (recibos, followUps,      │   │  em 4 deles)     │
  │             eventos, retenção, simulações)        │   │ ◄ ARQ-14         │
  │  V: tectos, consentimento (consent.ts)            │   └──────────────────┘
  └───┬──────────┬──────────────┬───────────────┬─────┘
      ▼          ▼              ▼               ▼
 ┌─────────┐ ┌────────┐ ┌──────────────┐ ┌───────────────┐
 │ Expo    │ │ Resend │ │  Cloudinary  │ │  Vertex AI    │
 │ Push    │ │ email  │ │ fotos/vídeo  │ │ (mesmo projeto│
 │         │ │        │ │ upload       │ │  Google Cloud)│
 │         │ │        │ │ UNSIGNED     │ │               │
 │         │ │        │ │ (app + BO +  │ │               │
 │         │ │        │ │  Function)   │ │               │
 └─────────┘ └────────┘ └──────────────┘ └───────────────┘

 HOSTING  docs/  →  marble-studios-app.web.app   (docs/legal/*.html gerados
          de src/legal/texts.ts por scripts/build-legal-html.mjs — em dia)

 Legenda de validação (V):
   regras    = firestore.rules (a única barreira do lado do servidor)
   Functions = tectos diários, consentimento, limpeza — depois do facto
   só UI     = validado apenas no cliente (app ou browser da equipa)
```

Onde a validação existe de verdade:

| Escrita | Regras | Functions | Só UI |
|---|---|---|---|
| `requests` (criar, cliente) | campo a campo (`validNewRequest`) | tecto diário, rate-limit → `flagged` | limite por dispositivo |
| `simulations` (criar, cliente) | campo a campo (`validNewSimulation`) | 5/dia/cliente, tecto global | **consentimento do simulador** (ARQ-05) |
| `vehicles.checkupRequest` (cliente) | três transições exatas (`ownerCheckupWrite`) | alertas | dias disponíveis |
| `clients/{uid}` (cliente) | **nenhuma** — dono escreve tudo (ARQ-02) | — | tudo |
| Tudo o resto (equipa) | só `isAdmin()` | — | `writes.ts` + formulários |

## Matriz de propriedade dos campos

App-C = app do cliente (SDK cliente) · BO = backoffice (SDK cliente, `admin`)
· FN = Cloud Functions (Admin SDK) · SC = scripts `.mjs` (Admin SDK).
Só os campos com mais do que um interessado ou com nota; o resto está na
coluna "restantes".

### `clients/{uid}` — regras: dono lê/escreve **tudo**, equipa também

| Campo | Escreve | Lê | Nota |
|---|---|---|---|
| `name`, `phone` | App-C, BO, SC | App-C, BO, FN | dois escritores, sem arbitragem — último a gravar ganha |
| `email` | App-C (criação), BO (só `createdByTeam`) | todos | |
| `notes` | BO | BO | modelo diz "só o backoffice lê e escreve" — **as regras deixam o cliente ler e escrever** (ARQ-02) |
| `createdByTeam` | BO | FN (`consent.ts`), BO | cliente pode pôr `true` e ficar sem alertas (ARQ-02) |
| `mergedInto`, `deletedAt` | BO (merge), App-C (apagar conta), FN (retenção) | FN, BO | três escritores, cada um num caminho distinto |
| `consent.*` | App-C, SC (`demo-account`) | FN, BO | `simulatorVersion`/`simulatorAcceptedAt` não existem no tipo das Functions (ARQ-04) |
| `notificationPrefs` | App-C | FN | |
| `locale` | App-C | FN, BO | |
| `avatarUrl` | App-C | FN (limpeza Cloudinary), BO | |
| `pushTokens` | App-C (add/remove) | FN (limpa mortos) | FN também escreve |
| `lastActiveAt` | App-C (1×/dia) | FN (retenção) | |
| `retentionWarnedAt` | FN | FN | cliente pode escrevê-lo/apagá-lo (ARQ-02) |
| `onboardingSeenAt` | App-C | App-C | ausente em `functions/src/types.ts` |
| `updatedAt` | App-C, BO | **FN (retenção, como "atividade do cliente")** | ARQ-07 |
| restantes (`clientSince`, `createdAt`) | App-C/BO | todos | |

### `vehicles/{id}` — regras: dono lê; escreve a equipa + 3 transições do dono

| Campo | Escreve | Lê | Nota |
|---|---|---|---|
| `checkupStatus` | BO ("marcar em dia"), FN (`pending`/`declined`), SC | App-C, BO, FN | 3 escritores; a regra do dono exige `pending`/`declined` antes |
| `checkupRequest` | App-C (pedir/confirmar/cancelar), BO (aprovar/propor), SC | todos | **sem arbitragem entre equipa e cliente** (ARQ-08) |
| `checkupRequestedAt` | App-C | FN (followUps) | |
| `checkupDoneAt` | BO, SC | FN | |
| `lastServiceAt` | **FN** (`handleWorkWritten`), BO | App-C, BO | dois escritores; FN só avança a data |
| `plate` | BO | BO (a app não mostra, mas o dono pode ler o doc) | |
| restantes (`name`, `model`, `type`, `photoUrl`) | BO | todos | |

### `works/{id}` — regras: leitura pública só se `published`; escrita da equipa

| Campo | Escreve | Lê | Nota |
|---|---|---|---|
| `followUp.checkupDays/teamAlertDays/offerDays/active` | BO (mapa inteiro, fundido com o que lá está) | FN (job diário) | `active` calculado por `followUpFinished`, duplicado nos dois lados (idêntico hoje) |
| `followUp.*At`, `offerSkipped` | **FN** | BO (mostra) | o BO preserva-os do snapshot em tempo real |
| `newWorkNotifiedAt` | FN | FN | |
| `featured`, `featuredOrder` | BO | App-C (carrossel) | `featuredOrder` gravado a `null` (ARQ-13) |
| `services`, `brands`, `media`, `products` | BO, SC (`migrate-work-tags`) | App-C | ausentes em `functions/src/types.ts` |
| restantes | BO | todos | |

### `notifications/{id}` — regras: dono lê (e só marca `read`); equipa tudo

| Campo | Escreve | Lê | Nota |
|---|---|---|---|
| `type: 'team_alert'` | FN, (BO não os cria) | BO — **e o cliente**, se lá for buscar | separação só no filtro da app (ARQ-06) |
| `read` | App-C, BO | ambos | única escrita do cliente |
| `push` | FN | BO | |
| `createdAt` | FN (servidor), **BO (relógio do PC)** | App-C (ordenação), BO | ARQ-11 |
| restantes | FN/BO | App-C | |

### `requests/{id}` — regras: dono cria (campo a campo) e lê; equipa tudo

| Campo | Escreve | Lê | Nota |
|---|---|---|---|
| do formulário | App-C (criação; nunca altera) | BO, FN | |
| `status`, `notes`, `contactedAt`, `closedAt` | BO | App-C (`status`), FN | |
| `flagged`, `processedAt`, `teamAlertId`, `confirmationId`, `emailSentAt`, `emailError`, `anonymizedAt` | FN | BO | |

### `simulations/{id}` — regras: dono cria/lê/apaga e só liga `requestId`

| Campo | Escreve | Lê | Nota |
|---|---|---|---|
| `photo`, `source`, `kind`, `status:'pending'` | App-C | FN, BO | |
| `status`, `result`, `error`, `model`, `durationMs`, `processedAt` | FN | App-C, BO | |
| `requestId` | App-C | FN (retenção) | |

### `samples/{id}`, `settings/{home,checkups}`, `system/*`

| Coleção | Escreve | Lê | Nota |
|---|---|---|---|
| `samples` | BO | App-C (só `published`), FN | `description` escrito e nunca lido (ARQ-12) |
| `settings/home` | BO | App-C | |
| `settings/checkups` | BO, SC (`checkup-admin`) | App-C (opções), BO | |
| `system/requestGuard`, `system/simulationGuard` | FN | FN | sem `match` nas regras → fechado por omissão, correto |

**Conflitos assinalados:** `clients.*` sem qualquer restrição de campos
(ARQ-02); `clients.updatedAt` com semântica de "atividade do cliente" mas
escrito pela equipa (ARQ-07); `vehicles.checkupRequest` com dois decisores
sem condição de escrita (ARQ-08); `notifications.createdAt` com duas fontes
de tempo (ARQ-11). **Campos mortos:** `samples.description` (ARQ-12).
**Campos escritos fora do tipo:** `works.featuredOrder: null` (ARQ-13).

## Achados

### ARQ-01 — Simulador desligado em qualquer build de loja: falta o preset no `.env.production`
- **Vertente:** arquitetura
- **Severidade:** Alto
- **Superfície:** app
- **Onde:** `.env.production:1-25`, `.env.example:36`, `src/media/cloudinary.ts:28`, `src/media/cloudinary.ts:34`, `scripts/check-setup.mjs:179-195`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a Secção 16 acrescentou `EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS` ao `.env` (dev) e ao `.env.example`, mas não ao `.env.production` — o ficheiro que, segundo o `DEVELOPMENT.md` ("`.env.production` e perfis do EAS"), é o único que o Expo carrega quando `NODE_ENV=production`, ou seja, no `expo export` que o EAS corre nos perfis `preview` e `production`.
- **Cenário de falha:** `eas build --profile production` → a app instalada tem `simulationUploadConfigured === false` → o simulador desaparece das páginas Epoxy Floors/Xtreme/Automotive e do Detalhe, e quem lá chegar vê "O simulador ainda não está ativo nesta versão da app". Silencioso: não há erro nem no build nem no arranque, e o `check:setup` só confirma que o ficheiro existe.
- **Evidência:**
```
$ grep -o "^EXPO_PUBLIC_[A-Z_]*" .env.production | tail -3
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
EXPO_PUBLIC_CLOUDINARY_PRESET_AVATARS
EXPO_PUBLIC_CLOUDINARY_PRESET_REQUESTS      <- não há PRESET_SIMULATIONS
$ git show --stat 3111a4c | grep env        # commit da Secção 16
 .env.example    | 5 +
 functions/.env  | 21 ++                    <- .env.production não foi tocado
```
- **Correção proposta:** acrescentar a linha ao `.env.production` (e o mesmo para qualquer variável futura), e fazer o `check:setup` comparar as **duas** direções — `.env` vs `.env.example` (já faz) e `.env.production` vs `.env.example`, avisando das chaves em falta:
```js
// scripts/check-setup.mjs, a seguir ao bloco do .env
const wanted = keysOf(read('.env.example'));
const prod = keysOf(read('.env.production'));
const falta = wanted.filter((k) => !prod.includes(k));
if (falta.length) falta(`.env.production sem: ${falta.join(', ')}`, 'as builds do EAS (preview/production) só leem este ficheiro.');
```
- **Esforço:** S

### ARQ-02 — O cliente pode escrever qualquer campo do seu `clients/{uid}`, incluindo os da equipa e das Functions
- **Vertente:** arquitetura
- **Severidade:** Alto
- **Superfície:** regras
- **Onde:** `firestore.rules:125-129`, `src/firebase/models.ts:96-98`, `src/firebase/models.ts:127-129`, `../marble-backoffice/src/data/writes.ts:154-163`, `functions/src/jobs/retention.ts:119`, `functions/src/consent.ts:13-15`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `match /clients/{clientId}` dá `update` ao dono sem nenhuma restrição de campos — ao contrário de `notifications` (só `read`), `simulations` (só `requestId`) e `vehicles` (só três transições de `checkupRequest`), que são restritos com cuidado. Campos que o modelo declara como sendo da equipa (`notes`, `createdByTeam`, `mergedInto`) ou das Functions (`retentionWarnedAt`) ficam escritos e legíveis pelo próprio cliente. Contraria a decisão escrita no modelo: "Notas internas da equipa (só o backoffice lê e escreve)" (`src/firebase/models.ts:97`).
- **Cenário de falha:** um cliente com sessão (ou a própria app, com um bug num `updateDoc`) faz `updateDoc(doc(db,'clients',uid), { notes: '', createdByTeam: true })`: as notas internas da equipa desaparecem sem registo, e `hasAppAccount()` passa a devolver `false` — o cliente deixa de receber lembretes de checkup, ofertas e confirmações de pedido, e o backoffice deixa de o listar em `activeClients`. Nada falha em lado nenhum; só se nota quando alguém pergunta porque é que não recebeu o lembrete.
- **Evidência:**
```
firestore.rules:125  match /clients/{clientId} {
firestore.rules:126    allow read, update: if (signedIn() && request.auth.uid == clientId) || isAdmin();
firestore.rules:127    allow create: if (signedIn() && request.auth.uid == clientId) || isAdmin();
firestore.rules:128    allow delete: if false;
```
- **Correção proposta:** limitar o `update` do dono aos campos que a app escreve (`AuthContext.updateClient/acceptTerms/setMarketingConsent/acceptSimulatorConsent/markOnboardingSeen/deleteAccount` e `push.native.ts`), deixando a equipa sem restrição:
```
function ownerClientWrite() {
  let keys = request.resource.data.diff(resource.data).affectedKeys();
  return keys.hasOnly(['name','phone','locale','avatarUrl','notificationPrefs','consent',
                       'pushTokens','lastActiveAt','onboardingSeenAt','deletedAt','updatedAt','email']);
}
match /clients/{clientId} {
  allow read: if (signedIn() && request.auth.uid == clientId) || isAdmin();
  allow update: if isAdmin() || (signedIn() && request.auth.uid == clientId && ownerClientWrite());
  ...
}
```
`notes` fica de fora da escrita mas continua legível pelo dono — para o tirar da leitura é preciso mudá-lo de sítio (ex.: `clients/{uid}/private/team`), o que é uma alteração maior; a decisão fica para o Fábio. Verificar com `npm run check:firestore:auth`, que já testa as escrituras do cliente.
- **Esforço:** M

### ARQ-03 — Os limites e prazos do domínio vivem em duas ou três cópias sem guarda nenhuma
- **Vertente:** arquitetura
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `src/firebase/models.ts:746-754`, `src/firebase/models.ts:611-620`, `src/legal/texts.ts:56-73`, `functions/src/simulations.ts:23-24`, `functions/src/requests.ts:26-27`, `functions/src/jobs/retention.ts:22-23`, `firestore.rules:93-96`, `firestore.rules:151`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** cada número do domínio (quantas simulações por dia, quantos dias se guardam, quantas fotos por pedido, quantos caracteres na mensagem) está escrito entre duas e quatro vezes, em ficheiros que nenhum compilador liga: os dois `models.ts`, `src/legal/texts.ts` (a versão que o cliente lê na política), as constantes das Functions e os literais das regras. O comentário do próprio modelo admite-o ("Se mudares aqui, muda lá") mas não há nada que falhe quando a mudança fica por fazer num dos sítios.
- **Cenário de falha:** o Fábio sobe o limite de simulações para 10 em `SIMULATION_LIMITS.perDayMax`; a app deixa de avisar às 5, mas a Function continua a marcar `status: 'limited'` à 6.ª (`SIMULATION_PER_DAY` ficou a 5). O cliente carrega a foto, gasta o upload para o Cloudinary e recebe "chegaste ao limite de hoje" sem a app ter avisado antes. O mesmo se aplica a `photosMax` (models) vs `photos.size() <= 5` (regras), onde o resultado é um `permission-denied` no envio do pedido.
- **Evidência:**
```
src/firebase/models.ts:749    perDayMax: 5,          src/legal/texts.ts:72   simulationDays: 90,
src/firebase/models.ts:751    retentionDays: 90,     src/legal/texts.ts:68   requestMonths: 12,
functions/src/simulations.ts:23 export const SIMULATION_PER_DAY = 5;
functions/src/simulations.ts:24 export const SIMULATION_RETENTION_DAYS = 90;
functions/src/requests.ts:26    export const RATE_LIMIT_PER_DAY = 3;      (= REQUEST_LIMITS.perDayMax)
functions/src/requests.ts:27    export const REQUEST_RETENTION_DAYS = 365; (= RETENTION.requestMonths 12)
firestore.rules:93-96           services.size() <= 12 / fields.size() <= 8 / photos.size() <= 5
```
- **Correção proposta:** ver ARQ-15 (`npm run check:models`): um script sem dependências que leia os quatro ficheiros e falhe quando um par não bate. Alternativa mais barata e sem script: pôr em cada literal duplicado um comentário com o caminho exato do gémeo (`// = SIMULATION_LIMITS.perDayMax em ../../src/firebase/models.ts`), como já acontece nas regras.
- **Esforço:** S

### ARQ-04 — Nada falha quando os três modelos divergem; as cópias pequenas já divergiram
- **Vertente:** arquitetura
- **Severidade:** Médio
- **Superfície:** backoffice
- **Onde:** `src/firebase/models.ts`, `../marble-backoffice/src/firebase/models.ts`, `functions/src/types.ts:58-63`, `../marble-backoffice/src/utils/departments.ts:18-27`, `src/data/departments.ts:29-38`, `../marble-backoffice/CLAUDE.md:8-10`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os dois `models.ts` estão hoje byte a byte iguais (a sincronização à mão que o `CLAUDE.md` do backoffice pede está a funcionar), mas a garantia é só disciplina: `npm run typecheck` corre em cada repositório isoladamente e não vê o outro, e o `check:setup` não compara nada. As cópias *mais pequenas* do mesmo modelo — as que ninguém compara — já divergiram: `functions/src/types.ts` não tem `consent.simulatorVersion`/`simulatorAcceptedAt` (Secção 16), e a lista de departamentos do backoffice perdeu o `category: 'Epoxy Floors'` do cartão `xps`.
- **Cenário de falha:** hoje nenhuma das duas divergências muda comportamento (as Functions nunca leem o consentimento do simulador — ver ARQ-05; o backoffice nunca lê `Department.category`, confirmado por grep). Mas é exatamente assim que se chega ao caso mau: na primeira Function que precise de `consent.simulatorVersion`, o campo não existe no tipo e a leitura devolve `undefined` sem erro de compilação — é um `as Client` sobre `snap.data()`, não uma validação.
- **Evidência:**
```
$ diff --strip-trailing-cr -u src/firebase/models.ts ../marble-backoffice/src/firebase/models.ts; echo $?
0                                        # iguais — mas por disciplina, não por verificação

src/firebase/models.ts:65-66      simulatorVersion?: string;  simulatorAcceptedAt?: Timestamp | null;
functions/src/types.ts:58-63      interface ClientConsent { termsVersion; termsAcceptedAt; marketing; marketingUpdatedAt }

src/data/departments.ts:35        { id: 'xps', …, category: 'Epoxy Floors', badge: … }
../marble-backoffice/src/utils/departments.ts:26  { id: 'xps', name: …, tagline: 'Buy your epoxy here' }
```
- **Correção proposta:** ver ARQ-15. Enquanto não existir, pelo menos acrescentar a comparação dos dois `models.ts` ao `check:setup` (é um `readFileSync` + normalizar `\r\n` + comparar), que já corre sempre que algo "não funciona nesta máquina" e já sabe encontrar o backoffice ao lado.
- **Esforço:** S

### ARQ-05 — O consentimento do simulador é verificado só na app; as regras e a Function não o veem
- **Vertente:** arquitetura
- **Severidade:** Médio
- **Superfície:** regras
- **Onde:** `src/auth/AuthContext.tsx:197`, `src/auth/AuthContext.tsx:261-268`, `firestore.rules:236-247`, `functions/src/simulations.ts:181-243`, `functions/src/types.ts:58-63`, `src/legal/texts.ts:69-72`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a base legal do simulador é o consentimento (SPEC, "Ideias para depois do lançamento"; `ClientConsent.simulatorVersion` no modelo), e o consentimento é pedido e verificado exclusivamente em `needsSimulatorConsent`, no cliente. `validNewSimulation` valida a forma do documento mas não o consentimento; `handleSimulationCreated` verifica tectos e chama o Vertex AI sem olhar para `clients/{uid}.consent`. Nenhuma outra escrita com base legal no consentimento está desprotegida desta forma — o marketing, por exemplo, é imposto nas Functions (`consent.ts`) e no backoffice (`sendNotification`).
- **Cenário de falha:** qualquer escrita em `simulations` que não venha do ecrã do simulador (uma versão antiga da app sem a caixa, um `permission-denied` mal recuperado que leve a app a repetir a criação, ou um pedido feito com o SDK fora da app) manda a foto do chão/carro do cliente para o Vertex AI e guarda o resultado no Cloudinary sem que exista prova de consentimento — exatamente a prova que `ClientConsent` foi criado para ter.
- **Evidência:**
```
src/auth/AuthContext.tsx:197   needsSimulatorConsent: !client || client.consent?.simulatorVersion !== LEGAL_VERSION,
firestore.rules:236            function validNewSimulation(d) {          // forma, sim; consentimento, não
firestore.rules:237              return d.keys().hasOnly(['clientId','kind','photo','source','status','platform','createdAt','updatedAt'])
functions/src/simulations.ts:189  // 1. Por cliente: SIMULATION_PER_DAY …   // tectos; nenhuma leitura de consent
```
- **Correção proposta:** o mais barato e mais fiel ao desenho existente é verificar nas Functions, onde já se lê o cliente noutros handlers: em `handleSimulationCreated`, antes do passo 3, ler `clients/{sim.clientId}` e, sem `consent.simulatorVersion`, escrever `status: 'failed'` com um `error` próprio (a app já mostra a comparação lado a lado nesse estado). Requer acrescentar os dois campos a `ClientConsent` em `functions/src/types.ts` (ARQ-04). Nas regras seria preciso um `get()` por escrita — mais caro e mais frágil.
- **Esforço:** S

### ARQ-06 — Os alertas internos da equipa vivem na coleção que o cliente lê; a separação é um filtro na app
- **Vertente:** arquitetura
- **Severidade:** Médio
- **Superfície:** regras
- **Onde:** `firestore.rules:189-198`, `src/data/notifications.ts:24`, `functions/src/simulations.ts:254`, `functions/src/handlers.ts:149-152`, `src/firebase/models.ts:450`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `team_alert` é, no modelo, "alerta interno à equipa … nunca vai ao cliente", mas o documento é criado na coleção `notifications` com `clientId` = o uid do cliente a que diz respeito, e a regra de leitura é `ownsResource()`. A única coisa que separa a caixa de entrada da equipa da caixa de entrada do cliente é o `.filter((n) => n.type !== 'team_alert')` do hook da app.
- **Cenário de falha:** o cliente lê os `team_alert` sobre ele com o seu próprio token (a query é a mesma, sem o filtro): textos internos como "o cliente não confirmou o checkup há N dias", "cliente sem conta na app — liga-lhe" e o telemóvel da ficha. Pior: o alerta do tecto diário do simulador é criado com o `clientId` de quem calhou passar o tecto (`functions/src/simulations.ts:254`) — esse cliente passa a poder ler "Simulador no limite: 63 simulações em 24 h … sobe o tecto em functions/.env", um número de negócio que não lhe diz respeito.
- **Evidência:**
```
src/data/notifications.ts:9   // `team_alert` é interno à equipa e nunca se mostra ao cliente,
src/data/notifications.ts:24  const data = useMemo(() => state.data.filter((n) => n.type !== 'team_alert'), [state.data]);
firestore.rules:190           allow read: if ownsResource() || isAdmin();     // sem exceção para team_alert
functions/src/simulations.ts:254  createNotification(db, { clientId: sim.clientId, type: 'team_alert', … })
```
- **Correção proposta:** duas opções, por ordem de custo. (a) Uma linha nas regras — negar a leitura de `team_alert` a quem não é admin: `allow read: if isAdmin() || (ownsResource() && resource.data.type != 'team_alert');` — o filtro da app passa a ser redundante em vez de ser a única barreira; convém confirmar antes que a query da app continua a passar (o Firestore recusa a *query* quando uma regra depende de um campo não filtrado — testar com `npm run check:firestore:auth`, que já faz esta leitura). (b) Mover os alertas internos para uma coleção própria (`teamAlerts`) sem `match` de cliente — mais limpo, mas toca no backoffice, nas Functions e no ecrã Alertas do painel. O alerta do tecto do simulador devia deixar de usar o uid de um cliente seja qual for a opção.
- **Esforço:** S (opção a) / M (opção b)
- **Também:** provável sobreposição com a vertente de segurança/RGPD

### ARQ-07 — Uma edição da equipa na ficha do cliente reinicia o relógio dos 3 anos de retenção
- **Vertente:** arquitetura
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/jobs/retention.ts:98-106`, `functions/src/jobs/retention.ts:18-20`, `../marble-backoffice/src/data/writes.ts:154-163`, `../marble-backoffice/src/data/writes.ts:182-196`, `src/legal/texts.ts:57`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o job de retenção define "atividade do cliente" como a data mais recente entre várias, e uma delas é `clients.updatedAt`. Mas `updatedAt` não é propriedade do cliente: o backoffice grava-o em `updateClient` (guardar notas, corrigir o telemóvel) e em `mergeClients`. O comentário do job diz "alterações ao perfil", o que se lê como sendo do cliente.
- **Cenário de falha:** a equipa abre a ficha de um cliente que não usa a app há 2 anos e 11 meses e corrige uma nota interna. `updatedAt` passa a hoje; na corrida seguinte do job a conta conta como ativa, o aviso dos 30 dias não sai, e a promessa da política de privacidade ("contas inativas há 3 anos são apagadas", `src/legal/texts.ts:57`) deixa de se cumprir — sem sinal nenhum de que isso aconteceu.
- **Evidência:**
```
functions/src/jobs/retention.ts:98   const activity = latest(
functions/src/jobs/retention.ts:99     client.lastActiveAt,
functions/src/jobs/retention.ts:100    client.updatedAt,          <- escrito também pelo backoffice
...
../marble-backoffice/src/data/writes.ts:159   updatedAt: serverTimestamp(),   // updateClient (nome, telemóvel, notas)
```
- **Correção proposta:** tirar `client.updatedAt` da lista de `latest(...)` — as datas que restam (`lastActiveAt`, `createdAt`, `clientSince`, `consent.termsAcceptedAt`, `consent.marketingUpdatedAt`, serviços feitos) já cobrem toda a atividade real do cliente, incluindo o registo e a aceitação de termos. Uma linha, e o comentário passa a ser verdade.
- **Esforço:** S

### ARQ-08 — Aprovar um checkup no backoffice não é condicional: pode apagar um cancelamento do cliente
- **Vertente:** arquitetura
- **Severidade:** Médio
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/data/writes.ts:293-310`, `../marble-backoffice/src/data/writes.ts:318-337`, `firestore.rules:154-181`, `functions/src/handlers.ts:189-196`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `decideCheckupRequest` e `proposeCheckupDay` validam o estado a partir do objeto `vehicle` que veio do snapshot do React e depois gravam com `updateDoc` incondicional (caminhos `checkupRequest.status`, etc.). Do lado do cliente as regras garantem a transição (`ownerCheckupWrite` exige o estado *antes*); do lado da equipa não há nem regra nem transação — `isAdmin()` chega. Os dois decisores escrevem no mesmo mapa sem árbitro.
- **Cenário de falha:** o cliente cancela na app ao mesmo tempo que a equipa carrega em "Aprovar". A escrita do cliente passa (`cancelled`), a Function `onVehicleUpdated` põe `checkupStatus: 'declined'` e avisa a equipa; segundos depois chega o `updateDoc` do backoffice, que escreve `checkupRequest.status: 'approved'` por cima. Fica um carro com `checkupStatus: 'declined'` e `checkupRequest.status: 'approved'` — a app mostra "Agendado" (`checkupState` dá prioridade ao pedido), a equipa vê "Agendado", e ninguém sabe que o cliente disse que não queria. O cancelamento perde-se sem rasto.
- **Evidência:**
```
../marble-backoffice/src/data/writes.ts:296   if (req.status !== 'pending' && req.status !== 'proposed') {   // verificação em memória
../marble-backoffice/src/data/writes.ts:302   const patch: DocumentData = {
../marble-backoffice/src/data/writes.ts:303     'checkupRequest.status': 'approved',                          // escrita incondicional
../marble-backoffice/src/data/writes.ts:309   await updateDoc(doc(db, COLLECTIONS.vehicles, vehicle.id), patch);
```
- **Correção proposta:** envolver as duas funções numa `runTransaction` que relê o documento e repete a verificação de estado com os dados frescos, lançando o mesmo erro que já existe (o `Toast` do backoffice mostra-o tal e qual):
```ts
await runTransaction(db, async (tx) => {
  const ref = doc(db, COLLECTIONS.vehicles, vehicle.id);
  const fresh = (await tx.get(ref)).data() as Vehicle | undefined;
  const r = fresh?.checkupRequest;
  if (!r || (r.status !== 'pending' && r.status !== 'proposed'))
    throw new Error(`${vehicle.name}: o pedido mudou entretanto (${r ? CHECKUP_REQUEST_LABEL[r.status] : 'sem pedido'}) — recarrega a página.`);
  tx.update(ref, patch);
});
```
- **Esforço:** S

### ARQ-09 — A mesma lógica de calendário de checkup escrita quatro vezes, e já com uma diferença
- **Vertente:** arquitetura
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/data/checkups.ts:56-61`, `src/data/checkups.ts:68-113`, `../marble-backoffice/src/utils/checkups.ts:45-52`, `../marble-backoffice/src/utils/checkups.ts:103-129`, `functions/src/texts.ts:103-121`, `scripts/checkup-admin.mjs:45-53`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** "que dias estão abertos" e "seg, 7 set às 10:30" existem em quatro implementações independentes — app (com i18n), backoffice (PT fixo), Functions (PT+EN, UTC) e o script de administração (PT fixo). Três delas dizem em comentário que são "as mesmas" que outra. A primeira diferença já apareceu: o `parseDay` do backoffice rejeita datas que não existem ("2026-02-31"), o da app não.
- **Cenário de falha:** um `day` inválido em `vehicles.checkupRequest` (vindo de um script, de uma migração ou de uma correção à mão no console) é mostrado pelo backoffice como texto cru e pela app como "ter, 3 mar" — a equipa e o cliente ficam a ver dias diferentes para o mesmo checkup. Mais provável do que isso é o caso genérico: mudar o formato ou a regra de disponibilidade obriga a lembrar-se dos quatro sítios, e o único que é visível ao correr a app é um.
- **Evidência:**
```
../marble-backoffice/src/utils/checkups.ts:50   // Rejeita "2026-02-31" (o Date normaliza para março).
../marble-backoffice/src/utils/checkups.ts:51   return d.getDate() === Number(m[3]) ? d : null;

src/data/checkups.ts:59    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
src/data/checkups.ts:60    return Number.isNaN(d.getTime()) ? null : d;      <- aceita 2026-02-31
```
- **Correção proposta:** não reescrever nada. Alinhar o `parseDay` da app com o do backoffice (duas linhas) e, nos quatro ficheiros, substituir "espelha/é o mesmo que" por o caminho e a linha exatos do gémeo, para quem alterar um saber onde estão os outros. A alternativa real — um ficheiro partilhado — implica um pacote comum ou uma cópia gerada por script, e nenhuma se paga com quatro funções pequenas.
- **Esforço:** S

### ARQ-10 — Um departamento novo obriga a tocar em dez ficheiros de dois repositórios
- **Vertente:** arquitetura
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/firebase/models.ts:28`, `src/data/departments.ts:29-38`, `src/data/departmentContent.ts`, `src/data/requestForms.ts`, `src/i18n/pt.ts`, `src/i18n/en.ts`, `firestore.rules:92`, `functions/src/types.ts:164-173`, `../marble-backoffice/src/firebase/models.ts:28`, `../marble-backoffice/src/utils/departments.ts:18-27`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o identificador de departamento é um tipo de união repetido em três modelos, um enum literal nas regras, uma tabela de nomes nas Functions, duas listas de cartões (app e backoffice), o conteúdo da página, o formulário de orçamento e as duas tabelas de tradução. Nada liga estes sítios: só o `hasOnly` das regras falha, e falha em produção, com um `permission-denied` no envio do pedido.
- **Cenário de falha:** a Inozetek entra como sétimo cartão (já previsto no SPEC e no ROADMAP, Secção 10). Acrescenta-se o id nos três modelos e a lista da app; a app compila e mostra o cartão. Ao enviar um pedido desse departamento, `d.department in ['automotive',…,'xps']` recusa e o cliente vê um erro genérico; e os emails à equipa dizem `undefined` porque `DEPARTMENT_NAME` das Functions não tem a entrada.
- **Evidência:**
```
$ grep -rln "'xps'" src functions/src firestore.rules ../marble-backoffice/src
firestore.rules                              src/firebase/models.ts
functions/src/types.ts                       src/i18n/en.ts
src/data/departmentContent.ts                src/i18n/pt.ts
src/data/departments.ts                      ../marble-backoffice/src/firebase/models.ts
src/data/requestForms.ts                     ../marble-backoffice/src/utils/departments.ts
```
- **Correção proposta:** não centralizar (não vale a pena para seis valores estáveis). Pôr no comentário de `DepartmentId` em `src/firebase/models.ts:25-28` a lista exata dos dez sítios a tocar, por caminho e linha — o mesmo que o `DEVELOPMENT.md:778` já faz parcialmente ("`DepartmentId` em `models.ts` (app e backoffice, iguais) e a linha em …"), mas completo e no sítio onde se vai mexer. O `check:models` do ARQ-15 pode verificar que a união do modelo e o enum das regras têm os mesmos valores.
- **Esforço:** S

### ARQ-11 — Os alertas criados pelo backoffice levam a hora do PC da equipa, não a do servidor
- **Vertente:** arquitetura
- **Severidade:** Baixo
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/data/writes.ts:247`, `functions/src/notify.ts`, `src/data/notifications.ts:14-19`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `sendNotification` grava `createdAt: Timestamp.now()` — o relógio do browser — enquanto todas as outras escritas do mesmo ficheiro usam `serverTimestamp()` e as Functions usam `Timestamp.fromDate(now)` do servidor. `createdAt` é a chave de ordenação da lista de alertas da app e do painel.
- **Cenário de falha:** o PC da equipa com o relógio adiantado meia hora (ou num fuso errado numa viagem) faz o alerta manual aparecer no topo da caixa do cliente à frente de alertas automáticos posteriores; atrasado, enterra-o. Não há erro nem correção possível depois — o valor fica gravado.
- **Evidência:**
```
../marble-backoffice/src/data/writes.ts:247     createdAt: Timestamp.now(),
../marble-backoffice/src/data/writes.ts:159     updatedAt: serverTimestamp(),      // o resto do ficheiro
```
- **Correção proposta:** `createdAt: serverTimestamp()`. Confirmar que o ecrã Alertas do backoffice aguenta o `null` momentâneo que o SDK devolve na escrita otimista (as listas já usam `formatDate`, que trata de `undefined`) — é a única razão plausível para o `Timestamp.now()` original.
- **Esforço:** S

### ARQ-12 — `samples.description` é escrito pela equipa e não é lido em lado nenhum
- **Vertente:** arquitetura
- **Severidade:** Baixo
- **Superfície:** backoffice
- **Onde:** `src/firebase/models.ts:671`, `src/firebase/models.ts:682-685`, `../marble-backoffice/src/pages/SamplesPage.tsx:222`, `../marble-backoffice/src/pages/SamplesPage.tsx:337`, `src/screens/SimulatorScreen.tsx:363`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o formulário de amostras tem um campo "descrição" com limite próprio (`SAMPLE_LIMITS.descriptionMax`), que é gravado no documento e nunca aparece: a grelha do simulador na app monta o subtítulo com `service · finish · brand` e a lista do backoffice também não o mostra.
- **Cenário de falha:** a equipa escreve a descrição de cada amostra a pensar que o cliente a vê ao escolher ("Metallic cinzento com veios de cobre, mais escuro ao vivo") e o trabalho perde-se. É a categoria de defeito mais cara de descobrir: não falha nada, só não aparece.
- **Evidência:**
```
$ grep -rn "description" ../marble-backoffice/src/pages/SamplesPage.tsx | grep -v "EmptyState\|Section"
125:  description: string;                                        # estado do formulário
143:    description: sample?.description ?? '',
222:        description: form.description.trim().slice(0, SAMPLE_LIMITS.descriptionMax) || undefined,
337:          <Textarea rows={2} value={form.description} … />
# nenhuma leitura em src/screens/SimulatorScreen.tsx (o subtítulo é s.service/s.finish/s.brand)
```
- **Correção proposta:** decidir e ficar com uma das duas: mostrar a descrição no cartão da amostra do simulador (uma linha em `SimulatorScreen.tsx:363`) ou tirar o campo do formulário e do modelo. Se ficar, convém também mandá-la no prompt do modelo de imagem (`buildPrompt` já junta `name`, `service`, `finish`, `brand`).
- **Esforço:** S

### ARQ-13 — `works.featuredOrder` é gravado a `null` contra um tipo `number | undefined`
- **Vertente:** arquitetura
- **Severidade:** Baixo
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/data/writes.ts:94`, `src/firebase/models.ts:419`, `src/data/works.ts:34`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** ao tirar um trabalho dos destaques, `saveFeaturedOrder` grava `featuredOrder: null`, um valor que o tipo (`featuredOrder?: number`) não prevê. Passa no TypeScript porque o batch usa `DocumentData`.
- **Cenário de falha:** hoje é inofensivo — a query do carrossel filtra `featured == true`, e esses documentos têm sempre um número. Torna-se um defeito no dia em que algo ordene ou compare `featuredOrder` sem filtrar por `featured`: `null` ordena antes de qualquer número no Firestore, e em TypeScript `w.featuredOrder ?? 0` dá 0, pondo o trabalho retirado em primeiro.
- **Evidência:**
```
../marble-backoffice/src/data/writes.ts:94   removedIds.forEach((id) => batch.update(…, { featured: false, featuredOrder: null, … }));
src/firebase/models.ts:419                   featuredOrder?: number;
```
- **Correção proposta:** `featuredOrder: deleteField()` (o ficheiro já importa `deleteField` e usa-o em `saveDepartmentCover` e `updateSample`), ou declarar `featuredOrder?: number | null` nos dois modelos. A primeira é a que respeita o modelo.
- **Esforço:** S

### ARQ-14 — Oito scripts repetem a leitura da chave e a guarda do projeto, com três guardas diferentes
- **Vertente:** arquitetura
- **Severidade:** Baixo
- **Superfície:** scripts
- **Onde:** `scripts/seed-firestore.mjs:38`, `scripts/checkup-admin.mjs:38`, `scripts/dev-token.mjs:25`, `scripts/migrate-work-tags.mjs:35`, `scripts/demo-account.mjs`, `scripts/auth-email-config.mjs`, `scripts/check-firestore-auth.mjs`, `../marble-backoffice/scripts/dev-token.mjs`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** oito scripts carregam uma chave de service account e decidem sozinhos se o projeto é aceitável; nenhum importa nada de outro (`grep "^import .* from './" scripts/*.mjs` não dá nada). As guardas não são a mesma: três usam `!project_id.endsWith('-dev')`, o seed usa `project_id.includes('prod')`, e os que se destinam ao prod (`demo-account`, `auth-email-config`) não têm nenhuma, por desenho.
- **Cenário de falha:** `seed-firestore.mjs` aceita qualquer chave cujo `project_id` não contenha a palavra "prod" — inclui um projeto futuro chamado, por exemplo, `marble-studios-staging` ou `marble-studios`. O script escreve 400+ documentos de exemplo com IDs fixos; num projeto errado isso sobrescreve dados reais sem pergunta nenhuma.
- **Evidência:**
```
scripts/checkup-admin.mjs:38      if (!String(key.project_id).endsWith('-dev')) {
scripts/dev-token.mjs:25          if (!String(serviceAccount.project_id).endsWith('-dev')) {
scripts/migrate-work-tags.mjs:35  if (!String(key.project_id).endsWith('-dev')) {
scripts/seed-firestore.mjs:38     if (String(serviceAccount.project_id).includes('prod')) {   <- lista negra, não lista branca
```
- **Correção proposta:** ver ARQ-16. Mínimo imediato, sem script novo: alinhar o seed com os outros (`if (!String(serviceAccount.project_id).endsWith('-dev'))`) — lista branca em vez de lista negra, uma linha.
- **Esforço:** S

### ARQ-15 — `npm run check:models`: falhar quando os modelos e os limites divergem
- **Vertente:** arquitetura
- **Severidade:** Sugestão
- **Superfície:** scripts
- **Onde:** `scripts/check-setup.mjs`, `package.json:44-61`, `src/firebase/models.ts`, `../marble-backoffice/src/firebase/models.ts`, `functions/src/types.ts`, `firestore.rules`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** três dos achados acima (ARQ-03, ARQ-04, ARQ-10) são a mesma coisa vista de ângulos diferentes: há informação duplicada entre dois repositórios e nada que verifique as cópias. Para um projeto de uma pessoa, um script de verificação vale mais do que qualquer reorganização — não obriga a monorepo, não muda o modelo de deploy, e corre em menos de um segundo.
- **Cenário de falha:** (preventivo) cada uma das divergências dos achados ARQ-03/04/10 passaria a ser uma mensagem na consola em vez de um defeito descoberto em produção.
- **Evidência:**
```
$ grep -n "typecheck\|check:setup" package.json
"check:setup": "node scripts/check-setup.mjs",
"typecheck": "tsc --noEmit"          # nenhum dos dois vê o outro repositório
```
- **Correção proposta:** `scripts/check-models.mjs`, sem dependências, chamado por `npm run check:setup` (onde o backoffice já é procurado ao lado) e antes de cada commit que toque nos modelos. Quatro verificações, todas por leitura de texto:
  1. `src/firebase/models.ts` igual a `../marble-backoffice/src/firebase/models.ts` depois de normalizar `\r\n` (hoje passa);
  2. os valores de `SIMULATION_LIMITS`/`REQUEST_LIMITS`/`CHECKUP_LIMITS` batem com as constantes das Functions (`SIMULATION_PER_DAY`, `SIMULATION_RETENTION_DAYS`, `RATE_LIMIT_PER_DAY`) e com `RETENTION` em `src/legal/texts.ts`, por expressão regular;
  3. os números literais em `firestore.rules` (`<= 12`, `<= 8`, `<= 5`, `<= 2000`, `<= 300`) batem com os mesmos limites;
  4. os valores da união `DepartmentId` batem com o enum `d.department in [...]` das regras e com as chaves de `DEPARTMENT_NAME` nas Functions.
  Sai com código 1 e diz que par não bate. Quando o backoffice não está ao lado, salta a verificação 1 com um aviso (é o que o `check:setup` já faz).
- **Esforço:** M

### ARQ-16 — Um `scripts/lib/admin.mjs` partilhado para a chave e a escolha de projeto
- **Vertente:** arquitetura
- **Severidade:** Sugestão
- **Superfície:** scripts
- **Onde:** `scripts/seed-firestore.mjs`, `scripts/checkup-admin.mjs`, `scripts/dev-token.mjs`, `scripts/migrate-work-tags.mjs`, `scripts/demo-account.mjs`, `scripts/check-firestore-auth.mjs`, `scripts/auth-email-config.mjs`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** sete scripts repetem o mesmo preâmbulo (ler o argumento, `readFileSync` + `JSON.parse` da chave, verificar o projeto, `initializeApp({ credential: cert(...) })`, mensagem de uso). É a duplicação mais fácil de tirar do projeto e a que mais reduz o risco de uma guarda ficar diferente das outras (ARQ-14).
- **Cenário de falha:** (preventivo) o próximo script escrito à pressa copia o preâmbulo do que estava aberto — se calhar o do seed, com a lista negra.
- **Evidência:**
```
$ grep -n "^import .* from './" scripts/*.mjs
(nada — nenhum script partilha código com outro)
$ grep -c "initializeApp" scripts/*.mjs | grep -v ":0"
7 ficheiros
```
- **Correção proposta:** `scripts/lib/admin.mjs` com uma função `openProject(keyPath, { allow: 'dev' | 'any' })` que devolve `{ app, db, auth, projectId }` e escreve a mensagem de erro comum. Cada script passa a duas linhas de preâmbulo. Não mexer nos scripts que já funcionam e não vão ser tocados (`build-icons`, `build-legal-html`, `build-progress`, `build-audit`, `launch-main`, `check-setup`, `check-firestore` — nenhum usa chave). Faz sentido fazê-lo da próxima vez que um destes scripts for alterado, não como trabalho isolado.
- **Esforço:** S

## Lista de verificação

1. **Que campo pode ser escrito por dois lados sem arbitragem?**
   `clients.*` (todos — ARQ-02), `clients.name`/`phone` (app e backoffice, último a gravar ganha), `clients.updatedAt` com semântica de atividade (ARQ-07), `vehicles.checkupRequest` (cliente e equipa, ARQ-08), `vehicles.checkupStatus` (equipa, Functions e script), `vehicles.lastServiceAt` (equipa e Functions — mas a Function só avança a data, o que é uma arbitragem correta), `works.followUp` (equipa escreve o mapa, Functions escrevem os `*At` — o backoffice funde a partir do snapshot em tempo real, correto).
2. **Em que é que os três modelos já diferem?**
   Os dois `models.ts` não diferem (`diff` a zero). `functions/src/types.ts` é um subconjunto declarado, mas com uma lacuna real: `ClientConsent` sem `simulatorVersion`/`simulatorAcceptedAt` (ARQ-04, ARQ-05). As listas paralelas divergiram: `utils/departments.ts` do backoffice perdeu o `category` do `xps`. As constantes de domínio estão duplicadas com valores iguais mas sem guarda (ARQ-03).
3. **Que mudança simples toca em quantos ficheiros?**
   Departamento novo: 10 ficheiros, 2 repositórios (ARQ-10). Limite de fotos por pedido: 3 ficheiros (`src/firebase/models.ts`, a cópia do backoffice, `firestore.rules:96`) + o preset do Cloudinary. Limite de simulações por dia: 3 ficheiros e 2 projetos de deploy (modelo ×2, `functions/src/simulations.ts:23`). Serviço/sistema novo nas tags: 2 ficheiros (as duas cópias de `WORK_SERVICES`) + tradução em `src/i18n/pt.ts` e `en.ts` = 4. Novo texto legal material: `src/legal/texts.ts` + `npm run build:legal` + publicar o Hosting (bem encadeado, ver "O que está bem").
4. **Que lógica de negócio corre só no browser da equipa?**
   Tudo o que `data/writes.ts` faz: a regra de RGPD dos alertas (`sendNotification:232-236` — só na UI e no writes, as regras não a veem), a fusão de fichas (`mergeClients`, um batch de N documentos), o cálculo de `followUp.active` (`buildFollowUp` + `followUpFinished`, cópia da que as Functions usam), as transições de checkup (ARQ-08) e a normalização da disponibilidade. É uma consequência assumida do backoffice sem servidor (decisão documentada); o que não estava documentado é que a ausência de arbitragem transacional nas transições de checkup deixa perder um cancelamento.
5. **O que está bem desenhado** — ver a secção seguinte.

## O que está bem

- **As camadas da app são respeitadas.** Nenhum ecrã nem componente fala com
  o Firestore: `grep -rn "from 'firebase/firestore'" src` fora de `src/data`
  e `src/firebase` só encontra `AuthContext.tsx` (o doc do próprio cliente,
  que é o seu trabalho), `push/push.native.ts` (tokens) e dois imports de
  tipo. Não é preciso voltar a verificar isto numa corrida seguinte sem
  ecrãs novos.
- **Sem ciclos de importação** entre `src/data`, `src/auth`, `src/navigation`
  e `src/i18n`: `types.ts → pt.ts` e `index.ts → pt/en/locale/types` são uma
  árvore; `push/onboarding.ts` importa `AuthContext` e `navigationRef`, e
  nenhum dos dois volta a importar `onboarding`.
- **Os dois `models.ts` estão idênticos** (`diff --strip-trailing-cr`, código
  0) — a sincronização à mão que o `CLAUDE.md` do backoffice pede está a ser
  feita. Falta só a guarda (ARQ-04/ARQ-15).
- **As páginas legais estão em dia:** `src/legal/texts.ts` e `docs/legal/*.html`
  foram commitados no mesmo commit (`3111a4c`), e os três HTML dizem
  "Versão de 2026-09-09", igual a `LEGAL_VERSION`. O encadeamento
  texto → `npm run build:legal` → Hosting é a única fonte de verdade única
  do projeto e funciona.
- **`firestore.rules` valida a criação campo a campo** onde importa
  (`validNewRequest:80-103`, `validNewSimulation:236-247`,
  `ownerCheckupWrite:154-181`), com `hasOnly` + `hasAll` e
  `createdAt == request.time`. É um desenho melhor do que o habitual num
  projeto sem servidor, e o `check-firestore-auth.mjs` testa-o a sério.
- **`system/requestGuard` e `system/simulationGuard`** não têm `match` nas
  regras: ficam fechados por omissão, só alcançáveis pelo Admin SDK. Correto
  e deliberado.
- **Os triggers separam wiring de lógica:** `functions/src/index.ts` só liga
  eventos a `handlers.ts`/`jobs/`, o que deixa `scripts/runJobs.ts` correr a
  mesma lógica contra o dev sem deploy. É o que torna a Secção 16 testável
  sem Vertex ativo.
- **`followUpFinished` está literalmente igual** nas duas cópias
  (`functions/src/jobs/followUps.ts:36-41` e
  `../marble-backoffice/src/utils/followUp.ts:57-62`), e `buildFollowUp`
  funde com o snapshot em tempo real — o backoffice não apaga os `*At` das
  Functions, ao contrário do que seria fácil acontecer.
- **`consent.ts` centraliza a regra de RGPD das Functions** num só sítio
  (`canReceive`), usado por `followUps`, `handlers` e `notify` — em vez de
  repetir o `if` em cada job.
- **Os índices compostos declarados cobrem as queries existentes**
  (`firestore.indexes.json`): as quatro queries `clientId + createdAt desc`
  da app e as duas de `works` estão lá; as queries só de igualdade das
  Functions (`vehicleId` + `followUp.active`) não precisam de índice
  composto.
- **A decisão do App Check está escrita e fundamentada** (`DEVELOPMENT.md:1358-1372`,
  `ROADMAP.md:960-974`): adiado para a Secção 11c, com `REQUEST_DAILY_CAP` e
  `SIMULATION_DAILY_CAP` como travão entretanto. Não é achado.
- **`scripts/launch-main.mjs` descobre o checkout principal pelo git** em vez
  de ter caminhos absolutos — resolve de raiz o problema dos dois PCs para
  os servidores de desenvolvimento.

## Não verificado

- **Variáveis de ambiente no painel do EAS.** O ARQ-01 assume que
  `.env.production` é a única fonte da configuração das builds de produção,
  como o `DEVELOPMENT.md` descreve. Se existir uma variável
  `EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS` definida no ambiente
  `production` do EAS, o efeito não acontece — mas continua a ser uma
  configuração não documentada em lado nenhum do repositório. Não tenho
  acesso ao painel do EAS.
- **Grafo de importações por ferramenta.** `npx madge` não podia ser
  instalado; a procura de ciclos foi feita à mão sobre `src/data`,
  `src/auth`, `src/navigation`, `src/i18n` e `src/push`, que são os módulos
  com estado global. Não foi feita para `src/components` e `src/screens`.
- **Corridas reais.** Nada foi executado contra o Firestore (nem dev), nem
  `npm run typecheck`, nem `check:firestore:auth` — o mandato era só leitura.
  Os cenários de ARQ-08 (corrida entre equipa e cliente) e ARQ-06 (leitura
  de `team_alert` pelo cliente, e se a query da app continua a passar com a
  regra proposta) merecem confirmação com `check:firestore:auth` antes de
  qualquer correção ser dada como feita.
- **Conteúdo dos ecrãs e das páginas do backoffice.** Os 40 ficheiros do
  backoffice e os 15 ecrãs da app foram lidos por grep dirigido às
  perguntas desta vertente (quem escreve o quê, que constantes se repetem),
  não de ponta a ponta. Defeitos de qualidade dentro de um componente ficam
  para a vertente de qualidade.
- **`docs/legal/*.html` byte a byte.** Confirmou-se que são do mesmo commit
  que `src/legal/texts.ts` e que a versão bate; não se correu
  `npm run build:legal` para comparar a saída (escreveria ficheiros).
