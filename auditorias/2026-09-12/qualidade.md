# Auditoria 2026-09-12 — qualidade

## Âmbito

Lido (só leitura, sem alterações a nenhum ficheiro dos projetos):

- `src/**` — 72 ficheiros `.ts`/`.tsx`; `App.tsx`, `index.ts`.
- `functions/src/**` — 20 ficheiros `.ts`.
- `scripts/*.mjs` — 14.
- `../marble-backoffice/src/**` — 39 ficheiros `.ts`/`.tsx`;
  `../marble-backoffice/scripts/*.mjs` — 2.
- `firestore.rules` (só para cruzar enums e o filtro `published == true`),
  `CLAUDE.md`, `AGENTS.md`, `ROADMAP.md` (estados + "Notas para quem pega
  numa secção" + decisões das secções 3, 7, 8, 12b, 16), `DEVELOPMENT.md`
  (capítulo "Segundo PC" e nota sobre caminhos absolutos).

Commits: app `691938a`, backoffice `1c532f2`.

Ficou de fora (tem vertente própria): custo/latência das queries
(`desempenho`), cobertura de testes (`testes`), versões de dependências
(`dependencias`), desenho das regras (`seguranca`), bases legais (`rgpd`).
Não foram lidos linha a linha os ficheiros de conteúdo puro
(`src/i18n/pt.ts`, `en.ts`, `src/data/departmentContent.ts`,
`src/legal/texts.ts`) — só as partes referidas nos achados.

Comandos corridos (só verificação):

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` (raiz, TS 6.0.3) | OK, 0 erros |
| `npx tsc --noEmit -p functions` | **falha**: `TS5107 moduleResolution=node10 is deprecated` (ver QUA-02) |
| `functions/node_modules/.bin/tsc --noEmit` (TS 5.9.3) | OK, 0 erros |
| `npx tsc --noEmit -p ../marble-backoffice` | OK, 0 erros |
| `diff --strip-trailing-cr src/firebase/models.ts ../marble-backoffice/src/firebase/models.ts` | idênticos (só diferem CRLF/LF) |
| `grep` de cores à mão, literais PT em JSX, `Alert.alert`, `any`, `TODO`, `catch` vazio, `onSnapshot`, `setInterval`/`addEventListener` | ver achados |
| script próprio de exports sem importador (scratchpad) | 2 exports mortos reais (QUA-18) |

## Contagem

| Severidade | Achados |
|---|---|
| Crítico | 0 |
| Alto | 1 |
| Médio | 11 |
| Baixo | 9 |
| Sugestão | 3 |

## Achados

### QUA-01 — Pedido de orçamento fica com as fotos da simulação mortas ao fim de 90 dias
- **Vertente:** qualidade
- **Severidade:** Alto
- **Superfície:** app
- **Onde:** `src/screens/RequestQuoteScreen.tsx:238`, `functions/src/simulations.ts:285`, `functions/src/simulations.ts:77`, `../marble-backoffice/src/pages/RequestDetailPage.tsx:224`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o pedido guarda só os **URLs** da simulação
  (`ServiceRequest.simulation`), mas os ficheiros no Cloudinary pertencem ao
  doc `simulations/{id}` e são apagados com ele. A ligação que impede esse
  apagamento (`requestId`) é escrita com um `.catch(() => {})`, e o
  comentário ao lado afirma que falhar "não é grave — a cópia já está no
  pedido". Não está: a cópia é um link.
- **Cenário de falha:** o cliente envia um pedido com simulação anexada; a
  rede cai nos milissegundos entre `createRequest` e
  `attachSimulationToRequest`. O erro é engolido, o pedido chega à equipa
  completo. 90 dias depois `runSimulationRetention` apanha a simulação como
  "sem pedido" (`if (d.data().requestId) continue`), apaga o doc, e o
  trigger apaga os ficheiros pela tag `simulation_<id>`. A partir daí a
  página Pedidos do backoffice mostra duas imagens partidas. Mesmo efeito,
  sem erro nenhum, se o cliente apagar a simulação no Perfil: nada no
  simulador impede apagar uma simulação já anexada (`grep requestId
  src/screens/SimulatorScreen.tsx` não devolve nada).
- **Evidência:**
  ```ts
  // src/screens/RequestQuoteScreen.tsx:236-238
  // A simulação fica a apontar para o pedido (só o dono pode fazê-lo;
  // falhar aqui não é grave — a cópia já está no pedido).
  if (simulation) await attachSimulationToRequest(simulation.id, id).catch(() => {});
  ```
  ```ts
  // functions/src/simulations.ts:283-288
  for (const d of snap.docs) {
    summary.checked++;
    if (d.data().requestId) continue;
    await d.ref.delete();   // → handleSimulationWritten → deleteFilesByTag
  ```
- **Correção proposta:** (1) não engolir o erro — repetir a escrita ou
  registar o problema no pedido; (2) tornar o pedido independente do ciclo
  de vida da simulação: copiar o ficheiro para a tag `request_<id>` ao
  anexar (a Function já sabe apagar por essa tag), ou guardar em
  `simulations.requestId` do lado do servidor no `handleRequestCreated`
  (que já lê o pedido inteiro e corre com o Admin SDK, sem depender da rede
  do telemóvel):
  ```ts
  // functions/src/requests.ts, dentro de handleRequestCreated
  if (req.simulation?.id) {
    await db.collection('simulations').doc(req.simulation.id)
      .set({ requestId: req.id, updatedAt: ts }, { merge: true });
  }
  ```
  (3) no simulador, esconder ou avisar antes de apagar uma simulação com
  `requestId`.
- **Esforço:** M

---

### QUA-02 — `tsc -p functions` falha com o TypeScript da raiz
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/tsconfig.json:5`, `functions/package.json:22`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `functions/` fixa `typescript: ^5.9.0` enquanto a raiz
  já está no TypeScript 6. Qualquer comando corrido da raiz (`npx tsc
  --noEmit -p functions`, um CI futuro, esta auditoria) resolve o `tsc` 6 e
  aborta antes de verificar uma única linha. O código em si está bem: com o
  `tsc` local das Functions passa sem erros.
- **Cenário de falha:** alguém corre a verificação da raiz, vê "1 erro",
  e ou assume que as Functions estão partidas ou silencia o aviso com
  `ignoreDeprecations`. Em TypeScript 7 o `moduleResolution: node10` deixa
  de existir e o build das Functions parte de vez.
- **Evidência:**
  ```
  $ npx tsc --noEmit -p functions
  functions/tsconfig.json(5,25): error TS5107: Option 'moduleResolution=node10'
    is deprecated and will stop functioning in TypeScript 7.0.
  $ functions/node_modules/.bin/tsc --noEmit     # 0 erros
  ```
- **Correção proposta:** passar `functions/tsconfig.json` para
  `"module": "node16"` + `"moduleResolution": "node16"` (o runtime é Node
  22 e o `package.json` é CommonJS, por isso a mudança é compatível) e
  alinhar o `typescript` das Functions com o da raiz. Enquanto isso não
  acontece, documentar em `DEVELOPMENT.md` que a verificação das Functions
  é `npm --prefix functions run typecheck`, não `npx tsc -p functions`.
- **Esforço:** S

---

### QUA-03 — Erros do Firestore nunca chegam ao ecrã Início nem à página de departamento
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/screens/HomeScreen.tsx:111`, `src/screens/HomeScreen.tsx:114`, `src/screens/DepartmentScreen.tsx:46`, `src/screens/DepartmentScreen.tsx:278`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `useFirestoreList` devolve `{ data, loading, error }` e
  os hooks põem `data: []` quando o `onSnapshot` falha. O Início e a página
  de departamento destroem o `error` na desestruturação, por isso um erro de
  regras, de índice em falta ou de rede aparece como "não há nada" — no ecrã
  que toda a gente vê primeiro e que funciona sem conta.
- **Cenário de falha:** o índice composto de `featured`/`featuredOrder` não é
  publicado no prod no lançamento (Secção 11). O carrossel do Início fica
  vazio, os cartões de departamento sem foto, e nem o cliente nem o Fábio
  veem uma palavra sobre o motivo — o `ErrorState` existe e não é usado aqui.
- **Evidência:**
  ```ts
  // src/screens/HomeScreen.tsx:111-115
  const { data: featured, loading } = useFeaturedWorks(5);   // error descartado
  const { data: home } = useHomeSettings();                  // error descartado
  const covers = home?.departmentCovers ?? {};
  ```
  `grep "from '../components/ListState'" src/screens` → `ErrorState`
  importado só em Alertas, Eventos, Portfólio, Simulador e Detalhe. Início e
  Departamento ficam de fora.
- **Correção proposta:** ler o `error` nos dois ecrãs e mostrar o
  `ErrorState` que já existe (`src/components/ListState.tsx:*`), como faz o
  Portfólio (`src/screens/PortfolioScreen.tsx:171`). Como o carrossel é
  secundário, chega uma linha discreta em vez do ecrã inteiro.
- **Esforço:** S

---

### QUA-04 — Uma falha a carregar clientes trava os jobs de retenção do mesmo dia
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/jobs/index.ts:38`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o comentário do ficheiro promete "cada job apanha os
  seus próprios erros, para um falhar sem travar os outros", e o helper
  `run()` faz exatamente isso — mas o `await loadAppClients(db)` da linha 38
  está **fora** dele. Se essa leitura falhar, `runDailyJobs` lança e os
  quatro jobs seguintes (eventos, retenção de contas, retenção de pedidos,
  retenção de simulações) não correm.
- **Cenário de falha:** erro transitório do Firestore às 10:00 na leitura da
  coleção `clients` (que é lida inteira). Os jobs de RGPD — apagar contas
  inativas há 3 anos, anonimizar pedidos fechados há 12 meses, apagar
  simulações com 90 dias — ficam por correr nesse dia, e o `summary` que vai
  para os logs sai vazio em vez de assinalar quem falhou.
- **Evidência:**
  ```ts
  // functions/src/jobs/index.ts:36-40
  await run('receipts', () => runReceipts(db, log, deps.expoAccessToken));
  await run('followUps', () => runFollowUps(db, now, log));
  const clients = only && only !== 'events' && only !== 'retention' ? undefined : await loadAppClients(db);
  await run('events', () => runEventReminders(db, now, log, clients));
  await run('retention', () => runRetention(db, { auth: deps.auth, ... }, now, log, clients));
  ```
- **Correção proposta:** carregar os clientes dentro de um `run('clients', …)`
  (ou de um `try/catch` que ponha `clients = undefined` e registe o erro no
  `summary`), deixando `runEventReminders`/`runRetention` recarregarem se
  precisarem — os dois já aceitam `clients` opcional.
- **Esforço:** S

---

### QUA-05 — Fotos sobem para o Cloudinary antes do documento: se a escrita falhar ficam órfãs
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/screens/RequestQuoteScreen.tsx:200`, `src/screens/SimulatorScreen.tsx:167`, `functions/src/requests.ts:82`, `functions/src/simulations.ts:77`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** toda a limpeza do Cloudinary é disparada pelo
  **documento** (apagar `requests/{id}` ou `simulations/{id}` → apagar por
  tag). Mas os dois ecrãs sobem os ficheiros **antes** de criar o documento.
  Se a criação falhar, ficam ficheiros com a tag `request_<id>` /
  `simulation_<id>` sem doc que alguma vez os venha a apagar.
- **Cenário de falha:** o cliente escolhe 5 fotos, as fotos sobem, e o
  `createRequest` é recusado (regras, quota, rede). O ecrã mostra um erro, o
  cliente tenta outra vez — e gera um `newRequestId()` novo, com 5 ficheiros
  novos. Os primeiros 5 ficam para sempre no Cloudinary, com uma foto do
  chão ou do carro de uma pessoa identificável, sem prazo de retenção
  aplicável (a política promete que saem com o pedido).
- **Evidência:**
  ```ts
  // src/screens/RequestQuoteScreen.tsx:198-214
  const id = newRequestId();
  for (let i = 0; i < photos.length; i++) { ... uploaded.push(await uploadRequestPhoto(...)); }
  await createRequest(id, uid, { ... photos: uploaded, ... });   // se falha, ficheiros órfãos
  ```
  ```ts
  // functions/src/requests.ts:81-83 — a limpeza só existe a partir do doc
  if (!after) { if (before?.photos?.length) await cleanupPhotos(...); return; }
  ```
- **Correção proposta:** criar primeiro um doc mínimo (`status: 'draft'`) e
  só depois subir, ou apagar os ficheiros já enviados no `catch` do
  `submit` (o preset é unsigned, mas a app pode marcar o doc para a Function
  limpar). Alternativa mais barata e suficiente: um job diário que apague no
  Cloudinary as tags `request_*`/`simulation_*` com mais de 24 h sem doc
  correspondente — o `jobs/` já tem o sítio certo para isso.
- **Esforço:** M

---

### QUA-06 — "Apagar conta": se o segundo passo falhar, o cliente vê "falhou" com os dados já apagados
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/auth/AuthContext.tsx:285`, `src/auth/AuthContext.tsx:299`, `src/screens/DeleteAccountScreen.tsx:37`, `functions/src/handlers.ts:66`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `deleteAccount` anonimiza `clients/{uid}` e só depois
  chama `deleteUser`. A anonimização põe `deletedAt`, o que dispara
  imediatamente `handleClientUpdated` → `anonymizeClientRequests` +
  `deleteClientSimulations`. Se o `deleteUser` falhar, o ecrã apanha o erro e
  mostra "não foi possível" — mas os dados pessoais, os pedidos e as
  simulações já desapareceram, e a conta de Auth continua a existir e a
  poder entrar.
- **Cenário de falha:** rede a cair entre a escrita no Firestore e o
  `deleteUser` (ou `auth/network-request-failed`). O cliente lê "falhou",
  fecha a app convencido de que a conta continua igual, e volta a entrar
  para um perfil sem nome, sem telemóvel e sem histórico de pedidos.
- **Evidência:**
  ```ts
  // src/auth/AuthContext.tsx:284-299
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await updateDoc(clientRef(user.uid), { name: '', email: '', phone: '', ..., deletedAt: serverTimestamp() });
  await forgetPushToken(user.uid).catch(() => {});
  await deleteUser(user);    // se falha aqui, o doc já foi anonimizado
  ```
- **Correção proposta:** apanhar a falha do `deleteUser` à parte e dar-lhe a
  mensagem certa ("os teus dados já foram apagados; falta só remover o
  login — toca em tentar outra vez"), levando o ecrã ao estado `done` com um
  aviso em vez de um erro genérico. Repetir é seguro: a anonimização é
  idempotente e o `reauthenticate` continua a funcionar.
- **Esforço:** S

---

### QUA-07 — Uma falha a carregar fontes deixa a app presa no spinner
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `App.tsx:22`, `App.tsx:34`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `useFonts` devolve `[loaded, error]` e `loaded` só
  passa a `true` quando as fontes carregam (ver
  `node_modules/expo-font/build/FontHooks.d.ts`). O `App.tsx` ignora o
  segundo elemento e usa `if (!fontsLoaded) return <spinner/>` — sem saída.
- **Cenário de falha:** na app web (onde as fontes são pedidas à rede) ou
  numa instalação nativa com o asset corrompido, o cliente fica num ecrã
  preto com um indicador dourado a rodar para sempre, sem mensagem e sem
  forma de continuar. É o único caminho de entrada da app.
- **Evidência:**
  ```tsx
  // App.tsx:22-39
  const [fontsLoaded] = useFonts({ AlexBrush_400Regular, ... });
  if (!fontsLoaded) {
    return (<View style={styles.loading}><ActivityIndicator color={colors.gold} /></View>);
  }
  ```
- **Correção proposta:** `const [fontsLoaded, fontError] = useFonts(...)` e
  `if (!fontsLoaded && !fontError) return <spinner/>` — com erro, a app
  arranca com as fontes do sistema (fica feia, funciona) em vez de não
  arrancar. Registar o erro.
- **Esforço:** S

---

### QUA-08 — Três uploads quase iguais e a reescrita de URLs do Cloudinary copiada em quatro sítios, já divergente
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/media/cloudinary.ts:80`, `src/media/cloudinary.ts:104`, `src/media/cloudinary.ts:141`, `src/media/cloudinary.ts:64`, `functions/src/simulations.ts:101`, `functions/src/simulations.ts:172`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `uploadAvatar`, `uploadRequestPhoto` e
  `uploadSimulationPhoto` repetem o mesmo bloco (FormData, ramo web/nativo
  com o mesmo `as unknown as Blob`, preset, tags, tradução do erro
  "preset"). O formato dos URLs de entrega (`c_limit,w_1600,…` +
  `c_fill,w_480,h_360,…`) está escrito à mão em `uploadRequestPhoto`, em
  `simulationImage`, em `resultImage` das Functions e no
  `../marble-backoffice/src/media/cloudinary.ts`. E a função que retira o
  primeiro segmento de transformação **já divergiu**: a app testa
  `[cwhqfg]_` e as Functions `[cwhqfgl]_`.
- **Cenário de falha:** ao acrescentar um quarto tipo de upload (ou ao
  mudar a largura de entrega), há quatro sítios a alterar em três
  repositórios; falhar um dá miniaturas com proporção diferente entre a app
  e o backoffice, sem erro nenhum que o denuncie.
- **Evidência:**
  ```ts
  // src/media/cloudinary.ts:64      (app)
  if (/^(?:[a-z]{1,2}_[^/,]+)(?:,[a-z]{1,2}_[^/,]+)*$/.test(first) && /(^|,)[cwhqfg]_/.test(first)) {
  // functions/src/simulations.ts:101 (Functions) — repare no `l` a mais
  if (/^(?:[a-z]{1,2}_[^/,]+)(?:,[a-z]{1,2}_[^/,]+)*$/.test(first) && /(^|,)[cwhqfgl]_/.test(first)) rest = ...
  ```
- **Correção proposta:** uma só `uploadToCloudinary(localUri, { preset,
  tags, fileName })` em `src/media/cloudinary.ts`, com os três chamadores a
  passarem o preset e as tags; e um módulo partilhado (ou um teste que
  compare) para o formato dos URLs e para a reescrita do segmento de
  transformação, com a lista de prefixos numa constante única.
- **Esforço:** M

---

### QUA-09 — Prazos de retenção (promessa legal) duplicados entre a app e as Functions
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `src/legal/texts.ts:56`, `functions/src/requests.ts:27`, `functions/src/simulations.ts:24`, `functions/src/jobs/retention.ts:22`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os prazos que a política de privacidade promete ao
  cliente vivem em `RETENTION` (`inactiveAccountYears: 3`,
  `requestMonths: 12`, `simulationDays: 90`) e são reescritos à mão nas
  Functions como `INACTIVE_YEARS = 3`, `REQUEST_RETENTION_DAYS = 365`,
  `SIMULATION_RETENTION_DAYS = 90`. Nada liga os dois: hoje coincidem, mas
  mudar um número na política não muda o comportamento do job (nem o
  contrário), e nem sequer a unidade é a mesma (meses vs dias).
- **Cenário de falha:** o Fábio decide (ou um advogado exige) baixar para 6
  meses o prazo dos pedidos. Muda `RETENTION.requestMonths` — a política
  passa a dizer 6 meses, o HTML em `docs/legal/` é regenerado, e o job
  continua a anonimizar aos 365 dias. Promessa legal por cumprir, sem
  nenhum sinal.
- **Evidência:**
  ```ts
  // src/legal/texts.ts:65-68 — o que o cliente lê
  //   Pedidos …: dados pessoais apagados N meses depois de fechado
  requestMonths: 12,
  ```
  ```ts
  // functions/src/requests.ts:27 — o que o job faz
  export const REQUEST_RETENTION_DAYS = 365;
  ```
- **Correção proposta:** uma fonte só. O mais barato sem partilhar código
  entre repositórios: um `scripts/check-retention.mjs` (como os outros
  `check:*`) que leia `RETENTION` de `src/legal/texts.ts` e as constantes
  das Functions e falhe se não baterem certo, ligado ao `npm run check:*`
  que já existe. Melhor: mover `RETENTION` para `src/firebase/models.ts` (o
  ficheiro que já é copiado) e as Functions derivarem daí.
- **Esforço:** S

---

### QUA-10 — Datas de `<input type="date">` gravadas em UTC: o cliente fora de Portugal vê o dia errado
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/utils/dates.ts:60`, `../marble-backoffice/src/pages/WorkFormPage.tsx:179`, `../marble-backoffice/src/components/VehicleModal.tsx:54`, `src/utils/dates.ts:20`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `fromInput` faz `new Date(value)`. Com um
  `<input type="datetime-local">` ("2026-09-03T10:00") o JavaScript lê hora
  **local** — certo. Com um `<input type="date">` ("2026-09-03") lê
  **meia-noite UTC** — e é assim que se gravam `works.completedAt` e
  `vehicles.lastServiceAt`. A app formata depois com
  `d.getDate()/getMonth()` no fuso do telemóvel do cliente.
- **Cenário de falha:** a equipa marca um trabalho como concluído a
  2026-09-03; fica `2026-09-03T00:00:00Z`. Um cliente em Lisboa vê "3 Set"
  (ou 01:00, mesmo dia). Um cliente com o telemóvel no Brasil (UTC−3) — a
  app é bilingue e tem EN precisamente para clientes fora — vê "2 Set" no
  Detalhe do trabalho e no Portfólio. A ordenação `orderBy('completedAt')`
  também muda de dia.
- **Evidência:**
  ```ts
  // ../marble-backoffice/src/utils/dates.ts:60-63
  export function fromInput(value: string): Timestamp | null {
    if (!value) return null;
    const d = new Date(value);     // "2026-09-03" → 2026-09-03T00:00:00Z
    return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
  }
  ```
  Chamada com um campo de data em `WorkFormPage.tsx:313`
  (`<Input id="completedAt" type="date" …>`) e em
  `VehicleModal.tsx:173/179`. As Functions, ao contrário, são cuidadosas:
  `functions/src/time.ts:16` usa `Intl` com `timeZone: 'Europe/Lisbon'`.
- **Correção proposta:** em `fromInput`, quando o valor só tiver data,
  construir a partir dos componentes em hora local
  (`new Date(+y, +m - 1, +d)`) — ou, melhor, meio-dia local, que sobrevive a
  qualquer fuso na formatação. Uma função separada `fromInputDate` deixa a
  intenção explícita e não toca no caminho `datetime-local` dos eventos.
- **Esforço:** S

---

### QUA-11 — `auth-email-config.mjs --apply` não tem a guarda de projeto que todos os outros scripts têm
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** scripts
- **Onde:** `scripts/auth-email-config.mjs:22`, `scripts/auth-email-config.mjs:56`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `dev-token.mjs`, `checkup-admin.mjs`,
  `migrate-work-tags.mjs` recusam chaves cujo `project_id` não acabe em
  `-dev`, e o `seed-firestore.mjs` recusa as que contenham `prod`. O
  `auth-email-config.mjs` — o único que escreve na configuração do
  Identity Toolkit, isto é, nos emails que os clientes reais recebem — não
  verifica nada: aceita a chave que lhe derem e faz `PATCH` nesse projeto.
- **Cenário de falha:** com as duas chaves na mesma pasta, passar
  `serviceAccountKey.prod.json` por engano com `--apply` reescreve o
  `defaultLocale` e o `senderDisplayName` dos templates de "repor password"
  do **prod**. O script imprime o `project_id` — depois de já ter escrito.
- **Evidência:**
  ```js
  // scripts/auth-email-config.mjs:22-31 — nenhuma verificação de projeto
  const keyPath = args.find((a) => !a.startsWith('--'));
  const apply = args.includes('--apply');
  if (!keyPath) { console.error('Uso: …'); process.exit(1); }
  const key = JSON.parse(readFileSync(keyPath, 'utf8'));
  const auth = new GoogleAuth({ credentials: key, scopes: [...] });
  ```
  Comparar com `scripts/migrate-work-tags.mjs:35-38`:
  ```js
  if (!String(key.project_id).endsWith('-dev')) {
    console.error(`Recusado: a chave é de ${key.project_id}; …`); process.exit(1);
  }
  ```
- **Correção proposta:** extrair a guarda para um helper partilhado (ver
  QUA-16) e exigir `--prod` explícito para chaves que não acabem em `-dev`,
  imprimindo o `project_id` **antes** de escrever.
- **Esforço:** S

---

### QUA-12 — Cinco ficheiros-monstro concentram a maior parte do trabalho futuro
- **Vertente:** qualidade
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/screens/ProfileScreen.tsx:1`, `../marble-backoffice/src/pages/CheckupsPage.tsx:1`, `src/screens/SimulatorScreen.tsx:1`, `../marble-backoffice/src/pages/WorkFormPage.tsx:1`, `src/screens/RequestQuoteScreen.tsx:1`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** cinco ficheiros passam as 550 linhas e cada um junta
  leitura do Firestore, escrita, validação, formatação e UI no mesmo
  componente. O `ProfileScreen` é o pior: 682 linhas, 13 `useState` no
  componente de topo, e responsabilidades de cinco secções diferentes —
  dados pessoais, avatar (upload Cloudinary), consentimentos (RGPD),
  carros/chãos, agendamento de checkup, pedidos e simulações.
- **Cenário de falha:** qualquer secção nova que toque no Perfil (é o ecrã
  onde quase todas acabam por mexer) tem de reler 682 linhas e arrisca
  partir um estado que não percebeu. É também onde duas conversas em
  paralelo, em worktrees diferentes, vão colidir no merge.
- **Evidência:**
  ```
  682 src/screens/ProfileScreen.tsx
  747 ../marble-backoffice/src/pages/CheckupsPage.tsx
  635 src/screens/SimulatorScreen.tsx
  593 ../marble-backoffice/src/pages/WorkFormPage.tsx
  557 src/screens/RequestQuoteScreen.tsx
  ```
  `ProfileScreen.tsx:116-134`: `pendingPrefs`, `pendingMarketing`,
  `acceptingTerms`, `termsError`, `avatarMenu`, `uploading`, `avatarError`,
  `sheetVehicle`, `rowVehicle`, `cancelVehicle`, `checkupBusy`,
  `checkupError` — tudo no mesmo componente.
- **Correção proposta:** o `ProfileScreen` já tem as subcomponentes certas
  (`RequestRow`, `SimulationRow`) — continuar o mesmo movimento e extrair
  `<ProfileAvatar>`, `<ProfileConsents>` e `<ProfileVehicles>`, cada uma
  dona do seu estado. No `CheckupsPage` os modais já estão separados
  (`ApproveModal`, `ProposeModal`, `AvailabilityEditor`); falta tirá-los
  para ficheiros próprios. Não é urgente, mas é a dívida que mais vai custar
  nas secções seguintes.
- **Esforço:** L

---

### QUA-13 — Cores à mão em 23 ficheiros, contra a regra escrita do projeto
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/theme/theme.ts:1`, `src/components/Icons.tsx:7`, `src/screens/ProfileScreen.tsx:645`, `src/screens/HomeScreen.tsx:197`, `src/components/CheckupSheet.tsx:230`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o `ROADMAP.md` ("Notas para quem pega numa secção",
  linhas 1605-1606) diz "usa sempre esses tokens, não cores à mão". Há 23
  dos 24 ficheiros de ecrã/componente com cores escritas à mão. Não são
  desleixos isolados: são **tokens que faltam** no tema.
- **Cenário de falha:** mudar o dourado da marca obriga a percorrer 23
  ficheiros. Os alfas do preto já são 16 valores diferentes (0.05, 0.25,
  0.3, 0.35, 0.45, 0.55, 0.6, 0.65, 0.7, 0.72, 0.75, 0.85, 0.88, 0.9,
  0.92) para o mesmo efeito visual — sombreado sobre foto.
- **Evidência:**
  ```
  #0b0a08           27 ocorrências em 17 ficheiros  (texto/indicador sobre botão dourado)
  rgba(0,0,0,…)     30 ocorrências, 16 alfas diferentes
  rgba(198,161,91,…)10 ocorrências, 4 alfas          (= colors.gold com alfa)
  rgba(183,209,168,…)5 ocorrências                   (= colors.ok com alfa)
  src/components/Icons.tsx  12 repetições de #c6a15b / #6b6459 / #f3efe6 / #9c9587
  ```
  `src/theme/theme.ts` tem 14 cores e nenhuma delas é `#0b0a08`.
- **Correção proposta:** acrescentar ao tema `onGold: '#0b0a08'`,
  `scrim: { soft, medium, strong }` (três alfas, não dezasseis),
  `goldWash` e `okWash`, e passar os defaults de `Icons.tsx` a usar
  `colors.*`. É um achado só, não 84.
- **Esforço:** M

---

### QUA-14 — A lista dos seis departamentos existe em quatro cópias e já divergiu
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/data/departments.ts:29`, `../marble-backoffice/src/utils/departments.ts:18`, `functions/src/types.ts:166`, `firestore.rules:92`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a mesma lista de departamentos aparece quatro vezes:
  com nomes e taglines na app, com nomes e taglines no backoffice
  (`DEPARTMENTS`), só com nomes nas Functions (`DEPARTMENT_NAME`) e como
  enum nas regras. Já divergiu: o `xps` tem `category: 'Epoxy Floors'` na
  app e não tem no backoffice.
- **Cenário de falha:** hoje é inofensivo — o backoffice nunca lê
  `Department.category` (só `id` e `name`). Passa a doer no dia em que
  alguém acrescentar um departamento (a Inozetek já está prevista no
  `ROADMAP.md`, Secção 10): é preciso lembrar-se de quatro ficheiros em
  três repositórios, e esquecer as regras faz o pedido ser recusado no
  cliente sem explicação.
- **Evidência:**
  ```ts
  // src/data/departments.ts:35
  { id: 'xps', name: 'Xtreme Polishing Systems', tagline: …, category: 'Epoxy Floors', badge: … },
  // ../marble-backoffice/src/utils/departments.ts:26  — sem `category`
  { id: 'xps', name: 'Xtreme Polishing Systems', tagline: 'Buy your epoxy here' },
  ```
  ```
  firestore.rules:92
    && d.department in ['automotive', 'epoxy', 'graphic', 'ai', 'ads', 'xps']
  ```
- **Correção proposta:** os nomes e os `id` devem sair de
  `src/firebase/models.ts` (o ficheiro que já é copiado inteiro para o
  backoffice) — só a tagline e o selo ficam por repositório. Para as regras,
  um teste no `check:firestore` que confirme que o enum bate certo com
  `DepartmentId`.
- **Esforço:** S

---

### QUA-15 — Helpers e constantes copiados entre Functions, app e backoffice
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** functions
- **Onde:** `functions/src/requests.ts:67`, `functions/src/simulations.ts:63`, `../marble-backoffice/src/data/writes.ts:39`, `functions/src/requests.ts:182`, `functions/src/simulations.ts:246`, `src/components/Photo.tsx:26`, `../marble-backoffice/src/utils/format.ts:206`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** vários blocos idênticos, copiados:
  `clean()` (tira `undefined` antes de gravar) em três ficheiros de dois
  repositórios; `DAY_MS` em quatro (`functions/src/time.ts:5` já o
  **exporta** e mesmo assim `requests.ts:28`, `simulations.ts:25` e
  `src/data/simulations.ts:124` redeclaram-no); `alertDailyCap` +
  `GUARD_TEXTS.dailyCap` quase linha a linha iguais entre `requests.ts` e
  `simulations.ts` (~25 linhas); `variantFor` (`src/components/Photo.tsx:26`)
  byte a byte igual a `placeholderVariant`
  (`../marble-backoffice/src/utils/format.ts:206`).
- **Cenário de falha:** mudar o tecto diário para não avisar a equipa ao
  fim de semana obriga a mexer nos dois `alertDailyCap`; esquecer um deixa o
  comportamento dos pedidos e o das simulações diferentes, sem erro nenhum.
- **Evidência:**
  ```ts
  // functions/src/requests.ts:67-71  ==  functions/src/simulations.ts:63-67
  function clean(data: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) if (v !== undefined) out[k] = v;
    return out;
  }
  ```
  Também divergente: `SIMULATION_COST_EUR = 0.06`
  (`../marble-backoffice/src/utils/format.ts:159`) contra "≈ 0,05 € cada"
  em `functions/src/index.ts:63`.
- **Correção proposta:** `clean()` e `DAY_MS` para um
  `functions/src/util.ts` (e `time.ts` já serve para o segundo);
  `alertDailyCap` para um `dailyCapGuard(db, { doc, texts, … })` partilhado;
  `variantFor`/`placeholderVariant` para `models.ts`, que já é o ficheiro
  copiado entre os dois repositórios.
- **Esforço:** S

---

### QUA-16 — O arranque dos scripts está copiado em nove ficheiros, com guardas inconsistentes
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** scripts
- **Onde:** `scripts/seed-firestore.mjs:37`, `scripts/dev-token.mjs:24`, `scripts/checkup-admin.mjs:38`, `scripts/migrate-work-tags.mjs:34`, `scripts/demo-account.mjs:56`, `../marble-backoffice/scripts/dev-token.mjs:25`, `../marble-backoffice/scripts/set-admin.mjs:34`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o mesmo bloco (ler o `.json` da chave, validar o
  projeto, `initializeApp({ credential: cert(key) })`) está em nove
  scripts nos dois repositórios, com três guardas diferentes:
  `endsWith('-dev')` (a maioria), `includes('prod')`
  (`seed-firestore.mjs:38`) e nenhuma (`auth-email-config.mjs`, ver QUA-11;
  `set-admin.mjs`, que é o que dá acesso ao backoffice). O
  `../marble-backoffice/scripts/dev-token.mjs` é uma cópia do
  `scripts/dev-token.mjs` da app com um `base` diferente e mais uma
  verificação.
- **Cenário de falha:** uma chave de um projeto futuro chamado
  `marble-studios-staging` passa na guarda do `seed-firestore.mjs`
  (`includes('prod')` é falso) e o seed corre onde não devia.
- **Evidência:**
  ```js
  // scripts/seed-firestore.mjs:38
  if (String(serviceAccount.project_id).includes('prod')) { … }
  // scripts/migrate-work-tags.mjs:35 e outros 4
  if (!String(key.project_id).endsWith('-dev')) { … }
  // ../marble-backoffice/scripts/set-admin.mjs:34 — sem guarda nenhuma
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  ```
- **Correção proposta:** um `scripts/lib/admin.mjs` com
  `openProject(keyPath, { allow: 'dev' | 'any' })` que leia a chave,
  aplique sempre a mesma guarda (`endsWith('-dev')`, salvo `--prod`
  explícito) e devolva `{ db, auth, projectId }`. Os nove scripts passam a
  três linhas de arranque. Quanto ao que está bem: a validação dos
  argumentos com mensagem de uso e `exit 1` está em todos — isso é para
  manter.
- **Esforço:** M

---

### QUA-17 — Caminhos absolutos do PC de casa em ficheiros que vão para o git do backoffice
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/scripts/set-admin.mjs:16`, `../marble-backoffice/.claude/settings.json:22`, `../marble-backoffice/CLAUDE.md:7`, `../marble-backoffice/README.md:48`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** contraria uma decisão escrita há poucos dias.
  `DEVELOPMENT.md` (linhas 1598-1602) diz: *"Nada em `.claude/` nem nos
  scripts depende desse caminho desde 2026-09-12 — não voltes a escrever
  caminhos absolutos em ficheiros que vão para o git"*, e o `CLAUDE.md`
  repete-o na regra 4 de "Dois PCs". Isso foi feito no repositório da app
  (o `scripts/launch-main.mjs` descobre o checkout pelo git), mas o
  repositório do backoffice ficou de fora: os quatro ficheiros acima, todos
  versionados, ainda apontam para `C:\Users\VGodr\…`.
- **Cenário de falha:** no PC do escritório, o Claude lê o
  `.claude/settings.json` do backoffice e tenta usar
  `C:\Users\VGodr\Projects\marble-app\serviceAccountKey.dev.json`, que não
  existe — exatamente o problema que o kit "segundo PC" (commit `a8eed4c`)
  foi criado para resolver.
- **Evidência:**
  ```
  ../marble-backoffice/scripts/set-admin.mjs:16
  // A chave do dev vive em C:\Users\VGodr\Projects\marble-app\serviceAccountKey.dev.json
  ../marble-backoffice/.claude/settings.json:22
  "… running scripts/set-admin.mjs or scripts/dev-token.mjs with
   C:\\Users\\VGodr\\Projects\\marble-app\\serviceAccountKey.dev.json are routine."
  ```
  `git -C ../marble-backoffice ls-files` confirma que `.claude/settings.json`,
  `.claude/launch.json`, `scripts/set-admin.mjs` e `scripts/dev-token.mjs`
  estão versionados.
- **Correção proposta:** escrever "a chave do dev, na pasta `marble-app` ao
  lado deste repositório" e aceitar o caminho por argumento ou pela variável
  de ambiente que os scripts já recebem. Como a decisão é do Fábio, vale
  perguntar-lhe se quer estender o kit "segundo PC" ao backoffice ou
  registar no `DEVELOPMENT.md` que a regra é só da app. (Nota menor do
  mesmo tipo: os dois `.claude/launch.json` fixam
  `C:\Program Files\nodejs\node.exe` — não depende do utilizador, mas
  depende do Windows e de uma instalação por omissão.)
- **Esforço:** S

---

### QUA-18 — Código morto e exports que ninguém importa
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/data/notifications.ts:28`, `src/data/checkups.ts:140`, `src/components/PlaceholderThumb.tsx:5`, `src/media/cloudinary.ts:42`, `../marble-backoffice/src/pages/SamplesPage.tsx:114`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** dois hooks/funções exportados que nenhum ficheiro
  importa — `useUnreadCount` (o Alertas conta à mão em
  `AlertsScreen.tsx:33`) e `checkupActionable`. Mais um conjunto de
  `export` em funções usadas só dentro do próprio ficheiro
  (`avatarDeliveryUrl`, `simulationsInLastDay`, `sampleTagsLine` exportada
  de uma página). E um comentário obsoleto em inglês num projeto todo em
  português, a pedir uma coisa que já foi feita.
- **Cenário de falha:** quem chegar novo assume que `useUnreadCount` é o
  caminho certo para contar alertas por ler e passa a ter duas contagens
  com filtros diferentes (o hook exclui `team_alert`, o ecrã não).
- **Evidência:**
  ```ts
  // src/data/notifications.ts:28 — sem nenhum importador em src/, App.tsx ou index.ts
  export function useUnreadCount(uid: string | null | undefined): number {
  ```
  ```tsx
  // src/components/PlaceholderThumb.tsx:5
  // Stand-in for a real work photo. Swap for a real <Image> once photos are supplied.
  ```
  (as fotos reais existem desde a Secção 5; quem faz o fallback é
  `src/components/Photo.tsx`).
  Nota: `INOZETEK_CONTENT_PT` (`src/data/departmentContent.ts:351`) também
  não é importado, mas é **intencional** — o `ROADMAP.md` (Secção 10) diz
  que a Inozetek fica sem cartão até a parceria ser oficial. Não é achado.
- **Correção proposta:** apagar `useUnreadCount` e `checkupActionable` (ou
  usá-los no Alertas/Perfil), tirar o `export` de quem só é usado no próprio
  ficheiro, e reescrever o comentário do `PlaceholderThumb` em português a
  dizer o que a componente é hoje: o gradiente de reserva do `Photo`.
- **Esforço:** S

---

### QUA-19 — Tabelas de meses e dias da semana em quatro sítios, com um comentário que diz que são iguais
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** functions
- **Onde:** `functions/src/texts.ts:52`, `src/i18n/pt.ts:558`, `../marble-backoffice/src/utils/dates.ts:3`, `scripts/checkup-admin.mjs:46`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** quatro tabelas de meses abreviados, três grafias. O
  comentário das Functions afirma que são "as mesmas tabelas que a app
  (src/i18n/pt.ts e en.ts → `dates`)" — não são: a app usa maiúscula
  (`'Jan', 'Fev', 'Set'`), as Functions e o backoffice minúscula
  (`'jan', 'fev', 'set'`). A app compensa com uma bandeira à parte
  (`lowercaseMonthInSlot`) só para os textos de checkup baterem certo com os
  alertas.
- **Cenário de falha:** o cliente abre o alerta "Checkup agendado para seg,
  7 set" e, no Perfil, o mesmo trabalho aparece como "7 Set 2026". É só
  acabamento, mas foi preciso um campo extra no dicionário para o esconder —
  e a próxima pessoa vai acreditar no comentário e não na tabela.
- **Evidência:**
  ```ts
  // functions/src/texts.ts:51-54
  // As mesmas tabelas que a app (src/i18n/pt.ts e en.ts → `dates`): …
  const MONTHS: Record<Locale, string[]> = {
    pt: ['jan', 'fev', 'mar', …],
  ```
  ```ts
  // src/i18n/pt.ts:558
  monthsShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', …],
  ```
- **Correção proposta:** decidir uma grafia e pôr as duas tabelas
  (`monthsShort`, `weekdaysShort`) em `src/firebase/models.ts`, que já viaja
  para o backoffice; as Functions importam-nas ou o `check:*` compara-as.
  Entretanto, corrigir o comentário para dizer a verdade.
- **Esforço:** S

---

### QUA-20 — O log de erro do job diário imprime `[object Object]`
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** functions
- **Onde:** `functions/src/jobs/index.ts:33`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `summary[name]` é um objeto e está a ser interpolado
  num template literal, o que dá sempre `[object Object]`. A linha ao lado
  (o caso de sucesso) usa `JSON.stringify` — aqui esqueceu-se.
- **Cenário de falha:** um job falha e a linha que o `npm run
  functions:jobs` imprime na consola é `[followUps] ERRO [object Object]`.
  A mensagem real sobrevive no `summary` que vai para o `logger.info` da
  Cloud Function, mas quem está a correr os jobs localmente contra o dev —
  o caminho normal de depuração — fica sem ela.
- **Evidência:**
  ```ts
  // functions/src/jobs/index.ts:29-34
  summary[name] = await fn();
  log(`[${name}] ${JSON.stringify(summary[name])}`);
  } catch (err) {
    summary[name] = { error: err instanceof Error ? err.message : String(err) };
    log(`[${name}] ERRO ${summary[name]}`);      // → "[object Object]"
  ```
- **Correção proposta:** `log(\`[${name}] ERRO ${JSON.stringify(summary[name])}\`)`.
- **Esforço:** S

---

### QUA-21 — `as unknown as` a esconder tipos em quatro sítios
- **Vertente:** qualidade
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/media/cloudinary.ts:91`, `src/media/cloudinary.ts:113`, `src/media/cloudinary.ts:150`, `../marble-backoffice/src/pages/WorkFormPage.tsx:85`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os três primeiros são o mesmo truque do React Native
  (passar `{ uri, name, type }` onde o TypeScript espera um `Blob`) —
  legítimo, mas repetido três vezes em vez de estar numa função com o nome
  do problema. O quarto fabrica um `Timestamp` falso só para reutilizar a
  formatação:
  ```ts
  // ../marble-backoffice/src/pages/WorkFormPage.tsx:85
  return formatDate({ toDate: () => d } as unknown as Parameters<typeof formatDate>[0]);
  ```
- **Cenário de falha:** o objeto falso só tem `toDate`. Se `formatDate`
  passar a usar qualquer outro membro de `Timestamp` (`toMillis`,
  `seconds`), esta chamada rebenta em runtime sem o compilador dizer nada.
- **Evidência:** ver excerto acima; o `../marble-backoffice/src/utils/dates.ts:6`
  já protege com `typeof ts.toDate === 'function'`, o que confirma que o
  autor sabia que ali entram objetos que não são `Timestamp`.
- **Correção proposta:** no backoffice, dar ao `formatDate` uma variante
  `formatJsDate(d: Date)` e chamá-la — o cast desaparece. Na app,
  `function fileForUpload(uri: string, name: string): Blob` com o cast lá
  dentro e o comentário que explica porquê, chamada pelos três uploads
  (encaixa na correção do QUA-08).
- **Esforço:** S

---

### QUA-22 — Adotar ESLint (registo único, como pede a metodologia)
- **Vertente:** qualidade
- **Severidade:** Sugestão
- **Superfície:** app
- **Onde:** `package.json:1`, `functions/package.json:1`, `../marble-backoffice/package.json:1`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** nenhum dos três repositórios tem linter. Metade dos
  achados Baixo acima (`error` descartado na desestruturação, `export` sem
  importador, `[object Object]` no template literal, dependências de
  `useEffect`) são exatamente o que um linter apanha de borla.
- **Cenário de falha:** a cada secção nova, o mesmo tipo de descuido volta e
  só é apanhado numa auditoria como esta.
- **Evidência:** `grep -l eslint package.json functions/package.json
  ../marble-backoffice/package.json` não devolve nada; não há
  `eslint.config.*` em nenhum dos três.
- **Correção proposta:** configuração mínima, uma por repositório:
  ```
  npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
  # eslint.config.mjs: js.configs.recommended + tseslint.configs.recommended
  #   + reactHooks.configs['recommended-latest']
  # regras que apanhariam os achados de hoje:
  #   '@typescript-eslint/no-floating-promises': 'error'
  #   'no-unused-vars' / '@typescript-eslint/no-unused-vars': 'warn'
  #   'react-hooks/exhaustive-deps': 'warn'
  ```
  Sem prettier nem regras de estilo — o projeto já é consistente e o
  objetivo é apanhar defeitos, não formatar.
- **Esforço:** S

---

### QUA-23 — Partilhar `models.ts` em vez de o copiar à mão
- **Vertente:** qualidade
- **Severidade:** Sugestão
- **Superfície:** backoffice
- **Onde:** `src/firebase/models.ts:1`, `../marble-backoffice/src/firebase/models.ts:1`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** 754 linhas de modelo copiadas à mão entre dois
  repositórios. Hoje estão **exatamente iguais** (verificado com
  `diff --strip-trailing-cr`) — o que é um bom sinal de disciplina — mas a
  igualdade depende de alguém se lembrar, e nada avisa quando deixar de o
  ser. É o ficheiro de que mais coisas dependem nos dois lados.
- **Cenário de falha:** uma secção acrescenta um campo à app e esquece o
  backoffice; a página que devia mostrá-lo compila na mesma e mostra vazio.
- **Evidência:**
  ```
  $ diff --strip-trailing-cr src/firebase/models.ts ../marble-backoffice/src/firebase/models.ts
  IDENTICOS (só diferem nos fins de linha)
  ```
- **Correção proposta:** o mais barato e no espírito do projeto (nada de
  monorepo nem de publicar no npm): um `npm run check:models` que compare o
  hash dos dois ficheiros ignorando CRLF e diga qual está atrasado — a
  correr junto do `check:setup`, que o Fábio já corre ao mudar de PC. Se um
  dia valer a pena, um submódulo git com `models.ts` + `departments` +
  `RETENTION` resolve QUA-09, QUA-14, QUA-15 e QUA-19 de uma vez.
- **Esforço:** S

---

### QUA-24 — O padrão das Cloud Functions é o que deve mandar no resto
- **Vertente:** qualidade
- **Severidade:** Sugestão
- **Superfície:** functions
- **Onde:** `functions/src/index.ts:93`, `functions/src/handlers.ts:23`, `src/data/firestoreHooks.ts:32`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** não está mal — está bem, e vale a pena escrevê-lo como
  regra. `functions/src/index.ts` é só wiring (12 linhas de configuração e
  um handler por trigger) e toda a lógica são funções puras que recebem
  `db`, `now` e `log` como argumentos. É por isso que os jobs se conseguem
  correr localmente contra o dev sem deploy (`functions:jobs`), e é o único
  sítio do projeto onde a lógica é testável sem montar UI.
- **Evidência:**
  ```ts
  // functions/src/index.ts:102-106
  export const onWorkWritten = onDocumentWritten('works/{id}', async (event) => {
    const before = …; const after = …;
    await handleWorkWritten(getFirestore(), before, after, new Date(), log);
  });
  ```
- **Correção proposta:** escrever esta regra no `DEVELOPMENT.md` ("lógica em
  funções puras com `db`/`now`/`log` injetados; o ficheiro do trigger/ecrã
  só liga as pontas") e aplicá-la aos ecrãs grandes do QUA-12: as regras de
  decisão do Perfil e do simulador podem sair para `src/data/*.ts` como
  funções puras sobre `Vehicle`/`Simulation`, exatamente como já acontece em
  `src/data/checkups.ts` (`checkupState`, `checkupOptions`) e
  `src/data/works.ts` (`workTags`, `brandOptions`). Quando a vertente
  `testes` chegar, é o que torna os testes possíveis.
- **Esforço:** S

---

## O que está bem

Verificado nesta corrida — não é preciso voltar a olhar:

- **Os três projetos compilam sem um único erro de tipos** (com o `tsc` de
  cada um): raiz com TS 6.0.3, `functions/` com o TS 5.9.3 local,
  `../marble-backoffice` com o da raiz.
- **Zero `any` em todo o código.** O grep de `\bany\b` em `src/`,
  `functions/src` e `../marble-backoffice/src` só devolve a palavra inglesa
  dentro de textos de UI. Os únicos casts são quatro `as unknown as`
  (QUA-21).
- **Zero `TODO`/`FIXME`/`HACK`/`XXX`** em código nos três repositórios.
- **Zero `catch` vazio ou que só faça `console.log`.** Todos os
  `.catch(() => {})` que existem estão comentados a explicar porque falhar
  ali não importa (tokens de push, `openSettings`, marcar um alerta como
  lido). A única exceção com consequência é o QUA-01.
- **Os dois `models.ts` estão byte a byte iguais** (só CRLF vs LF).
  `functions/src/types.ts` é um subconjunto declarado como tal, mais
  permissivo nos campos opcionais — e os leitores tratam a ausência
  (`src/screens/ProfileScreen.tsx:200-204` põe os defaults de
  `notificationPrefs`).
- **Os dois `onSnapshot` genéricos têm `onError`**
  (`src/data/firestoreHooks.ts:44` e `:68`,
  `../marble-backoffice/src/data/hooks.ts:24` e `:52`), e o do backoffice
  traduz os códigos do Firestore para português
  (`firestoreErrorMessage`, `hooks.ts:62`). Nenhum ecrã abre `onSnapshot`
  diretamente.
- **Todas as queries e referências passadas aos hooks estão memoizadas**
  com `useMemo` (verificado nos 9 ficheiros de `src/data/` e no
  `DataContext.tsx` do backoffice) — não há religação de escutas a cada
  render.
- **Todas as queries em `works` e `samples` incluem
  `where('published', '==', true)`**, como as regras exigem
  (`src/data/works.ts:19` e `:31`, `src/data/samples.ts:14`), e o motivo
  está comentado nos dois ficheiros.
- **A lição do `fromCache` (2026-09-10) está aplicada e explicada**:
  `src/auth/AuthContext.tsx:174-185` só recria o doc do cliente quando o
  **servidor** confirma que não existe, com o comentário a dizer o que
  aconteceu à conta do Fábio. É o único sítio do código com um "criar se não
  existe".
- **Os idiomas estão garantidos pelo compilador**: `Strings = typeof pt`
  (`src/i18n/types.ts:3`) faz de `en.ts` uma obrigação — falta uma chave e o
  `tsc` falha. Não há um único texto de UI à mão nos ecrãs (o grep de
  literais com acentos em JSX devolve um `×`), nem um único `Alert.alert`.
- **`functions/src/index.ts` é só wiring e os handlers são funções puras**
  com `db`, `now` e `log` injetados — ver QUA-24. Os dois triggers que podem
  repetir (`handleRequestCreated:104`, `handleSimulationCreated:185`)
  releem o doc e saem se já foi processado.
- **Todos os `useEffect` com subscrição ou temporizador têm cleanup**
  (`HomeScreen.tsx:135-152`, `usePushPermission.ts:20`,
  `onboarding.ts:37`, `../marble-backoffice/src/App.tsx:45`).
- **Os scripts validam os argumentos** — todos os 14 imprimem o uso e saem
  com `exit 1` quando falta a chave ou o comando — e a maioria recusa chaves
  do prod (as exceções são o QUA-11 e o QUA-16).
- **`src/data/localPhotos.ts` não deixou referências**: só aparece em
  `DEVELOPMENT.md` e `ROADMAP.md`, a registar que foi apagado.
- **Padrões a seguir no resto do projeto:** `src/data/firestoreHooks.ts`
  (estado `{data, loading, error}` uniforme), `src/data/checkups.ts` e
  `src/data/works.ts` (lógica de negócio em funções puras, longe da UI),
  `functions/src/handlers.ts` (dependências injetadas),
  `src/components/ListState.tsx` (os três estados de uma lista num sítio só)
  e `src/i18n/types.ts` (tradução garantida pelo compilador).

## Não verificado

- **Nenhum dos `.tsx` dos ecrãs e páginas foi lido linha a linha.** Foram
  lidos inteiros `AuthContext.tsx`, `firestoreHooks.ts`, `Photo.tsx`,
  `cloudinary.ts` (app), `hooks.ts`, `DataContext.tsx`, `format.ts`,
  `writes.ts` (backoffice) e os 9 ficheiros das Functions relevantes; os
  ecrãs grandes (`ProfileScreen`, `SimulatorScreen`, `DepartmentScreen`,
  `CheckupsPage`, `WorkFormPage`, `SamplesPage`) foram lidos por excertos e
  por grep dirigido. Pode haver defeitos locais nas partes não lidas.
- **`src/i18n/pt.ts`, `en.ts` e `src/data/departmentContent.ts` não foram
  revistos como texto** (erros de tradução, tom, coerência PT/EN) — só a
  estrutura de chaves, que o compilador já garante.
- **Nada foi executado contra o Firebase.** As conclusões sobre o que
  acontece em runtime (QUA-01 aos 90 dias, QUA-05 com upload falhado,
  QUA-06 com `deleteUser` a falhar) vêm da leitura do código dos dois lados,
  não de um teste — o modo da auditoria é só leitura.
- **`npm outdated` / `npm audit` não foram corridos** — são da vertente
  `dependencias`.
- **O impacto de desempenho das leituras completas de coleções**
  (`handleWorkWritten:29` lê todos os `clients`; `DataContext` carrega tudo
  em todas as páginas) foi notado mas não medido nem reportado aqui — é da
  vertente `desempenho`, e nos dois casos há um comentário a dizer que a
  decisão foi consciente.
- **As regras de `firestore.rules` só foram cruzadas para dois pontos**
  (o filtro `published` e os enums duplicados); a sua correção é da vertente
  `seguranca`.
