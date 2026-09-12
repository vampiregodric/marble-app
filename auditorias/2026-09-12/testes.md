# Auditoria 2026-09-12 — testes

## Âmbito

Corrida completa, só leitura, sobre `marble-app` (commit `691938a`, ramo
`master`) e `marble-backoffice` (commit `1c532f2`).

Lido na íntegra (48 ficheiros):

| Superfície | Ficheiros |
|---|---|
| regras | `firestore.rules` (263 linhas), `firestore.indexes.json`, `firebase.json`, `.firebaserc` |
| functions | os 20 `.ts` de `functions/src/**` (2654 linhas) |
| app | `src/utils/{dates,layout}.ts`, `src/data/{requestForms,checkups}.ts`, `src/auth/{validation,errors}.ts`, `src/i18n/{pt,en,index,locale,types}.ts`, `src/media/images.ts`, `src/firebase/{models,config,app}.ts` (limites e grafo de importações) |
| backoffice | `src/utils/{checkups,dates,departments,followUp,format}.ts`, `src/data/duplicates.ts` |
| scripts | os 14 `scripts/*.mjs` (cabeçalho, guardas de projeto e argumentos); `check-firestore.mjs` e `check-firestore-auth.mjs` na íntegra |
| tooling | `package.json` dos três projetos, `tsconfig.json` da raiz e de `functions`, `.gitignore`, `.claude/settings.json` |
| contexto | `CLAUDE.md`, `AGENTS.md`, `DEVELOPMENT.md` (secções "Testar sem deploy", "Idiomas", "Segundo PC", "Deploy, segredos e logs"), `ROADMAP.md` (linhas `**Estado:**` das 20 secções) |

Ficou de fora: componentes React e ecrãs da app e do backoffice (a
metodologia desta vertente exclui testes de UI/E2E), `src/legal/texts.ts`,
`src/data/departmentContent.ts` e `docs/` (conteúdo, não lógica).

Comandos corridos (todos só de leitura):

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` (raiz, compila também `functions/src`) | passa, 0 erros |
| `npx tsc --noEmit` (`../marble-backoffice`) | passa, 0 erros |
| `java -version` | `command not found` — **não há Java neste PC (casa)** |
| `node --version` | v24.19.0 (o `engines` das Functions pede Node 22) |
| `git log --grep` (`corrig`, `fix`, `bug`, `regress`, `voltou`, `falha`, `erro`, `rebenta`, `apagava`) | 129 commits no total; 4 regressões identificáveis (ver Lista de verificação, pergunta 3) |
| `ls .github` nos dois repositórios | não existe — **não há CI em lado nenhum** |
| `grep` por `test`/`vitest`/`jest` nos três `package.json` | nenhum runner, nenhum script `test`, nenhuma pasta de testes |

## Contagem

| Severidade | Achados |
|---|---|
| Crítico | 0 |
| Alto | 11 |
| Médio | 12 |
| Baixo | 2 |
| Sugestão | 4 |

Nota sobre a contagem: a rubrica desta vertente manda um achado **por
ficheiro** com efeito em dados ou dinheiro e sem qualquer teste — daí 11
Altos. Não são onze desastres independentes: são onze ficheiros no mesmo
estado (zero prova). O que deve mandar o trabalho é a ordem do **Backlog
priorizado**, não o número de Altos. Não há Críticos: esta vertente produz
"ausência de prova", e ausência de prova não é, por si, dado de um cliente
exposto — isso é matéria da vertente de segurança.

## Lista de verificação

**1. Que ramos das regras não têm forma de ser verificados hoje sem deploy?**
**Todos.** `firestore.rules` só existe publicado: não há emulador
configurado (`firebase.json` não tem bloco `emulators`) nem
`@firebase/rules-unit-testing`. Os 37 ramos `allow`:

- `works`: read (published), read (isAdmin), write (isAdmin) — 3
- `events`: read (público), write (isAdmin) — 2
- `settings`: read (público), write (isAdmin) — 2
- `clients`: read próprio, read isAdmin, update próprio, update isAdmin, create próprio, create isAdmin, delete `false` — 7
- `vehicles`: read dono, read isAdmin, update isAdmin, `ownerCheckupWrite` ramo 1 (pedir/alterar), ramo 2 (confirmar proposta), ramo 3 (cancelar), create isAdmin, delete isAdmin — 8
- `notifications`: read dono, read isAdmin, update isAdmin, update dono (só `read`), create isAdmin, delete isAdmin — 6
- `requests`: read dono/isAdmin, create isAdmin, create cliente (`validNewRequest`), update isAdmin, delete isAdmin — 5
- `samples`: read published, read isAdmin, write isAdmin — 3
- `simulations`: read dono/isAdmin, create (`validNewSimulation`), update isAdmin, update dono (só `requestId`), delete dono/isAdmin — 5

Mais 12 funções de validação (`signedIn`, `isAdmin`, `ownsResource`,
`isStr`, `validRequestSimulation`, `validNewRequest`, `checkupRequestOf`,
`validNewCheckupRequest`, `ownerCheckupWrite`, `validImage`,
`validSimulationSource`, `validNewSimulation`), com cerca de 60 condições
individuais — só `validNewRequest` tem 20 (`firestore.rules:80`).

Os dois scripts `check:firestore*` verificam **as regras já publicadas no
dev**, não as do ficheiro: correm depois do deploy, obrigam à chave de
service account e cobrem só a fatia "anónimo" e "um cliente". **Toda a
metade `isAdmin()` — tudo o que o backoffice faz — tem zero cobertura**, e
o cruzado cliente-A-lê-cliente-B nunca é tentado em `clients`, `vehicles`,
`requests` nem `simulations`.

**2. Que funções das Functions correm sem emulador?**

| Corre com `vitest` puro (sem nada) | Precisa de `fetch` global trocado | Precisa do emulador do Firestore |
|---|---|---|
| `consent.canReceive`, `consent.hasAppAccount`, `time.addDays/daysBetween/lisbonDay`, `expo.isExpoPushToken/isDeadTokenError`, `email.escapeHtml/textToHtml`, `cloudinary.publicIdFromUrl/avatarTag`, `simulations.modelInputUrl/buildPrompt/resultImage/simulationTag`, `requests.requestTag`, todo o `texts.ts`, `notify.notificationDoc`, `handlers.guessPreviousRequest`, `followUps.followUpFinished`, `vertex.vertexEndpoint`, `push.pushData` | `expo.sendPush/getReceipts`, `email.sendEmail`, `cloudinary.listByTag/deleteByPublicIds/deleteFilesByTag/deleteAvatarFiles`, `simulations.uploadResult` (via `fetchImage`), `vertex.generateEditedImage` (também precisa de `vi.mock('google-auth-library')`) | tudo o que recebe `db`: `notify.createNotification`, `push.pushNotification`, `handlers.handleWorkWritten/handleClientUpdated/handleVehicleUpdated`, `requests.handleRequestWritten/handleRequestCreated/anonymizeRequest/anonymizeClientRequests/runRequestRetention`, `simulations.handleSimulation*/deleteClientSimulations/deleteRequestSimulations/runSimulationRetention`, `jobs/*` |

Resposta à pergunta da metodologia sobre os externos: **o `fetch` é
global, não injetável**, nos quatro (`expo.ts:53` e `:75`, `email.ts:35`,
`cloudinary.ts:50` e `:65`, `simulations.ts:106` e `:151`,
`vertex.ts:80`). Com `vitest` isto resolve-se com `vi.stubGlobal('fetch',
…)` sem tocar no código — não é preciso refatorar. O `vertex.ts` é a
exceção: guarda um `GoogleAuth` num cache de módulo (`vertex.ts:34`), por
isso o teste tem de fazer `vi.mock('google-auth-library')`.

A boa notícia: **`db` e `log` já entram por parâmetro em todos os
handlers** e as dependências externas (`auth`, `cloudinary`, `email`,
`vertex`, `dailyCap`) são objetos `deps` injetáveis
(`jobs/index.ts:16`, `requests.ts:58`, `simulations.ts:38`,
`retention.ts:27`). Apontar o `firebase-admin` ao emulador
(`FIRESTORE_EMULATOR_HOST`) chega para testar tudo — **não é preciso
mudar uma linha do código de produção**.

**3. Que regressões já aconteceram e que teste as teria apanhado?**

| Regressão | Commit | Teria sido apanhada por |
|---|---|---|
| `AuthContext` recriava `clients/{uid}` do zero quando o snapshot vinha da cache, apagando consentimento, tokens de push e `onboardingSeenAt` (a conta do Fábio perdeu dados a 2026-09-09) | `ecd8445` | **Não, como o código está.** A decisão vive dentro do `onSnapshot` do `AuthContext`. Só com a decisão extraída para uma função pura (`shouldRecreateClientDoc({ exists, fromCache })`) — que é barato e é o que a onda 3 propõe |
| `service` é palavra reservada na linguagem das regras; o deploy falhava (`firestore.rules:228`, hoje com o contorno `s['service']`) | Secção 16 | **Sim, em segundos.** Qualquer harness de regras carrega o ficheiro antes de correr o primeiro caso e rebenta com o erro de sintaxe localmente, em vez de a meio de um deploy |
| `predeploy` das Functions caía no TypeScript 6 da raiz (TS5107) porque `functions/node_modules` não existia no checkout principal | `ROADMAP.md:1441` | **Sim.** Um workflow de CI que corre `npm ci` em `functions/` e `npm run typecheck` apanha-o antes de o Fábio tentar o deploy |
| O import de `expo-notifications` rebentava no arranque no Expo Go (SDK 53+) e a app não abria | `92f8998` | **Não.** É comportamento do runtime nativo; só se vê no telemóvel |

Ou seja: das quatro, duas seriam apanhadas pela infraestrutura proposta
(uma pelas regras, uma pelo CI), uma exige uma extração de 5 linhas, e uma
fica sempre fora do alcance de testes unitários.

**4. O que é preciso instalar num PC novo para correr os testes?**

Além do que o `npm run check:setup` já verifica (Node, `.env`, chaves):

1. **Java (JDK 17 ou 21)** — o emulador do Firestore é um `.jar`. Hoje
   **não existe neste PC** (`java -version` → `command not found`) e,
   por isso, quase de certeza também não no do escritório.
   `winget install --id EclipseAdoptium.Temurin.21.JDK -e`, reabrir o
   PowerShell, confirmar com `java -version`.
2. `npm ci` na raiz, em `functions/` e no backoffice (já é a rotina
   documentada em `DEVELOPMENT.md`, "Worktree novo").
3. Nada mais: `vitest`, `@firebase/rules-unit-testing` e `firebase-tools`
   entram como `devDependencies` e vêm com o `npm ci`.

Isto tem de ficar escrito no `DEVELOPMENT.md`, capítulo "Segundo PC", e no
`scripts/check-setup.mjs` — pela regra dos dois PCs do `CLAUDE.md`, o que
não está no git não existe para a outra máquina.

**5. Quanto custa a primeira onda e o que prova?**

Onda 1 (regras): **6 a 8 horas** de trabalho, mais ~1 h de instalação nos
dois PCs. No fim prova, sem deploy e em ~20 segundos por corrida, que
nenhum cliente lê ou escreve nos dados de outro, que só o claim `admin`
abre o portfólio/eventos/definições à escrita, e que as três escritas de
checkup e a criação de pedidos e simulações aceitam exatamente o que a app
envia e recusam tudo o resto. Passa a ser possível mexer nas regras sem
deploy às cegas.

## Achados

### TES-01 — Regras do Firestore: 37 ramos `allow` e 12 funções sem um único teste local
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** regras
- **Onde:** `firestore.rules:47`, `firestore.rules:80`, `firestore.rules:154`, `firestore.rules:236`, `firebase.json:1`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** as regras são o único guarda dos dados (o backoffice
  usa o SDK de cliente, não há servidor) e não existe forma de as verificar
  sem fazer deploy ao projeto de dev. Não há bloco `emulators` no
  `firebase.json` nem `@firebase/rules-unit-testing` em lado nenhum.
- **Cenário de falha:** alguém acrescenta uma coleção e escreve
  `allow read: if signedIn()` em vez de `if ownsResource()`. O deploy passa
  (é sintaxe válida), `npm run check:firestore` não a conhece, e qualquer
  cliente com conta passa a ler os dados de todos os outros — sem nada
  falhar em lado nenhum.
- **Evidência:**
  ```
  $ ls .github → No such file or directory
  $ grep -n "emulators" firebase.json → (nada)
  $ grep -rn "rules-unit-testing" package.json functions/package.json → (nada)
  firestore.rules:203  allow create: if isAdmin() || (signedIn() && validNewRequest(request.resource.data));
  ```
  Os únicos verificadores (`scripts/check-firestore.mjs`,
  `scripts/check-firestore-auth.mjs`) testam as regras **já publicadas**,
  exigem a chave de service account e cobrem apenas "anónimo" e "um
  cliente" — a metade `isAdmin()` nunca é exercida.
- **Correção proposta:** `firebase.json` ganha
  `"emulators": { "firestore": { "port": 8080 }, "ui": { "enabled": false }, "singleProjectMode": true }`;
  `npm i -D @firebase/rules-unit-testing vitest firebase-tools`; pasta
  `tests/rules/` com um ficheiro por coleção e três contextos fixos
  (`anon`, `dono`, `outro`, `equipa`), corrido por
  `firebase-tools emulators:exec --only firestore --project demo-marble "vitest run --dir tests/rules"`.
  Esboço do arranjo comum:
  ```ts
  const env = await initializeTestEnvironment({
    projectId: 'demo-marble',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  const dono = env.authenticatedContext('uid-a').firestore();
  const outro = env.authenticatedContext('uid-b').firestore();
  const equipa = env.authenticatedContext('uid-t', { admin: true }).firestore();
  await assertFails(getDoc(doc(outro, 'clients/uid-a')));
  ```
- **Esforço:** M

### TES-02 — Retenção apaga contas do Auth e anonimiza clientes sem um teste que o prove
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/jobs/retention.ts:56`, `functions/src/jobs/retention.ts:88`, `functions/src/jobs/retention.ts:124`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o job diário apaga utilizadores do Firebase Auth e
  esvazia `clients/{uid}` de forma irreversível, com base num cálculo de
  "atividade" que junta sete fontes de data e duas janelas (aviso aos 3
  anos − 30 dias, eliminação aos 3 anos). Nenhuma dessas condições tem
  teste; só se sabe se está certo quando uma conta real desaparece.
- **Cenário de falha:** uma conta criada há 3 anos e um dia, sem
  `lastActiveAt` (contas anteriores à Secção 6 não o têm) e sem trabalhos
  associados, entra no ramo de eliminação na primeira corrida em que
  `retentionWarnedAt` já esteja lá. Se o `latest(...)` deixar de contar uma
  das fontes — por exemplo, se `clientSince` passar a chamar-se outra coisa
  no modelo — clientes ativos são apagados em silêncio às 10:00.
- **Evidência:**
  ```ts
  // retention.ts:124
  if (activity <= deleteCutoff && addDays(client.retentionWarnedAt.toDate(), WARNING_DAYS) <= now) {
    await anonymizeClient(db, deps, client, now, log);   // update + auth.deleteUser
  ```
  `deps.auth` é injetável (`retention.ts:27`), o que torna o teste barato —
  e mesmo assim não existe.
- **Correção proposta:** `tests/db/retention.test.ts` com o emulador e um
  `auth` falso (`{ deleteUser: vi.fn() }`), a fixar a tabela: 2 anos →
  nada; 3 anos − 20 dias → aviso e `retentionWarnedAt`; aviso + 31 dias →
  anonimiza e chama `deleteUser`; abrir a app no meio → `unwarned`;
  `hasAppAccount === false` → nem entra no `checked`. Mais um teste puro de
  `latest()` com cada fonte isolada.
- **Esforço:** M

### TES-03 — Anti-spam, tecto diário e anonimização dos pedidos sem teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/requests.ts:108`, `functions/src/requests.ts:127`, `functions/src/requests.ts:182`, `functions/src/requests.ts:199`, `functions/src/requests.ts:231`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** enquanto o App Check não estiver ligado (decisão
  adiada, `DEVELOPMENT.md`, "Lançamento nas lojas"), o `REQUEST_DAILY_CAP`
  é **a única trava do lado do servidor** contra uma inundação de pedidos
  — e não tem teste. A anonimização a 365 dias, que é uma promessa da
  política de privacidade, também não.
- **Cenário de falha:** a contagem do tecto usa `>` (`total > deps.dailyCap`)
  sobre uma agregação `count()` que **inclui o próprio pedido**; o limite
  por cliente usa `>=` sobre uma lista que **exclui** o próprio. Uma
  troca de sinal num dos dois (ou um `limit(RATE_LIMIT_PER_DAY + 2)`
  pequeno demais quando vários pedidos partilham o mesmo milissegundo)
  deixa passar o spam ou marca pedidos reais como spam — em ambos os casos
  sem alerta nenhum, porque o alerta à equipa é o que fica suprimido.
- **Evidência:**
  ```ts
  // requests.ts:112
  const recent = await db.collection('requests').where('clientId','==',req.clientId)
    .orderBy('createdAt','desc').limit(RATE_LIMIT_PER_DAY + 2).get();
  const others = recent.docs.filter((d) => d.id !== req.id && (…createdAt…) >= since).length;
  if (others >= RATE_LIMIT_PER_DAY) { … flagged: 'rate_limit' … return; }
  // requests.ts:128
  const total = (await db.collection('requests').where('createdAt','>=',…).count().get()).data().count;
  if (total > deps.dailyCap) { … flagged: 'daily_cap' … }
  ```
- **Correção proposta:** `tests/db/requests.test.ts` (emulador): 2 pedidos
  em 24 h → passa; 3 → `rate_limit` sem alerta nem email; tecto a 5 com 6
  pedidos → `daily_cap` e **um só** `team_alert` (o segundo incrementa
  `flaggedSinceAlert` em `system/requestGuard`); pedido fechado há 400 dias
  → anonimizado com `department` e `services` intactos; pedido fechado há
  300 dias → intocado; `processedAt` já presente → sai sem escrever nada.
- **Esforço:** M

### TES-04 — Os tectos que limitam o custo do Vertex AI não têm teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/simulations.ts:189`, `functions/src/simulations.ts:206`, `functions/src/simulations.ts:246`, `functions/src/simulations.ts:279`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** cada simulação custa cerca de 0,06 € ao modelo
  (`../marble-backoffice/src/utils/format.ts:159`). Os dois tectos —
  5 por cliente em 24 h e `SIMULATION_DAILY_CAP` (60) no projeto inteiro —
  são o que impede a fatura de crescer sem limite, e nenhum deles tem
  teste. A retenção a 90 dias, que apaga simulações e os ficheiros no
  Cloudinary, também não.
- **Cenário de falha:** o filtro por cliente exclui as simulações
  `limited`/`capped` da contagem, de propósito. Se essa exclusão passar a
  contar (ou o `limit(SIMULATION_PER_DAY + 6)` ficar curto), um cliente
  fica preso no limite para sempre; se falhar ao contrário, um cliente
  pode pedir simulações sem fim e o tecto global só trava aos 60 — 3,60 €
  por dia, a repetir sem ninguém reparar até à fatura.
- **Evidência:**
  ```ts
  // simulations.ts:193
  const others = recent.docs.filter((d) => {
    if (d.id === sim.id) return false;
    const data = d.data();
    if (data.status === 'limited' || data.status === 'capped') return false;
    return ((data.createdAt as Timestamp | undefined)?.toMillis?.() ?? 0) >= since;
  }).length;
  ```
- **Correção proposta:** `tests/db/simulations.test.ts` (emulador, com
  `deps.vertex = null` para não chamar o modelo): 4 anteriores → processa;
  5 anteriores → `limited` sem tocar no Vertex; 3 anteriores + 2
  `limited` → processa (as limitadas não contam); tecto global a 2 com 3
  no dia → `capped` e um só `team_alert`. Mais testes puros de
  `modelInputUrl` (URL do Cloudinary com e sem transformações, URL de
  fora), `resultImage` (com e sem `version`) e `buildPrompt` (`floor` vs
  `car`, `source.type` `sample` vs `work`).
- **Esforço:** M

### TES-05 — O portão do consentimento de marketing (RGPD) não tem teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/consent.ts:13`, `functions/src/consent.ts:17`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `canReceive()` é a função que decide se uma
  comunicação de marketing pode sair. Tem 31 linhas, é **pura**, não
  depende de nada — e não tem um único teste. É chamada de quatro sítios
  (`handlers.ts:30`, `followUps.ts:118`, `events.ts:37`, `push.ts:40`) e
  um engano aqui é envio de marketing sem base legal a toda a base de
  clientes de uma vez.
- **Cenário de falha:** `client.consent?.marketing !== true` passa a
  `!client.consent?.marketing === false` numa refatoração; contas antigas
  sem o objeto `consent` (as anteriores à Secção 3) passam a receber
  ofertas e `new_work`. Ninguém dá por isso até alguém se queixar — o
  `push` diz `sent` em todos os casos.
- **Evidência:**
  ```ts
  // consent.ts:22
  if (!client || !hasAppAccount(client)) return { ok: false, reason: 'no_account' };
  if (MARKETING_NOTIFICATION_TYPES.has(type)) {
    if (client.consent?.marketing !== true) return { ok: false, reason: 'no_consent' };
    if (type === 'new_work' && category) {
      const pref = CATEGORY_PREF[category];
      if (pref && client.notificationPrefs?.[pref] !== true) return { ok: false, reason: 'category_off' };
  ```
- **Correção proposta:** `tests/consent.test.ts` (vitest puro, sem
  infraestrutura nenhuma, ~30 minutos): a matriz completa dos 6 tipos ×
  {sem conta, `createdByTeam`, `deletedAt`, `mergedInto`, sem `consent`,
  `marketing:false`, `marketing:true`, categoria off} — 48 casos numa
  tabela `it.each`. É o teste com melhor relação valor/custo do projeto
  inteiro.
- **Esforço:** S

### TES-06 — `handlers.ts`: alertas em lote a TODOS os clientes e a máquina de estados do checkup sem teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/handlers.ts:23`, `functions/src/handlers.ts:65`, `functions/src/handlers.ts:100`, `functions/src/handlers.ts:135`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `handleWorkWritten` lê **a coleção `clients` inteira**
  e escreve um alerta por cliente elegível, em lotes de 450. A guarda
  contra repetição é um único campo (`newWorkNotifiedAt`), escrito
  **depois** dos lotes. `handleVehicleUpdated` tem quatro transições de
  estado com quatro condições compostas cada, e nenhuma tem teste.
- **Cenário de falha:** o `batch.commit()` do segundo lote falha (rede) →
  a função rebenta antes de `works/{id}.update({ newWorkNotifiedAt })` →
  o trigger repete → os 450 clientes do primeiro lote recebem o alerta
  "novo trabalho" outra vez, e outra, enquanto o erro durar. Ninguém tem
  como detetar isto a não ser pelos clientes.
- **Evidência:**
  ```ts
  // handlers.ts:32
  for (let i = 0; i < recipients.length; i += 450) {
    const batch = db.batch();
    for (const c of recipients.slice(i, i + 450)) { batch.set(…); }
    await batch.commit();
  }
  await db.collection('works').doc(after.id).update({ newWorkNotifiedAt: ts });
  ```
- **Correção proposta:** `tests/db/handlers.test.ts` (emulador): publicar
  um trabalho com 3 clientes (um sem consentimento, um sem a categoria) →
  1 alerta e `newWorkNotifiedAt` escrito; correr outra vez → 0 alertas;
  despublicar e voltar a publicar → 0 alertas. Para o checkup, uma tabela
  das oito transições (`none→pending`, `pending→pending` com novo
  `requestedAt`, `pending→proposed`, `proposed→approved` pelo cliente,
  `proposed→approved` pela equipa, `pending→approved`, `approved→cancelled`,
  `cancelled→pending`) com o que cada uma tem de produzir
  (`teamAlerts`/`messages`/`confirmedWorks`/`declined`/`reopened`) — o
  `VehicleUpdateSummary` (`handlers.ts:89`) já é a superfície ideal para
  as asserções.
- **Esforço:** M

### TES-07 — Os três passos do acompanhamento pós-serviço sem teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/jobs/followUps.ts:36`, `functions/src/jobs/followUps.ts:61`, `functions/src/jobs/followUps.ts:103`, `functions/src/jobs/followUps.ts:117`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o job decide, por trabalho e por dia, se manda o
  lembrete de checkup (operacional), se avisa a equipa por falta de
  confirmação, e se manda a oferta de lavagem (marketing). São três
  janelas de dias, quatro marcas `*At` e uma função `followUpFinished` com
  três ramos — tudo sem teste, num job que corre sozinho às 10:00.
- **Cenário de falha:** `followUpFinished` devolve `false` por engano num
  trabalho a que não resta nada por fazer → `followUp.active` nunca passa
  a `false` → o trabalho é relido e reavaliado todos os dias para sempre.
  Ou o contrário: devolve `true` cedo demais e a oferta nunca sai.
- **Evidência:**
  ```ts
  // followUps.ts:36
  export function followUpFinished(fu: WorkFollowUp): boolean {
    const checkupDone = !hasStep(fu.checkupDays) || !!fu.checkupSentAt;
    const alertDone = !hasStep(fu.checkupDays) || !hasStep(fu.teamAlertDays) || !!fu.teamAlertSentAt || !!fu.checkupConfirmedAt;
    const offerDone = !hasStep(fu.offerDays) || !!fu.offerSentAt || !!fu.offerSkipped;
    return checkupDone && alertDone && offerDone;
  }
  ```
- **Correção proposta:** teste puro de `followUpFinished` com a tabela
  verdade completa (8 combinações de passos configurados × marcas
  presentes), e `tests/db/followUps.test.ts` (emulador) com `--now`
  simulado: dia 6 → nada; dia 7 → `checkup_reminder` e
  `vehicles.checkupStatus = 'pending'`; cliente sem conta → `team_alert`
  em vez do lembrete, com `teamAlertSentAt` marcado; dia 10 sem
  confirmação → `team_alert`; cliente confirmou → sem `team_alert`; dia
  30 sem `consent.marketing` → `offerSkipped: 'no_consent'` e **nenhum**
  alerta; chão (`type: 'floor'`) → nunca oferta.
- **Esforço:** M

### TES-08 — `push.ts` remove tokens e reavalia o consentimento sem teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/push.ts:31`, `functions/src/push.ts:62`, `functions/src/push.ts:69`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a função mapeia tickets do Expo de volta aos tokens
  **por índice** (`tokens[i]`) e apaga da conta os que deram
  `DeviceNotRegistered`. Um desalinhamento de índice apaga o token errado
  e o cliente deixa de receber push sem que nada falhe — o doc fica com
  `status: 'sent'`.
- **Cenário de falha:** o Expo devolve menos tickets do que mensagens num
  lote com erro parcial (o `sendPush` preenche o lote inteiro com erros,
  mas só por lote de 100). Com 101 tokens e o segundo lote a falhar, o
  `forEach` continua a indexar `tokens[i]` do array global — é preciso um
  teste para fixar que o contrato "um ticket por mensagem, pela mesma
  ordem" (`expo.ts:45`) se mantém.
- **Evidência:**
  ```ts
  // push.ts:62
  tickets.forEach((t, i) => {
    if (t.status === 'ok') okIds.push(t.id);
    else { if (isDeadTokenError(t.details?.error)) dead.push(tokens[i]); … }
  });
  if (dead.length) await clientSnap.ref.update({ pushTokens: FieldValue.arrayRemove(...dead) });
  ```
- **Correção proposta:** `tests/db/push.test.ts` (emulador +
  `vi.stubGlobal('fetch')`): `team_alert` → devolve `null` sem chamar o
  Expo; cliente sem tokens → `no_device`; dois tokens, o segundo
  `DeviceNotRegistered` → `sent` com `devices: 1` e **só o segundo** token
  removido; tokens malformados filtrados por `isExpoPushToken`; `n.push`
  já presente → sai sem repetir; erro de rede → `status: 'error'` com o
  doc atualizado na mesma.
- **Esforço:** M

### TES-09 — `publicIdFromUrl` decide que ficheiro sobrevive à limpeza e não tem teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/cloudinary.ts:23`, `functions/src/cloudinary.ts:76`, `functions/src/handlers.ts:77`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** quando o cliente troca a foto de perfil, a Function
  apaga **tudo** o que tem a tag `uid_<uid>` exceto o `public_id` que
  `publicIdFromUrl()` extrair do URL novo. Essa extração é um `while` com
  três expressões regulares a adivinhar quais são segmentos de
  transformação. Se falhar, `keep` fica `null` e **a foto de perfil atual
  é apagada** — o cliente fica com um avatar partido.
- **Cenário de falha:** o preset do Cloudinary passa a devolver um URL com
  um segmento de transformação que não bate nas regex (ex.:
  `e_improve:outdoor/`, três letras antes do `_`) → o `public_id`
  calculado não corresponde ao real → `filter((id) => id !== keepPublicId)`
  não exclui nada → a foto nova é apagada segundos depois de ser carregada.
- **Evidência:**
  ```ts
  // cloudinary.ts:30
  while (parts.length > 1 && (parts[0].includes(',') || /^v\d+$/.test(parts[0]) || /^[a-z]{1,2}_[^/]+$/.test(parts[0]))) {
    parts.shift();
  }
  ```
  `e_improve` tem duas letras (`e_`) e passa; `bo_2px_solid_black` também;
  mas `if_w_gt_500` ou um `public_id` que comece por `a_` são apanhados por
  engano. É uma função pura de 15 linhas sem um caso de teste.
- **Correção proposta:** `tests/cloudinary.test.ts` (vitest puro, ~20
  minutos) com os URLs reais que a app e o backoffice geram
  (`c_fill,w_512,h_512,g_face/v123/avatars/abc.jpg`,
  `c_limit,w_1600,q_auto,f_auto/…`, o URL com o selo `l_text:…` de
  `simulations.ts:169`), mais os casos limite: sem versão, sem extensão,
  com pasta de dois níveis, URL que não é do Cloudinary (→ `null`), string
  vazia (→ `null`).
- **Esforço:** S

### TES-10 — O escape de HTML dos emails não tem teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/email.ts:45`, `functions/src/email.ts:51`, `functions/src/texts.ts:314`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o email à equipa (`quotes@marble.pt`) leva o nome, o
  telemóvel, a mensagem e as opções que o cliente escreveu, passados por
  `textToHtml()` → `escapeHtml()`. É o único ponto de escape do projeto e
  não tem teste. O email ao cliente segue o mesmo caminho.
- **Cenário de falha:** alguém acrescenta uma linha ao
  `requestTeamEmail` que concatena texto do cliente **depois** do
  `textToHtml` (por exemplo, para pôr o nome em negrito) e um pedido com
  `name = '<img src=x onerror=…>'` chega como HTML vivo à caixa da equipa.
  Nada no fluxo atual o apanha.
- **Evidência:**
  ```ts
  // email.ts:45
  export function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  ```
  (Repara que `'` não é escapado — correto para conteúdo de elemento, mas
  é exatamente o tipo de detalhe que um teste tem de fixar antes de
  alguém usar `escapeHtml` dentro de um atributo.)
- **Correção proposta:** `tests/email.test.ts` (vitest puro): `escapeHtml`
  com `& < > "` e com o `&` já escapado (não duplica); `textToHtml` com
  dois parágrafos e uma quebra simples; e um teste de ponta
  (`TEXTS.requestTeamEmail(pedidoComScript, url).html`) que afirma que
  `<script` **não** aparece no resultado — esse é o teste que impede a
  regressão descrita acima.
- **Esforço:** S

### TES-11 — Lembretes de eventos em lote a toda a base de clientes sem teste
- **Vertente:** testes
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/jobs/events.ts:22`, `functions/src/jobs/events.ts:31`, `functions/src/jobs/events.ts:43`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o job faz uma query UTC larga (ontem → daqui a 3
  dias) e depois filtra pelo **dia de calendário de Lisboa**. Um engano
  nesse filtro manda o lembrete "Amanhã: …" no dia errado, ou manda-o duas
  vezes, a todos os clientes com consentimento de marketing de uma só vez.
  O `reminderSentAt` só é escrito **depois** de todos os lotes.
- **Cenário de falha:** o `lisbonDay()` usa `Intl` com `Europe/Lisbon`; na
  noite de mudança da hora, `addDays(now, 1)` soma 24 h exatas e pode cair
  no mesmo dia de calendário ou saltar um. Nessa corrida, ou não sai
  lembrete nenhum, ou sai o do dia errado — e como `reminderSentAt` fica
  marcado, o lembrete certo nunca chega a sair.
- **Evidência:**
  ```ts
  // events.ts:24
  const tomorrow = lisbonDay(addDays(now, 1));
  …
  .filter((e) => !e.reminderSentAt && e.date && lisbonDay(e.date.toDate()) === tomorrow);
  …
  await db.collection('events').doc(event.id).update({ reminderSentAt: Timestamp.fromDate(now) });
  ```
- **Correção proposta:** teste puro de `lisbonDay`/`addDays` sobre as duas
  transições de hora de 2027 (último domingo de março e de outubro, às
  01:00 UTC) e `tests/db/events.test.ts` (emulador): evento amanhã →
  N alertas e `reminderSentAt`; correr outra vez → 0; evento hoje ou daqui
  a 2 dias → 0; cliente sem `consent.marketing` → fora da lista.
- **Esforço:** M

### TES-12 — O emulador do Firestore não arranca em nenhum dos dois PCs: não há Java
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** regras
- **Onde:** `DEVELOPMENT.md` (capítulo "Segundo PC (escritório): pôr tudo igual a casa"), `scripts/check-setup.mjs:1`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** toda a onda 1 (regras) e metade da onda 2 (Functions
  contra o emulador) dependem do emulador do Firestore, que é um `.jar` e
  precisa de Java. Não está instalado no PC de casa — e o `check:setup`,
  que é a lista de "o que falta nesta máquina", não pergunta por ele.
- **Cenário de falha:** o Fábio chega ao escritório, faz `npm ci`, corre
  `npm test` e recebe `Could not start Firestore Emulator … java: not
  found`. Como o `check:setup` diz "o PC está pronto", perde tempo a
  procurar o problema no projeto.
- **Evidência:**
  ```
  $ java -version
  /usr/bin/bash: line 1: java: command not found
  $ grep -n "java\|Java" scripts/check-setup.mjs DEVELOPMENT.md → (nada sobre Java)
  ```
- **Correção proposta:** instalar em **ambos** os PCs
  (`winget install --id EclipseAdoptium.Temurin.21.JDK -e`); acrescentar
  um bloco "Java (emulador do Firestore)" ao `scripts/check-setup.mjs` no
  mesmo formato do bloco "Python + uv" acrescentado a 2026-09-12 (aviso,
  não falta, enquanto não houver testes; falta, depois); e uma linha na
  tabela "o que não vem pelo git" do `DEVELOPMENT.md`.
- **Esforço:** S

### TES-13 — A lógica "pura" da app não se consegue importar fora do Metro
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/i18n/locale.ts:1`, `src/firebase/app.ts:16`, `src/data/checkups.ts:4`, `src/utils/dates.ts:2`, `src/auth/validation.ts:1`, `src/media/images.ts:1`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os ficheiros que a metodologia aponta como "funções
  puras" arrastam, no grafo de importações, `react-native`,
  `expo-localization`, `expo-image-manipulator` e a **inicialização** do
  Firebase. Um `vitest` em Node não os consegue carregar sem alias e
  stubs; e `src/firebase/app.ts` **lança** se `EXPO_PUBLIC_FIREBASE_API_KEY`
  não estiver definida.
- **Cenário de falha:** escreve-se `tests/checkups.test.ts` a testar
  `checkupOptions()` (uma função de 12 linhas sem dependências reais) e o
  teste falha no import com `Cannot find module 'react-native'` ou com
  `Config do Firebase em falta` — o que leva a desistir da onda mais
  barata do backlog.
- **Evidência:** a cadeia, verificada ficheiro a ficheiro:
  ```
  src/data/checkups.ts:4   import { db } from '../firebase/config'
    → src/firebase/config.ts:6  import app from './app'
      → src/firebase/app.ts:16  if (!firebaseConfig.apiKey …) throw new Error('Config do Firebase em falta…')
  src/data/checkups.ts:17  import { S } from '../i18n'
    → src/i18n/index.ts:3    import { locale } from './locale'
      → src/i18n/locale.ts:1  import { Platform } from 'react-native'
      → src/i18n/locale.ts:2  import { getLocales } from 'expo-localization'
  ```
  (o mesmo `S` é importado por `src/utils/dates.ts:2`,
  `src/auth/validation.ts:1` e `src/auth/errors.ts:2`).
- **Correção proposta:** duas peças, nesta ordem. (1) `vitest.config.ts`
  na raiz com `resolve.alias`: `react-native` → `react-native-web` (já é
  dependência) e `expo-localization` → um stub de 3 linhas em
  `tests/stubs/`, mais `EXPO_PUBLIC_FIREBASE_*` no `env` do vitest a
  apontar a `demo-marble` — resolve tudo sem tocar no código de produção.
  (2) quando for preciso mexer nesses ficheiros por outro motivo, separar
  as funções de calendário (`dayKey`, `parseDay`, `checkupOptions`,
  `checkupState`, `pendingCheckup`) para um módulo sem `S` nem `db`, com
  os textos a entrar por parâmetro — passam a ser testáveis sem alias
  nenhum e o ecrã não muda.
- **Esforço:** S

### TES-14 — `formatCheckupSlot` existe em três repositórios e já diverge
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/data/checkups.ts:109`, `functions/src/texts.ts:113`, `../marble-backoffice/src/utils/checkups.ts:125`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o mesmo texto ("seg, 7 set às 10:30") é gerado por
  três implementações independentes, que os comentários dos três ficheiros
  afirmam ser iguais — e **já não são**: a do backoffice acrescenta o ano
  quando o dia não é do ano corrente; as outras duas nunca o fazem.
- **Cenário de falha:** um checkup agendado para janeiro de 2027 aparece à
  equipa como "sex, 8 jan 2027" e ao cliente (app e alerta da Function)
  como "sex, 8 jan". Ao telefone, equipa e cliente estão a falar de datas
  que não parecem a mesma.
- **Evidência:**
  ```ts
  // ../marble-backoffice/src/utils/checkups.ts:116
  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year}`;
  // src/data/checkups.ts:94  (app — sem ano)
  return `${S.dates.weekdaysShort[d.getDay()]}, ${dayMonth(d)}`;
  // functions/src/texts.ts:101 (alerta — sem ano)
  return `${WEEKDAYS[locale][d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[locale][d.getUTCMonth()]}`;
  ```
- **Correção proposta:** um ficheiro de casos partilhado
  (`tests/fixtures/checkup-slots.json`: dia, período, hora, esperado em PT,
  esperado em EN) e o **mesmo** ficheiro lido pelos três testes — o da app,
  o das Functions e o do backoffice. É a forma mais barata de prender três
  cópias que vivem em repositórios diferentes. Decidir primeiro qual é o
  comportamento certo quanto ao ano (a decisão fica no `ROADMAP.md`).
- **Esforço:** S

### TES-15 — `parseDay` da app aceita dias que não existem; a do backoffice rejeita
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/data/checkups.ts:56`, `../marble-backoffice/src/utils/checkups.ts:45`, `firestore.rules:149`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** as regras só validam o **formato**
  (`^[0-9]{4}-[0-9]{2}-[0-9]{2}$`), não o calendário. O backoffice
  acrescentou a verificação; a app não. São duas cópias da mesma função
  com comportamentos diferentes para a mesma entrada.
- **Cenário de falha:** um `checkupRequest.day = "2026-02-31"` passa nas
  regras, é rejeitado pelo backoffice (`parseDay` → `null`, o dia não
  aparece na grelha) e é **aceite** pela app, que o mostra como "ter, 3
  mar" — a app e a equipa mostram dias diferentes para o mesmo pedido.
- **Evidência:**
  ```ts
  // ../marble-backoffice/src/utils/checkups.ts:50
  // Rejeita "2026-02-31" (o Date normaliza para março).
  return d.getDate() === Number(m[3]) ? d : null;
  // src/data/checkups.ts:59  (app — sem essa linha)
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
  ```
- **Correção proposta:** o mesmo teste nos dois lados
  (`parseDay('2026-02-31') === null`, `parseDay('2026-9-7') === null`,
  `parseDay('2026-09-07')` → 7 de setembro), e alinhar a app pela versão do
  backoffice. Se se quiser fechar a porta de vez, a regra pode validar o
  dia (`request.time` já lá está; validar fevereiro nas regras é
  possível mas feio) — o teste chega.
- **Esforço:** S

### TES-16 — `hasAppAccount` em três cópias, uma já sem `mergedInto`
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/data/duplicates.ts:4`, `../marble-backoffice/src/utils/followUp.ts:109`, `functions/src/consent.ts:13`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a mesma pergunta ("este cliente tem conta na app?")
  tem três implementações. Duas verificam `createdByTeam`, `deletedAt` e
  `mergedInto`; a de `duplicates.ts` esqueceu-se do `mergedInto`.
- **Cenário de falha:** a equipa junta uma ficha duplicada a uma conta
  (`mergedInto` preenchido). Na lista de clientes, `findMatchingAccounts`
  continua a considerar a ficha já juntada como "conta da app" e volta a
  sugerir o mesmo duplicado — o aviso nunca desaparece e a equipa junta
  outra vez.
- **Evidência:**
  ```ts
  // ../marble-backoffice/src/data/duplicates.ts:4
  export function hasAppAccount(c: Client): boolean {
    return !c.createdByTeam && !c.deletedAt;          // falta !c.mergedInto
  }
  // ../marble-backoffice/src/utils/followUp.ts:109
  return !!c && !c.createdByTeam && !c.deletedAt && !c.mergedInto;
  ```
- **Correção proposta:** uma só definição no backoffice (importar a de
  `utils/followUp.ts` em `data/duplicates.ts`), e o teste de
  `findMatchingAccounts` com um cliente `mergedInto` preenchido a provar
  que não é sugerido. O teste de `canReceive` (TES-05) já cobre a versão
  das Functions.
- **Esforço:** S

### TES-17 — `followUpFinished` duplicada em dois repositórios, sem teste que as prenda
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/jobs/followUps.ts:36`, `../marble-backoffice/src/utils/followUp.ts:57`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a função é hoje **byte a byte igual** nos dois
  repositórios (o comentário do backoffice até o diz), e é ela que decide
  se `followUp.active` fica ligado. O backoffice usa-a ao gravar o
  formulário (`buildFollowUp`); as Functions usam-na ao fechar o passo.
  Nada impede que divirjam no próximo commit de um dos lados.
- **Cenário de falha:** o backoffice grava `active: false` (por achar que
  já não resta nada) num trabalho em que o job ainda tinha a oferta por
  enviar → a oferta nunca sai e ninguém dá por isso, porque o job só lê
  trabalhos com `active == true`.
- **Evidência:** os dois corpos, idênticos:
  ```ts
  const alertDone = !hasStep(fu.checkupDays) || !hasStep(fu.teamAlertDays) || !!fu.teamAlertSentAt || !!fu.checkupConfirmedAt;
  ```
- **Correção proposta:** a mesma tabela verdade em ambos os repositórios,
  copiada de propósito, com um comentário no topo a dizer "a cópia vive em
  X — se mudares uma, muda a outra" (é o padrão que o projeto já usa para
  `models.ts` e `departments.ts`). Mais o teste de `buildFollowUp`: dias
  fora de 0–365 → `{ error }`; chão com `offer: true` → `offerDays: null`;
  `existing` com `*At` preservado.
- **Esforço:** S

### TES-18 — O typecheck prova as chaves de `src/i18n`, não os valores interpolados
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/i18n/types.ts:5`, `src/i18n/pt.ts:13`, `src/i18n/en.ts:6`, `DEVELOPMENT.md` (secção "Idiomas")
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `Strings = typeof pt` garante que `en.ts` tem as
  mesmas chaves com a mesma forma. Não garante que uma função em EN
  **use** o parâmetro que recebe. O próprio `DEVELOPMENT.md` já o diz:
  "**É a única verificação — não há teste de que os dois textos dizem o
  mesmo**" (secção "Idiomas", a propósito de `en.ts`) — este achado não
  contraria essa decisão, propõe o teste que ela reconhece em falta.
- **Cenário de falha:** `count: (n: number) => 'published works'` (sem o
  `${n}`) compila sem um aviso. O cliente com o telemóvel em inglês vê
  "published works" sem número, num ecrã que ninguém abre em EN durante
  meses. São 1097 linhas em dois ficheiros com ~40 funções de cada lado.
- **Evidência:**
  ```
  $ grep -c "=> \`" src/i18n/pt.ts src/i18n/en.ts
  src/i18n/pt.ts:39
  src/i18n/en.ts:40
  ```
  (as funções multilinha não entram nesta contagem — é precisamente por
  isso que a verificação tem de ser um teste, não um `grep`.)
- **Correção proposta:** `tests/i18n.test.ts` que percorre `pt` e `en` em
  profundidade e, para cada folha: se for função, chama-a com valores
  sentinela (`424242`, `'ZZTOP'`) e afirma que o resultado os contém e que
  tem a mesma aridade nos dois idiomas; se for string, afirma que não está
  vazia. Um teste de ~40 linhas que cobre 1097. Só precisa da correção de
  TES-13 (alias) para poder importar `pt.ts`/`en.ts`.
- **Esforço:** S

### TES-19 — `npm run typecheck` não é passo obrigatório de nenhum fluxo, e não há CI
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** dependencias
- **Onde:** `package.json:61`, `functions/package.json:11`, `../marble-backoffice/package.json:9`, `CLAUDE.md`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os três projetos têm `typecheck` e nenhum documento
  o torna obrigatório. O `CLAUDE.md` descreve o fim de cada secção como
  "atualiza o `ROADMAP.md`, faz commit, `git push`" — sem verificação
  nenhuma pelo meio. Não há `.github/workflows` em nenhum dos dois
  repositórios, por isso o `push` também não verifica nada.
- **Cenário de falha:** já aconteceu numa variante: o `predeploy` das
  Functions falhou com TS5107 no meio de um deploy porque
  `functions/node_modules` não existia nessa máquina (`ROADMAP.md:1441`).
  Com o typecheck dos três projetos a correr no push, o erro aparece antes
  e não durante o deploy. Com dois PCs, o risco dobra: o que compila em
  casa pode não compilar no escritório.
- **Evidência:**
  ```
  $ ls .github ../marble-backoffice/.github
  ls: cannot access '.github': No such file or directory
  $ grep -n "typecheck" CLAUDE.md → (nada)
  ```
- **Correção proposta:** (1) uma linha no `CLAUDE.md`, em "Outras": "antes
  do commit, `npm run typecheck` na raiz (compila também `functions/src`)
  e, se tocaste no backoffice, lá também"; (2) o workflow de CI da secção
  "Ondas e integração contínua" abaixo. A (1) custa 2 minutos e vale por
  si, mesmo que o CI fique para depois.
- **Esforço:** S

### TES-20 — O verificador mais completo escreve no projeto real, sem guarda `-dev` e com blocos que se saltam em silêncio
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** scripts
- **Onde:** `scripts/check-firestore-auth.mjs:46`, `scripts/check-firestore-auth.mjs:99`, `scripts/check-firestore-auth.mjs:156`, `scripts/check-firestore-auth.mjs:177`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** três problemas no mesmo ficheiro. (1) A guarda só
  compara a chave com o `.env` local — ao contrário de
  `runJobs.ts:52`, `dev-token.mjs:25`, `checkup-admin.mjs:38`,
  `migrate-work-tags.mjs:35` e `seed-firestore.mjs:38`, **não exige que o
  projeto acabe em `-dev`**. (2) Escreve a sério: cria e apaga um pedido,
  altera um carro/chão real e marca um alerta real como lido. (3) Quando
  o seed não tem o estado esperado, blocos inteiros são saltados com um
  `--` e o script **termina na mesma com "Tudo certo"**.
- **Cenário de falha:** alguém copia o `.env.production` para `.env` para
  ver a app contra o prod (é um passo plausível na Secção 11) e corre
  `npm run check:firestore:auth -- ./serviceAccountKey.prod.json`. A
  guarda passa (chave e `.env` são ambos do prod) e o script cria um
  pedido de orçamento, dispara a `onRequestWritten` e altera o checkup de
  um cliente real em produção.
- **Evidência:**
  ```js
  // check-firestore-auth.mjs:46
  if (serviceAccount.project_id !== env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) { … exit(1); }
  // (não há nenhum `endsWith('-dev')`, ao contrário dos outros cinco scripts)

  // check-firestore-auth.mjs:156
  } else { console.log('  --   sem carro/chão com checkup pendente para testar o agendamento (corre o seed)'); }
  // ok continua true → linha 340 imprime "Tudo certo."
  ```
- **Correção proposta:** acrescentar a mesma guarda dos outros cinco
  (`if (!String(key.project_id).endsWith('-dev')) exit(1)`), e fazer com
  que um bloco saltado conte como "não verificado" no resumo final (ex.:
  `Tudo certo (2 blocos saltados — corre o seed)` e código de saída 0, mas
  nunca "Tudo certo." seco). A médio prazo, os casos deste script mudam-se
  para `tests/rules/` (onda 1), onde correm contra o emulador sem escrever
  em projeto nenhum — e o script fica só como verificação pós-deploy.
- **Esforço:** S

### TES-21 — Datas de Lisboa e 340 linhas de texto ao cliente sem teste
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/time.ts:7`, `functions/src/time.ts:16`, `functions/src/texts.ts:72`, `functions/src/texts.ts:101`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `addDays` soma 24 h fixas (`d.getTime() + days *
  DAY_MS`), o que não é o mesmo que "mais N dias" no calendário de Lisboa
  quando há mudança de hora pelo meio; `lisbonDay` e `formatDay` usam
  `Intl` com `Europe/Lisbon`. São funções puras, usadas por todos os jobs
  para decidir o dia em que algo acontece, e nenhuma tem teste.
- **Cenário de falha:** um trabalho concluído a 26 de outubro com
  `checkupDays: 7`: o `addDays` dá 2 de novembro às 09:00 UTC; o job corre
  às 10:00 de Lisboa (= 10:00 UTC no inverno). A comparação
  `addDays(completed, 7) <= now` continua a bater — mas a margem é de uma
  hora, e nada garante que continue a bater se a hora do `onSchedule`
  mudar. Um teste fixa a garantia; hoje não há nenhuma.
- **Evidência:**
  ```ts
  // time.ts:7
  export function addDays(d: Date, days: number): Date { return new Date(d.getTime() + days * DAY_MS); }
  // time.ts:16
  export function lisbonDay(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', … }).format(d);
  }
  ```
- **Correção proposta:** `tests/time.test.ts` (vitest puro): `lisbonDay`
  para 2026-10-25T00:30Z (ainda dia 25 em Lisboa? verão→inverno) e
  2026-03-29T00:30Z, `daysBetween` sobre as duas transições, e
  `formatDay`/`formatCheckupDay` com o mesmo ficheiro de casos de TES-14.
  Para `texts.ts`, testes de contrato sobre um conjunto pequeno: cada
  função dirigida ao cliente devolve `title` e `description` não vazios em
  PT **e** em EN, e os textos com valores contêm o valor (nome do carro,
  dia, número de dias).
- **Esforço:** M

### TES-22 — Utilitários do backoffice sem qualquer teste
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/utils/checkups.ts:73`, `../marble-backoffice/src/utils/format.ts:190`, `../marble-backoffice/src/utils/format.ts:214`, `../marble-backoffice/src/utils/dates.ts:25`, `../marble-backoffice/src/data/duplicates.ts:11`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** 636 linhas de lógica pura (normalização de
  disponibilidade, comparação de emails/telemóveis para duplicados,
  formatação de datas e estados) sem um único teste, num projeto que já
  tem Vite 7 — instalar o `vitest` é uma linha e os ficheiros importam-se
  em Node sem alias nenhum.
- **Cenário de falha:** `normalizePhone` corta o indicativo só quando
  `digits.startsWith('351') && digits.length > 9`. Um número fixo
  português que comece por 351 (existem, no Algarve: 351xxxxxx) com 9
  dígitos não é cortado — correto; mas com o indicativo escrito
  `00351 912345678` fica `00351912345678`, que não começa por `351` e não
  é cortado — o duplicado não é detetado e a equipa cria duas fichas para
  a mesma pessoa.
- **Evidência:**
  ```ts
  // ../marble-backoffice/src/utils/format.ts:196
  export function normalizePhone(s: string | undefined): string {
    const digits = (s ?? '').replace(/\D/g, '');
    return digits.startsWith('351') && digits.length > 9 ? digits.slice(3) : digits;
  }
  ```
- **Correção proposta:** `npm i -D vitest` no backoffice e
  `src/utils/__tests__/`: `normalizeEmail`/`normalizePhone` com
  `+351 912 345 678`, `00351912345678`, `912345678`, `351912345678` (os
  quatro têm de dar o mesmo); `normalizeAvailability` com doc ausente, com
  dias a mais e com `weeksAhead` fora dos limites; `openDays` a saltar
  `closedDays`; `isValidTime` com `9:30`, `24:00`, `10:30`;
  `slotSortKey` a ordenar manhã antes de tarde; `placeholderVariant`
  estável e sempre entre 0 e 5; `pushStatusText` para os cinco estados.
- **Esforço:** M

### TES-23 — `expo.ts`, `receipts.ts` e `vertex.ts`: `fetch` global e nenhuma cobertura
- **Vertente:** testes
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/expo.ts:25`, `functions/src/expo.ts:48`, `functions/src/jobs/receipts.ts:36`, `functions/src/vertex.ts:96`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** as três camadas que falam com serviços externos
  (Expo Push, Vertex AI) analisam respostas JSON com formas que não
  controlamos, e nenhuma tem teste. `runReceipts` decide **remover um
  token de push** com base nessa análise; `generateEditedImage` decide se
  a simulação é `done` ou `failed`.
- **Cenário de falha:** o Expo devolve um recibo de erro com
  `details.error` ausente; `isDeadTokenError(undefined)` dá `false`
  (correto), mas `errorsByNotif.set(…, r.details?.error ?? r.message)`
  guarda a mensagem — e se o Expo mudar `message` para um objeto, o
  `batch.update` escreve um objeto onde a app espera uma string. Ninguém
  vê, porque o job engole erros por job (`jobs/index.ts:31`).
- **Evidência:**
  ```ts
  // receipts.ts:30
  if (r.status === 'error') {
    errorsByNotif.set(ref.notifId, r.details?.error ?? r.message);
    if (isDeadTokenError(r.details?.error)) clientsWithDead.add(ref.clientId);
  }
  // jobs/index.ts:31 — cada job engole o seu erro
  } catch (err) { summary[name] = { error: … }; log(`[${name}] ERRO …`); }
  ```
- **Correção proposta:** `vi.stubGlobal('fetch', …)` com respostas
  gravadas: `sendPush` com 100 e com 101 mensagens (dois lotes), com
  `res.ok === false`, com corpo sem `data`, e com `fetch` a lançar — em
  todos os casos tem de devolver **um ticket por mensagem, pela mesma
  ordem** (é o contrato de que TES-08 depende). `getReceipts` com IDs sem
  recibo. `generateEditedImage` com resposta só de texto, com
  `promptFeedback.blockReason`, com `finishReason: 'SAFETY'` e com 403
  (Vertex sem o papel IAM) — os quatro têm de dar `failed` com motivo
  legível, nunca uma exceção não tratada.
- **Esforço:** M

### TES-24 — Lógica pura pequena da app sem testes
- **Vertente:** testes
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/data/requestForms.ts:146`, `src/media/images.ts:10`, `src/utils/layout.ts:15`, `src/auth/validation.ts:6`, `src/auth/errors.ts:8`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** cinco ficheiros pequenos com lógica que só se vê no
  ecrã: `requestForm()` (que decide o que fica **guardado** em PT e o que
  se **mostra** no idioma da app), as quatro validações de formulário, o
  mapa de erros do Auth, a redução de imagens e a largura útil na web.
- **Cenário de falha:** `option()` devolve `{ value: o.pt, label: tx(o) }`
  — se alguém trocar `value` por `tx(o)` numa limpeza, os pedidos de
  clientes em inglês passam a chegar ao backoffice com as opções em
  inglês, e o email à equipa deixa de bater certo com o que a equipa
  espera ler. Nada falha; só se descobre ao ler um pedido.
- **Evidência:**
  ```ts
  // src/data/requestForms.ts:146
  function option(o: Option): RequestOption { return { value: o.pt, label: tx(o) }; }
  // src/data/requestForms.ts:160
  storedLabel: d.label.pt,
  ```
- **Correção proposta:** com o alias de TES-13 já feito, `tests/app/`:
  `requestForm('automotive')` com `locale: 'en'` → `label` em inglês e
  `value`/`storedLabel` em português, para os seis departamentos;
  `validatePhone` com `+351 912 345 678`, `912345678`, `91234567`;
  `authErrorMessage` para os 10 códigos mapeados e para um desconhecido;
  `useAppWidth` fica de fora (é um hook de UI).
- **Esforço:** S

### TES-25 — Os 14 scripts de administração não têm testes nem um modo de ensaio uniforme
- **Vertente:** testes
- **Severidade:** Baixo
- **Superfície:** scripts
- **Onde:** `scripts/auth-email-config.mjs:14`, `scripts/demo-account.mjs:10`, `scripts/seed-firestore.mjs:38`, `scripts/migrate-work-tags.mjs:35`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** 2598 linhas de scripts que escrevem no Firestore, no
  Auth e no Identity Toolkit, sem testes. Os perigosos estão, na maior
  parte, bem guardados — mas dois aceitam chaves do **prod** de propósito
  e a diferença entre ensaio e execução é um `--apply` que cada script
  interpreta à sua maneira.
- **Cenário de falha:** `npm run auth:emails -- ./serviceAccountKey.prod.json --apply`
  reescreve os templates de email do Auth em produção; `npm run
  demo:account -- ./serviceAccountKey.prod.json … --apply` cria (ou
  repõe a password de) uma conta em produção. Ambos estão documentados e
  são intencionais, mas um `--apply` escrito por engano na linha errada
  não tem rede.
- **Evidência:**
  | Script | Guarda |
  |---|---|
  | `seed-firestore.mjs:38` | recusa `project_id` com "prod" |
  | `checkup-admin.mjs:38`, `dev-token.mjs:25`, `migrate-work-tags.mjs:35`, `functions/src/scripts/runJobs.ts:52` | exigem `endsWith('-dev')` |
  | `check-firestore-auth.mjs:46` | **só compara com o `.env`** (ver TES-20) |
  | `auth-email-config.mjs`, `demo-account.mjs` | **aceitam prod de propósito**, com `--apply` |
- **Correção proposta:** não escrever testes para eles (o custo não se
  paga). Em vez disso: uniformizar a regra — sem `--apply` nunca se
  escreve, e com uma chave de prod o script imprime o `project_id` em
  destaque e pede uma confirmação escrita. O teste que vale a pena é o de
  TES-20 (a guarda em falta).
- **Esforço:** S

### TES-26 — Sugestão: workflow mínimo de integração contínua nos dois repositórios
- **Vertente:** testes
- **Severidade:** Sugestão
- **Superfície:** dependencias
- **Onde:** `package.json:61`, `functions/package.json:11`, `../marble-backoffice/package.json:9`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** com dois PCs e uma só memória partilhada (o git), o
  sítio certo para a verificação é o `push` — é o único momento por que
  passam os dois PCs. Não existe.
- **Cenário de falha:** o trabalho feito no escritório compila lá e não
  compila em casa (versões de `node_modules` diferentes, `functions/`
  sem instalar). Descobre-se dias depois, a meio de um deploy.
- **Evidência:** `ls .github` → não existe, nos dois repositórios.
- **Correção proposta:** `.github/workflows/ci.yml` na app:
  `actions/setup-node@v4` (node 22, cache npm) + `actions/setup-java@v4`
  (temurin 21) → `npm ci`, `npm ci --prefix functions`, `npm run
  typecheck`, `npm test`, `npm run test:rules`. No backoffice, o mesmo sem
  o Java e sem as regras. **Custo:** cerca de 4 a 6 minutos por corrida
  em `ubuntu-latest`; num repositório privado no plano gratuito do GitHub
  são 2000 minutos por mês, ou seja ~350 corridas — mais do que
  suficiente se correr em `push` para `master` e em pull requests (e não
  em todos os ramos `claude/*`).
- **Esforço:** S

### TES-27 — Sugestão: cobertura medida, mas só nos ficheiros de risco
- **Vertente:** testes
- **Severidade:** Sugestão
- **Superfície:** functions
- **Onde:** `functions/package.json:9`, `package.json:41`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** sem uma medida, é fácil acabar com muitos testes nos
  ficheiros fáceis e nenhum nos que arriscam. Uma meta global de
  percentagem seria contraproducente num projeto com ecrãs que não se vão
  testar.
- **Cenário de falha:** três meses depois há 80 testes, todos de
  formatação de datas, e `retention.ts` continua sem nenhum.
- **Evidência:** nenhum dos três `package.json` tem `test` nem
  `coverage`.
- **Correção proposta:** `vitest --coverage` com `thresholds` **apenas**
  sobre a lista de ficheiros dos achados Alto (`functions/src/{consent,
  push,requests,simulations,cloudinary,email,handlers}.ts` e
  `functions/src/jobs/*.ts`), a 80 %, e `all: false` para o resto. A
  pasta `coverage/` entra no `.gitignore` (a par de `firestore-debug.log`,
  que o emulador cria na raiz).
- **Esforço:** S

### TES-28 — Sugestão: testes de componentes e E2E ficam deliberadamente de fora
- **Vertente:** testes
- **Severidade:** Sugestão
- **Superfície:** app
- **Onde:** `src/screens/`, `../marble-backoffice/src/pages/`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** nada — é uma decisão a registar, não um defeito. A
  app já tem um ciclo de verificação visual que funciona (pré-visualização
  web a 411×812 e o telemóvel com a Marble Dev, `DEVELOPMENT.md`), e
  montar `@testing-library/react-native` sobre Expo 57 / RN 0.86 custa
  mais do que dá neste projeto.
- **Cenário de falha:** n/a.
- **Evidência:** a metodologia desta vertente exclui-o explicitamente
  ("Não é achado: não haver testes de UI/E2E").
- **Correção proposta:** escrever no `ROADMAP.md`, na nota de testes, que
  a decisão é: **testes só de lógica**; a UI verifica-se como hoje. Se um
  ecrã ganhar lógica a sério, extrai-se para um módulo e testa-se esse.
- **Esforço:** S

### TES-29 — Sugestão: `check:setup` passa a verificar o que os testes precisam
- **Vertente:** testes
- **Severidade:** Sugestão
- **Superfície:** scripts
- **Onde:** `scripts/check-setup.mjs:1`, `DEVELOPMENT.md` (capítulo "Segundo PC")
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o `check:setup` é a resposta oficial a "não funciona
  nesta máquina" (`CLAUDE.md`, regra 3 dos dois PCs). Se os testes
  entrarem sem passar por lá, o escritório volta a ficar para trás.
- **Cenário de falha:** ver TES-12.
- **Evidência:** `scripts/check-setup.mjs` verifica Node, pasta fora do
  OneDrive, git, ramos, `node_modules`, `.env`, chaves, sessões da
  Firebase CLI e do EAS, backoffice ao lado e Python/uv — não verifica
  Java nem se `npm test` existe.
- **Correção proposta:** um bloco "Testes" com: Java 17+ (`java -version`,
  e a deteção "instalado mas fora do PATH" pela pasta do Temurin, no mesmo
  padrão do bloco Python + uv), `node_modules` do backoffice, e um aviso
  se `package.json` tiver `test` mas nunca tiver sido corrido. Mais a
  linha correspondente na tabela "o que não vem pelo git" do
  `DEVELOPMENT.md`.
- **Esforço:** S

## Proposta de infraestrutura

Uma escolha, três projetos: **Vitest** em todos. Razões concretas: o
backoffice já é Vite 7 (o `vitest` reaproveita a mesma configuração e
resolução); as Functions são TypeScript puro em Node 22 (o Vitest corre
`.ts` sem passo de build); a app precisa de `resolve.alias` para desviar
`react-native` — coisa que o Vitest faz por configuração e o Jest só com
preset e Babel. Nada disto obriga a Metro nem a Babel.

### O que instalar (comandos para o Fábio correr; nos DOIS PCs)

```powershell
# 1. Java, uma vez por PC — é o emulador do Firestore que precisa dele
winget install --id EclipseAdoptium.Temurin.21.JDK -e
#    reabrir o PowerShell e confirmar:
java -version

# 2. Na pasta da app (marble-app)
npm.cmd i -D vitest @firebase/rules-unit-testing firebase-tools

# 3. Nas Functions
npm.cmd --prefix functions i -D vitest

# 4. No backoffice (marble-backoffice) — já tem firebase-tools
npm.cmd i -D vitest
```

Tempo: ~30 minutos por PC, quase tudo à espera do download do JDK.

### O que muda nos ficheiros

| Ficheiro | Mudança |
|---|---|
| `firebase.json` | novo bloco `"emulators": { "firestore": { "port": 8080 }, "ui": { "enabled": false }, "singleProjectMode": true }` (8080 não choca com o 8081 do Expo nem com o 8082/8084 da app web) |
| `package.json` (app) | `"test": "vitest run"`, `"test:rules": "firebase-tools emulators:exec --only firestore --project demo-marble \"vitest run --dir tests/rules\""` |
| `vitest.config.ts` (app, novo) | `environment: 'node'`; `resolve.alias`: `react-native` → `react-native-web`, `expo-localization` → `tests/stubs/expo-localization.ts`, `expo-image-manipulator` → stub; `test.env` com `EXPO_PUBLIC_FIREBASE_*` a apontar a `demo-marble` (resolve TES-13) |
| `functions/package.json` | `"test": "vitest run --dir tests"`, `"test:db": "firebase-tools --config ../firebase.json emulators:exec --only firestore --project demo-marble \"vitest run --dir tests/db\""` |
| `../marble-backoffice/package.json` | `"test": "vitest run"` |
| `.gitignore` (app) | `coverage/`, `firestore-debug.log` (o `firebase-debug.log` já lá está) |
| `.gitignore` (backoffice) | `coverage/` |
| `CLAUDE.md` | uma linha em "Outras": `npm run typecheck` e `npm test` antes do commit (TES-19) |
| `DEVELOPMENT.md` | novo capítulo curto "Testes" (como correr, onde vivem, o que precisa de Java) e a linha do Java na tabela do "Segundo PC" |
| `scripts/check-setup.mjs` | bloco "Testes" (TES-29) |

### Como os testes das Functions falam com o Firestore

Sem mudar uma linha do código de produção: `emulators:exec` define
`FIRESTORE_EMULATOR_HOST`, e o `firebase-admin` inicializado no teste
(`initializeApp({ projectId: 'demo-marble' })`) liga-se sozinho ao
emulador. Cada ficheiro de teste limpa as coleções que usa no
`beforeEach`. Os `deps` já são injetáveis (`auth`, `cloudinary`, `email`,
`vertex`, `dailyCap`), por isso nada externo é tocado; o `fetch` global
troca-se com `vi.stubGlobal`.

### O que isto custa e o que dá

| | Tempo | O que passa a estar provado |
|---|---|---|
| Instalação (2 PCs) | 1 h | — |
| Onda 1 — regras | 6–8 h | A matriz de acesso inteira, sem deploy, em ~20 s |
| Onda 2 — Functions de dados e dinheiro | 8–12 h | Tectos, retenção, consentimento, envios em lote |
| Onda 3 — app e backoffice | 4–6 h | i18n, validações, datas, duplicados |
| CI | 1 h | O que compila e passa em casa passa no escritório |
| **Total** | **20–28 h** | |

## Backlog priorizado

Nomes dos testes em português, como frases que descrevem o comportamento —
é o que aparece no relatório do `vitest` e o que o Fábio lê quando algo
falha.

### Prioridade 1 — Regras do Firestore (onda 1)

| # | Projeto | Ficheiro proposto | Nome do teste | O que prova | Infra | Esforço |
|---|---|---|---|---|---|---|
| 1 | app | `tests/rules/clients.test.ts` | recusa a um cliente ler o doc de outro cliente | TES-01 | emulador + rules-unit-testing | S |
| 2 | app | `tests/rules/clients.test.ts` | recusa apagar um cliente, mesmo à equipa | TES-01 | idem | S |
| 3 | app | `tests/rules/clients.test.ts` | deixa a equipa ler e alterar qualquer cliente | TES-01 | idem | S |
| 4 | app | `tests/rules/vehicles.test.ts` | recusa a um cliente ler o carro de outro | TES-01 | idem | S |
| 5 | app | `tests/rules/vehicles.test.ts` | deixa o dono pedir checkup com dia, período e nota válidos | TES-01 | idem | S |
| 6 | app | `tests/rules/vehicles.test.ts` | recusa pedir checkup já com o estado aprovado | TES-01 | idem | S |
| 7 | app | `tests/rules/vehicles.test.ts` | recusa pedir checkup com nota de 301 caracteres | TES-01 | idem | S |
| 8 | app | `tests/rules/vehicles.test.ts` | recusa pedir checkup com `requestedAt` diferente de `request.time` | TES-01 | idem | S |
| 9 | app | `tests/rules/vehicles.test.ts` | recusa ao cliente marcar o checkup como em dia | TES-01 | idem | S |
| 10 | app | `tests/rules/vehicles.test.ts` | recusa ao cliente aprovar o próprio pedido | TES-01 | idem | S |
| 11 | app | `tests/rules/vehicles.test.ts` | deixa confirmar a proposta da equipa mudando só estado e `confirmedAt` | TES-01 | idem | S |
| 12 | app | `tests/rules/vehicles.test.ts` | recusa confirmar a proposta mudando também o dia | TES-01 | idem | S |
| 13 | app | `tests/rules/vehicles.test.ts` | recusa escrever no checkup quando o carro já está em dia | TES-01 | idem | S |
| 14 | app | `tests/rules/requests.test.ts` | recusa criar pedido com `clientId` de outro | TES-01 | idem | S |
| 15 | app | `tests/rules/requests.test.ts` | recusa criar pedido sem sessão | TES-01 | idem | S |
| 16 | app | `tests/rules/requests.test.ts` | recusa criar pedido com `status` diferente de `new` | TES-01 | idem | S |
| 17 | app | `tests/rules/requests.test.ts` | recusa criar pedido com campos da equipa (`notes`, `flagged`, `processedAt`) | TES-01 | idem | S |
| 18 | app | `tests/rules/requests.test.ts` | recusa criar pedido com mais de 12 serviços, 8 campos ou 5 fotos | TES-01 | idem | S |
| 19 | app | `tests/rules/requests.test.ts` | recusa criar pedido com mensagem acima de 2000 caracteres | TES-01 | idem | S |
| 20 | app | `tests/rules/requests.test.ts` | recusa criar pedido com `createdAt` diferente de `request.time` | TES-01 | idem | S |
| 21 | app | `tests/rules/requests.test.ts` | recusa ao cliente alterar ou apagar o pedido depois de criado | TES-01 | idem | S |
| 22 | app | `tests/rules/requests.test.ts` | recusa a um cliente ler o pedido de outro | TES-01 | idem | S |
| 23 | app | `tests/rules/notifications.test.ts` | deixa o dono marcar como lido e recusa mudar o título | TES-01 | idem | S |
| 24 | app | `tests/rules/notifications.test.ts` | recusa ao cliente criar ou apagar alertas | TES-01 | idem | S |
| 25 | app | `tests/rules/works.test.ts` | recusa ler um trabalho por publicar e a query sem o filtro `published` | TES-01 | idem | S |
| 26 | app | `tests/rules/works.test.ts` | recusa a um cliente escrever em `works`, `events` e `settings` | TES-01 | idem | S |
| 27 | app | `tests/rules/simulations.test.ts` | recusa criar simulação com `result` ou `status` já preenchidos | TES-01 | idem | S |
| 28 | app | `tests/rules/simulations.test.ts` | deixa o dono ligar a simulação a um pedido e recusa mudar mais alguma coisa | TES-01 | idem | S |
| 29 | app | `tests/rules/simulations.test.ts` | recusa a um cliente ler ou apagar a simulação de outro | TES-01 | idem | S |
| 30 | app | `tests/rules/samples.test.ts` | recusa ler amostras por publicar e escrever amostras | TES-01 | idem | S |

### Prioridade 2 — Functions com dinheiro ou dados (onda 2)

| # | Projeto | Ficheiro proposto | Nome do teste | O que prova | Infra | Esforço |
|---|---|---|---|---|---|---|
| 31 | functions | `tests/consent.test.ts` | não envia marketing a quem não tem `consent.marketing` | TES-05 | nenhuma | S |
| 32 | functions | `tests/consent.test.ts` | não envia nada a fichas criadas pela equipa, apagadas ou juntadas | TES-05 | nenhuma | S |
| 33 | functions | `tests/consent.test.ts` | envia o lembrete de checkup mesmo sem consentimento de marketing | TES-05 | nenhuma | S |
| 34 | functions | `tests/consent.test.ts` | não envia `new_work` a quem tem a categoria desligada | TES-05 | nenhuma | S |
| 35 | functions | `tests/cloudinary.test.ts` | extrai o `public_id` de todos os formatos de URL que a app gera | TES-09 | nenhuma | S |
| 36 | functions | `tests/cloudinary.test.ts` | devolve nulo para URLs que não são do Cloudinary | TES-09 | nenhuma | S |
| 37 | functions | `tests/email.test.ts` | escapa `<`, `>`, `&` e aspas no texto que o cliente escreveu | TES-10 | nenhuma | S |
| 38 | functions | `tests/email.test.ts` | o email à equipa nunca contém HTML vivo vindo do pedido | TES-10 | nenhuma | S |
| 39 | functions | `tests/time.test.ts` | o dia de Lisboa não muda com o fuso da máquina nem na mudança de hora | TES-21 | nenhuma | S |
| 40 | functions | `tests/expo.test.ts` | devolve um ticket por mensagem, pela mesma ordem, mesmo quando a rede falha | TES-23 | fetch trocado | S |
| 41 | functions | `tests/vertex.test.ts` | uma resposta sem imagem vira `failed` com motivo legível, não uma exceção | TES-23 | fetch + mock do auth | M |
| 42 | functions | `tests/db/requests.test.ts` | marca como spam o quarto pedido do mesmo cliente em 24 h | TES-03 | emulador | M |
| 43 | functions | `tests/db/requests.test.ts` | acima do tecto diário marca o pedido e avisa a equipa uma só vez por dia | TES-03 | emulador | M |
| 44 | functions | `tests/db/requests.test.ts` | não repete nada num pedido que já tem `processedAt` | TES-03 | emulador | S |
| 45 | functions | `tests/db/requests.test.ts` | anonimiza um pedido fechado há mais de 365 dias e deixa os de 300 intactos | TES-03 | emulador | M |
| 46 | functions | `tests/db/simulations.test.ts` | a sexta simulação do dia fica limitada sem chamar o modelo | TES-04 | emulador | M |
| 47 | functions | `tests/db/simulations.test.ts` | as simulações limitadas e travadas não contam para o limite do cliente | TES-04 | emulador | M |
| 48 | functions | `tests/db/simulations.test.ts` | acima do tecto global a simulação fica travada e a equipa é avisada uma vez | TES-04 | emulador | M |
| 49 | functions | `tests/db/simulations.test.ts` | apaga simulações com mais de 90 dias e poupa as ligadas a um pedido | TES-04 | emulador | S |
| 50 | functions | `tests/db/retention.test.ts` | avisa aos três anos menos trinta dias e não apaga nada nesse dia | TES-02 | emulador | M |
| 51 | functions | `tests/db/retention.test.ts` | apaga a conta trinta dias depois do aviso, no Firestore e no Auth | TES-02 | emulador + auth falso | M |
| 52 | functions | `tests/db/retention.test.ts` | cancela o aviso se o cliente abrir a app entretanto | TES-02 | emulador | S |
| 53 | functions | `tests/db/retention.test.ts` | conta com trabalhos recentes nunca é considerada inativa | TES-02 | emulador | S |
| 54 | functions | `tests/db/followUps.test.ts` | manda o lembrete de checkup ao sétimo dia e nunca dois | TES-07 | emulador | M |
| 55 | functions | `tests/db/followUps.test.ts` | cliente sem conta na app recebe alerta interno em vez do lembrete | TES-07 | emulador | S |
| 56 | functions | `tests/db/followUps.test.ts` | não avisa a equipa quando o cliente já confirmou o checkup | TES-07 | emulador | S |
| 57 | functions | `tests/db/followUps.test.ts` | não envia a oferta sem consentimento e regista o motivo | TES-07 | emulador | S |
| 58 | functions | `tests/db/followUps.test.ts` | um chão nunca recebe a oferta de lavagem | TES-07 | emulador | S |
| 59 | functions | `tests/followUps.test.ts` | o acompanhamento só fecha quando não resta nenhum passo por dar | TES-07 | nenhuma | S |
| 60 | functions | `tests/db/handlers.test.ts` | publicar um trabalho avisa uma só vez, mesmo despublicando e voltando a publicar | TES-06 | emulador | M |
| 61 | functions | `tests/db/handlers.test.ts` | o pedido de checkup do cliente gera alerta interno e confirma o acompanhamento | TES-06 | emulador | M |
| 62 | functions | `tests/db/handlers.test.ts` | o cliente confirmar a proposta gera alerta interno; a equipa aprovar não | TES-06 | emulador | M |
| 63 | functions | `tests/db/handlers.test.ts` | cancelar passa o carro a "não quis" e voltar a pedir repõe-no pendente | TES-06 | emulador | S |
| 64 | functions | `tests/db/handlers.test.ts` | apagar a conta anonimiza os pedidos e apaga as simulações do cliente | TES-06 | emulador | M |
| 65 | functions | `tests/db/push.test.ts` | um alerta interno nunca vai a telemóvel nenhum | TES-08 | emulador | S |
| 66 | functions | `tests/db/push.test.ts` | remove só o token que o Expo disse estar morto | TES-08 | emulador + fetch | M |
| 67 | functions | `tests/db/push.test.ts` | não repete o push de um alerta que já tem resultado registado | TES-08 | emulador | S |
| 68 | functions | `tests/db/events.test.ts` | lembra o evento de amanhã uma só vez e ignora o de hoje | TES-11 | emulador | M |
| 69 | functions | `tests/db/receipts.test.ts` | um recibo de erro sem token não remove nada quando o cliente tem vários | TES-23 | emulador + fetch | S |

### Prioridade 3 — i18n e validação na app (onda 3)

| # | Projeto | Ficheiro proposto | Nome do teste | O que prova | Infra | Esforço |
|---|---|---|---|---|---|---|
| 70 | app | `tests/i18n.test.ts` | todos os textos com valores mostram o valor, em PT e em EN | TES-18 | alias | S |
| 71 | app | `tests/i18n.test.ts` | nenhum texto está vazio em nenhum dos dois idiomas | TES-18 | alias | S |
| 72 | app | `tests/checkups.test.ts` | não oferece dias fechados nem antes da antecedência mínima | TES-13 | alias | S |
| 73 | app | `tests/checkups.test.ts` | recusa dias que não existem no calendário, como 31 de fevereiro | TES-15 | alias | S |
| 74 | app | `tests/checkups.test.ts` | o texto do horário é igual ao que o alerta e o backoffice escrevem | TES-14 | alias + casos partilhados | S |
| 75 | app | `tests/checkups.test.ts` | o cartão do Perfil escolhe primeiro o carro que espera decisão do cliente | TES-13 | alias | S |
| 76 | app | `tests/dates.test.ts` | "há 2 horas", "ontem" e "há 3 meses" nos limites de cada intervalo | TES-13 | alias | S |
| 77 | app | `tests/validation.test.ts` | aceita telemóveis escritos com espaços e indicativo e recusa com oito dígitos | TES-24 | alias | S |
| 78 | app | `tests/errors.test.ts` | password errada e email inexistente dão a mesma mensagem | TES-24 | alias | S |
| 79 | app | `tests/requestForms.test.ts` | o pedido guarda as opções em português mesmo com a app em inglês | TES-24 | alias | S |

### Prioridade 4 — Utilitários do backoffice (onda 3)

| # | Projeto | Ficheiro proposto | Nome do teste | O que prova | Infra | Esforço |
|---|---|---|---|---|---|---|
| 80 | backoffice | `src/utils/__tests__/format.test.ts` | o mesmo telemóvel escrito de quatro maneiras normaliza para o mesmo | TES-22 | nenhuma | S |
| 81 | backoffice | `src/data/__tests__/duplicates.test.ts` | uma ficha já juntada deixa de ser sugerida como duplicado | TES-16 | nenhuma | S |
| 82 | backoffice | `src/utils/__tests__/checkups.test.ts` | a disponibilidade sem doc cai no plano seg–sex com os sete dias explícitos | TES-22 | nenhuma | S |
| 83 | backoffice | `src/utils/__tests__/checkups.test.ts` | os dias abertos saltam feriados e dias fechados | TES-22 | nenhuma | S |
| 84 | backoffice | `src/utils/__tests__/checkups.test.ts` | os pedidos ordenam-se por dia e hora, com a manhã antes da tarde | TES-22 | nenhuma | S |
| 85 | backoffice | `src/utils/__tests__/followUp.test.ts` | dias fora de zero a 365 devolvem erro em vez de gravar | TES-17 | nenhuma | S |
| 86 | backoffice | `src/utils/__tests__/followUp.test.ts` | um chão nunca fica com oferta configurada | TES-17 | nenhuma | S |
| 87 | backoffice | `src/utils/__tests__/format.test.ts` | o estado do push é legível nos cinco casos que a Function escreve | TES-22 | nenhuma | S |

## Ondas e integração contínua

### Onda 1 — as regras (6 a 8 h, mais 1 h de instalação nos dois PCs)

Itens 1–30. No fim: qualquer alteração a `firestore.rules` passa a ser
verificada em ~20 segundos, localmente, antes de qualquer deploy. **Prova
que** nenhum cliente lê ou escreve nos dados de outro em nenhuma das nove
coleções, que a metade `isAdmin()` existe e funciona, e que as três
escritas de checkup e as criações de pedido e de simulação aceitam
exatamente o que a app envia. Apanha, à cabeça, a classe de erro que já
aconteceu uma vez (palavra reservada `service` a rebentar o deploy).
Depois desta onda, os casos de `scripts/check-firestore-auth.mjs` que
duplicam testes passam a ser redundantes e o script fica só como
verificação pós-deploy.

### Onda 2 — dinheiro e dados nas Functions (8 a 12 h)

Itens 31–69, pela ordem da tabela: primeiro os nove testes que não
precisam de infraestrutura nenhuma (consentimento, Cloudinary, email,
datas — 2 h para os nove), depois os que precisam do emulador. **Prova
que** os tectos que limitam a fatura do Vertex AI e o spam de pedidos
funcionam, que a retenção só apaga quem tem de apagar e só depois do
aviso, que nenhuma comunicação de marketing sai sem consentimento, e que
um alerta em lote nunca sai duas vezes.

### Onda 3 — app e backoffice (4 a 6 h)

Itens 70–87. Começa pela configuração do Vitest com os alias (TES-13),
que é o que destranca a onda inteira. **Prova que** os textos em inglês
mostram os valores, que o horário de checkup é o mesmo texto nos três
sítios, que os formulários validam o que dizem validar e que os
duplicados no backoffice se detetam.

### Integração contínua

Proposta (Sugestão, TES-26): um `.github/workflows/ci.yml` por
repositório, a correr em `push` para `master` e em pull requests — **não**
em todos os ramos `claude/*`, para não gastar minutos à toa.

```yaml
# marble-app/.github/workflows/ci.yml
on: { push: { branches: [master] }, pull_request: }
jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: npm ci
      - run: npm ci --prefix functions
      - run: npm run typecheck        # raiz + functions/src
      - run: npm test                 # vitest, sem emulador
      - run: npm run test:rules       # emulators:exec
```

No backoffice, o mesmo sem o Java e sem `test:rules`. **Custo:** 4 a 6
minutos por corrida; num repositório privado no plano gratuito do GitHub
são 2000 minutos/mês, ou seja folga de sobra para um projeto com este
ritmo de commits.

E, independentemente do CI (custa 2 minutos e vale por si): acrescentar
ao `CLAUDE.md`, em "Outras", que antes do commit se corre
`npm run typecheck` na raiz — e `npm test` quando os testes existirem.

## O que está bem

- **`firestore.rules` está escrito de forma testável.** As funções de
  validação (`validNewRequest`, `validNewSimulation`,
  `validNewCheckupRequest`, `ownerCheckupWrite`) são pequenas, nomeadas e
  isolam uma decisão cada — escrever os 30 casos da onda 1 é preencher um
  molde, não reconstruir a lógica. As `hasOnly`/`hasAll` e os
  `== request.time` dão asserções óbvias.
- **As Functions estão desenhadas para correr fora do Firebase.** `db` e
  `log` entram por parâmetro em **todos** os handlers; `index.ts` é só
  wiring (169 linhas sem uma decisão de negócio); as dependências
  externas são objetos `deps` injetáveis (`auth` em `retention.ts:27`,
  `cloudinary`/`email`/`dailyCap` em `requests.ts:58`, `vertex` em
  `simulations.ts:38`). `functions/src/scripts/runJobs.ts` é a prova de
  que funciona — a onda 2 é o mesmo padrão com o emulador em vez do dev.
- **Todos os jobs recebem `now: Date`.** Nenhum chama `new Date()` no
  meio da lógica, e o `runJobs.ts --now AAAA-MM-DD` já exercita isso. Os
  testes de janelas temporais (retenção, acompanhamento, tectos de 24 h)
  não precisam de `vi.useFakeTimers`.
- **A idempotência foi pensada em todos os pontos certos:**
  `processedAt` (`requests.ts:105`, `simulations.ts:185`),
  `newWorkNotifiedAt` (`handlers.ts:28`), `reminderSentAt`
  (`events.ts:33`), `n.push` (`push.ts:33`), as marcas `*At` do
  `followUp`. É pouco comum e vale o registo: os testes vão confirmar
  guardas que já existem, não montá-las.
- **`npx tsc --noEmit` passa nos dois repositórios**, com `strict: true`
  nos três tsconfigs e `noImplicitReturns` + `noUnusedLocals` nas
  Functions. O `Strings = typeof pt` transforma uma tradução em falta num
  erro de compilação — é uma verificação real, mesmo não sendo um teste.
- **Os scripts perigosos estão quase todos guardados.**
  `seed-firestore.mjs:38` recusa o prod; `checkup-admin.mjs:38`,
  `dev-token.mjs:25`, `migrate-work-tags.mjs:35` e
  `runJobs.ts:52` exigem `endsWith('-dev')`. Falta a mesma guarda só em
  `check-firestore-auth.mjs` (TES-20).
- **`scripts/check-firestore.mjs` e `check-firestore-auth.mjs` cobrem
  hoje ~20 casos reais de regras** — com as limitações de TES-01 e TES-20,
  mas não é zero, e os casos escritos migram quase tal e qual para
  `tests/rules/`.
- **Os limites vivem num sítio só e estão anotados como partilhados:**
  `REQUEST_LIMITS` (`src/firebase/models.ts:611`), `CHECKUP_LIMITS`
  (`:226`) e `SIMULATION_LIMITS` (`:746`), todos com o comentário "Se
  mudares aqui, muda lá" a apontar para as regras. Os testes das regras
  podem importar estas constantes em vez de repetir números.
- **O `.gitignore` já cobre o essencial** (chaves, `.env`, `functions/lib`,
  `firebase-debug.log`); só faltam `coverage/` e `firestore-debug.log`
  quando os testes entrarem.

## Não verificado

- **Não corri nenhum teste** — não existe nenhum para correr, e escrever
  testes está fora do âmbito desta corrida (só leitura).
- **Não consegui confirmar que o emulador do Firestore arranca neste PC:**
  não há Java (`java -version` → `command not found`) e instalá-lo estava
  fora do que me foi autorizado. A proposta da onda 1 assume que o
  emulador funciona depois do JDK instalado — é o comportamento normal do
  `firebase-tools`, mas não está verificado nesta máquina.
- **Não verifiquei o PC do escritório.** Tudo o que digo sobre ele é
  inferência a partir do `DEVELOPMENT.md` ("Segundo PC") e do
  `scripts/check-setup.mjs`, que não pergunta por Java. É preciso correr
  `java -version` lá para confirmar.
- **Não medi o tempo real de uma corrida do emulador** (arranque +
  `emulators:exec`). A estimativa de ~20 s por corrida das regras é a
  típica deste tipo de suite, não uma medição.
- **Os minutos de CI são uma estimativa**, não uma medição: 4–6 min por
  corrida em `ubuntu-latest` com `npm ci` em dois projetos, typecheck,
  vitest e o emulador. E não confirmei se os dois repositórios GitHub
  (`vampiregodric/marble-app` e `vampiregodric/marble.backoffice`) são
  privados nem qual é o plano — se forem públicos, os minutos são
  ilimitados e a questão não se põe.
- **Não verifiquei a paridade de placeholders entre `pt.ts` e `en.ts`
  função a função.** O `grep` só apanha arrows de uma linha (39 em PT, 40
  em EN) e as multilinha escapam-lhe — é exatamente por isso que TES-18
  propõe um teste em vez de uma verificação manual. Não afirmo que há uma
  divergência; afirmo que não há forma de saber.
- **Não testei nem confirmei o cenário de falha de `publicIdFromUrl`
  (TES-09) contra URLs reais do Cloudinary** — a análise é da expressão
  regular, não de dados. Por isso a correção proposta começa por escrever
  os casos com os URLs que a app gera hoje.
- **`../marble-backoffice/src/utils/` foi lido na íntegra, mas os
  componentes e páginas do backoffice não** (fora do âmbito), por isso não
  sei se alguma página tem lógica que devesse estar nos `utils` e ganhar
  teste com eles.
