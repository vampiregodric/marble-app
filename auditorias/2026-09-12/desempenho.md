# Auditoria 2026-09-12 — desempenho

## Âmbito

Lido, só leitura, sem correr a app, o backoffice, deploys ou profilers.
App em `C:\Users\VGodr\Projects\marble-app` (commit `691938a`, árvore limpa);
backoffice em `C:\Users\VGodr\Projects\marble-backoffice` (commit `1c532f2`).

Ficheiros lidos:

| Zona | Ficheiros | O que se procurou |
|---|---|---|
| `src/data/` | 11 (`works`, `events`, `notifications`, `requests`, `vehicles`, `simulations`, `settings`, `samples`, `checkups`, `categories`, `departments`) + `firestoreHooks.ts` | inventário de queries, limites, filtros em memória |
| `src/firebase/` | `app.ts`, `config.ts`, `models.ts`, `authInstance{,.native}.ts` | cache do Firestore, campos de imagem dos modelos |
| `src/screens/` | os 9 ecrãs com listas ou imagens (Home, Portfolio, Department, WorkDetail, Alerts, Events, Profile, Simulator, RequestQuote) | leituras por abertura, listas, cálculos no render |
| `src/components/` | `Photo`, `Avatar`, `WorkGallery`, `MediaViewer`, `PhotoPicker`, `PlaceholderThumb`, `CheckupSheet`, `ListState` | tamanho das imagens, montagem da galeria, escutas |
| `src/media/`, `src/i18n/`, `src/auth/`, `src/utils/`, `src/theme/`, `App.tsx`, `src/navigation/RootNavigator.tsx` | 14 | URLs do Cloudinary, redução antes do upload, fontes, memoização do contexto |
| `functions/src/` | 20 (todos) | importações de arranque, custo do job diário, N+1, triggers |
| Configuração | `firestore.indexes.json`, `firestore.rules`, `package.json` (app, functions), `app.config.js` | índices vs. queries; que queries as regras permitem |
| Backoffice | `data/DataContext.tsx`, `data/hooks.ts`, `data/duplicates.ts`, `media/cloudinary.ts`, `components/{ui,MediaUploader}.tsx`, `App.tsx`, `vite.config.ts` e as 8 páginas de lista | subscrições, tabelas sem paginação, miniaturas, bundle |
| Build do backoffice | `dist/assets/` | tamanhos reais |

Ficou de fora, e porquê: `scripts/` da app e do backoffice (ferramentas da
equipa, correm à mão e não estão no caminho quente); `docs/` (páginas
estáticas de HTML, sem JS da app); `src/legal/`, `src/data/departmentContent.ts`
e `src/data/requestForms.ts` (constantes de texto, lidas só para confirmar
que não fazem trabalho no render). Não há build da app web publicada, por
isso o peso do bundle da app (web) **não** foi medido — só estimado pelas
dependências.

Comandos corridos (todos de leitura):

| Comando | Resultado em uma linha |
|---|---|
| `git log -1` (app / backoffice) | `691938a` (2026-09-12) / `1c532f2` (2026-09-10) |
| `ls -la dist/assets` (backoffice) | um só `index-BBIni1hL.js` de 983 121 B e um `index-BgUS2BXv.css` de 16 128 B |
| `gzip -c dist/assets/*.js \| wc -c` | 295 854 B (≈ 289 KB) de JS comprimido; CSS 3 965 B |
| `ls -la` dos `.ttf` em `node_modules/@expo-google-fonts` | as 9 faces carregadas no arranque somam 785 240 B |
| `du -sk functions/node_modules/google-auth-library …` | 3,1 MB com as transitivas (`gaxios`, `gcp-metadata`, `gtoken`, `jws`) |
| `ls -la assets/` (app) | `logo.png` 191 807 B, `splash-icon.png` 153 176 B, `icon.png` 91 403 B |
| `grep -ro "fonts\.<token>"` em `src/` | `script` 0 usos, `eyebrowLight` 0 usos, `bodyMedium` 1, `eyebrow` 80, `body` 82 |

**Tudo o que se segue são estimativas lidas do código, não medições.** Não
foi corrido nenhum profiler, nem contadas leituras reais na consola do
Firebase. Onde há números de KB de imagem são ordens de grandeza típicas de
uma entrega Cloudinary (`q_auto,f_auto`), não medições destes ficheiros.

## Contagem

| Severidade | Achados |
|---|---|
| Crítico | 1 |
| Alto | 3 |
| Médio | 7 |
| Baixo | 4 |
| Sugestão | 5 |

## Inventário de queries

### App do cliente (`src/data/`)

| # | Coleção | Filtros | Ordem | Limite | Tipo | Onde vive | Índice |
|---|---|---|---|---|---|---|---|
| 1 | `works` | `published == true` | `completedAt desc` | **nenhum** | escuta | Portfólio (`PortfolioScreen:43`) e página de departamento (`DepartmentScreen:46`) | composto #1 ✓ |
| 2 | `works` | `featured == true`, `published == true` | `featuredOrder asc` | 5 | escuta | Início (`HomeScreen:111`) | composto #2 ✓ |
| 3 | `works/{id}` | — | — | — | escuta de doc | Detalhe, Simulador | — |
| 4 | `events` | — (coleção inteira) | `date desc` | **nenhum** | escuta | Eventos (`EventsScreen:26`) | automático ✓ |
| 5 | `notifications` | `clientId == uid` | `createdAt desc` | 100 | escuta | Alertas (`AlertsScreen:32`) | composto #3 ✓ |
| 6 | `vehicles` | `clientId == uid` | `createdAt desc` | **nenhum** | escuta | Perfil (`ProfileScreen:106`) | composto #4 ✓ |
| 7 | `requests` | `clientId == uid` | `createdAt desc` | 20 | escuta | Perfil (`ProfileScreen:110`) | composto #5 ✓ |
| 8 | `simulations` | `clientId == uid` | `createdAt desc` | 30 | escuta | Perfil, Simulador | composto #6 ✓ |
| 9 | `simulations/{id}` | — | — | — | escuta de doc | Simulador (resultado em tempo real) | — |
| 10 | `samples` | `published == true` | — (ordem em memória) | **nenhum** | escuta | Simulador e bloco do simulador na página de departamento | automático ✓ |
| 11 | `settings/home` | — | — | — | escuta de doc | Início, página de departamento | — |
| 12 | `settings/checkups` | — | — | — | escuta de doc | `CheckupSheet` (sempre montado no Perfil) | — |
| 13 | `clients/{uid}` | — | — | — | escuta de doc | `AuthContext:167` | — |

Sem limite: #1 (`works`), #4 (`events`), #6 (`vehicles` — mas por cliente,
naturalmente pequena) e #10 (`samples`). Só a #1 cresce com o negócio inteiro.

### Backoffice (`../marble-backoffice/src/data/DataContext.tsx`)

| # | Coleção | Ordem | Limite | Linha |
|---|---|---|---|---|
| 14 | `works` | `completedAt desc` | **nenhum** | `DataContext.tsx:41` |
| 15 | `events` | `date desc` | **nenhum** | `DataContext.tsx:42` |
| 16 | `clients` | `createdAt desc` | **nenhum** | `DataContext.tsx:43` |
| 17 | `vehicles` | `createdAt desc` | **nenhum** | `DataContext.tsx:44` |
| 18 | `notifications` | `createdAt desc` | 400 | `DataContext.tsx:46` |
| 19 | `requests` | `createdAt desc` | 500 | `DataContext.tsx:55` |
| 20 | `samples` | `createdAt desc` | **nenhum** | `DataContext.tsx:59` |
| 21 | `simulations` | `createdAt desc` | 500 | `DataContext.tsx:61` |
| 22 | `settings/home`, `settings/checkups` | — | — | `DataContext.tsx:57`, `CheckupsPage.tsx:45` |

Todas montadas de uma vez no `DataProvider`, para a sessão inteira. Pela
metodologia isto **não é achado** enquanto forem dezenas de documentos — o
limiar está em DES-16.

### Cloud Functions (`functions/src/`)

| # | Coleção | Filtros | Limite | Onde | Índice |
|---|---|---|---|---|---|
| 23 | `clients` | — (coleção inteira) | **nenhum** | `handlers.ts:29` (ao publicar um trabalho), `jobs/events.ts:18` (job diário) | — |
| 24 | `works` | `followUp.active == true` | **nenhum** | `jobs/followUps.ts:45` | automático ✓ |
| 25 | `works` | `vehicleId == x`, `followUp.active == true` | **nenhum** | `handlers.ts:101` | dois `==` → merge automático ✓ |
| 26 | `notifications` | `push.pendingReceipt == true` | 500 | `jobs/receipts.ts:15` | automático ✓ |
| 27 | `events` | `date >= …`, `date <= …` | **nenhum** (janela de 4 dias) | `jobs/events.ts:26` | automático ✓ |
| 28 | `vehicles` + `works` | — (**as duas coleções inteiras**) | **nenhum** | `jobs/retention.ts:50` | — |
| 29 | `requests` | `status == 'closed'` | **nenhum** | `requests.ts:234` | automático ✓ |
| 30 | `requests` | `clientId == x` | **nenhum** | `requests.ts:219` | automático ✓ |
| 31 | `requests` | `clientId == x` + `createdAt desc` | 5 | `requests.ts:112` | composto #5 ✓ |
| 32 | `requests` | `createdAt >= …` (agregação `count()`) | — | `requests.ts:128` | automático ✓ |
| 33 | `simulations` | `createdAt <= cutoff` | **nenhum** | `simulations.ts:282` | automático ✓ |
| 34 | `simulations` | `clientId == x` + `createdAt desc` | 11 | `simulations.ts:192` | composto #6 ✓ |
| 35 | `simulations` | `createdAt >= …` (agregação `count()`) | — | `simulations.ts:207` | automático ✓ |
| 36 | `simulations` | `clientId == x` / `requestId == x` | **nenhum** | `simulations.ts:262`, `:271` | automático ✓ |

**Índices: não falta nenhum.** Cruzei as 36 queries com os seis índices
compostos de `firestore.indexes.json` e com as regras de indexação
automática (um índice por campo em ASC e DESC, `fieldOverrides` vazio, e
merge de índices simples para queries só com igualdades, caso da #25).
Nenhuma query junta um `where` de igualdade com um `orderBy` noutro campo
sem o índice correspondente. Ver "O que está bem".

## Caminho quente → custo (estimativa por abertura de ecrã, cache fria)

`W` = trabalhos publicados, `E` = eventos, `S` = amostras publicadas,
`V` = carros/chãos do cliente.

| Ecrã | Documentos lidos | Imagens descarregadas | Tamanho da imagem pedido vs. espaço no ecrã |
|---|---|---|---|
| Início | 5 + 1 = **6** | 5 do carrossel + 6 capas de departamento | 1 000 px num slot de ~375 px; capas usam `thumbnailUrl` (480 px) ✓ |
| **Portfólio** | **W** | **W** | **1 600 px em cartões de ~170 × 148 px** |
| Departamento | **W + S + 1** | 1 (topo) + 6 recentes + 4 amostras | 1 600 px em cartões de 156 × 110; amostras em `thumbnailUrl` ✓ |
| Detalhe | 1 | **todos os itens de `media[]` de uma vez** | 1 600 px num herói de ~375 × 281 (aceitável); mas todos ao mesmo tempo |
| Eventos | **E** | E (só o filtro ativo) | 1 600 px em cartões de 110 px de altura |
| **Alertas** | ≤ 100 | **≤ 100** | **1 600 px em miniaturas de 44 × 44 px** |
| Perfil | V + 20 + 30 + 2 ≈ **V + 52** | V + 30 | veículos a 1 600 px; simulações em `thumbnailUrl` ✓ |
| Simulador | S + 30 (+1) | S + comparação | amostras em `thumbnailUrl` ✓ |

O ecrã que mais lê por abertura é o **Portfólio** (e, logo a seguir, a
página de departamento, que lê a mesma coleção mais as amostras). O ecrã
que mais **dados** gasta é **Alertas**: 100 imagens de 1 600 px em caixas
de 44 px são da ordem de 25 MB para mostrar 0,2 MB de píxeis úteis.

## Achados

### DES-01 — Portfólio e páginas de departamento leem a coleção `works` inteira a cada abertura
- **Vertente:** desempenho
- **Severidade:** Crítico
- **Superfície:** app
- **Onde:** `src/data/works.ts:19`, `src/screens/PortfolioScreen.tsx:43`, `src/screens/DepartmentScreen.tsx:46`
- **Confiança:** confirmado
- **O que está mal:** `usePublishedWorks()` é uma escuta sobre `works` com
  `where('published','==',true)` e `orderBy('completedAt','desc')` **sem
  `limit`**. Devolve todos os trabalhos publicados que existirem, e todo o
  filtro (categoria, serviço, marca) é feito em memória. A mesma query é
  usada no Portfólio e em cada uma das quatro páginas de departamento com
  categoria.
- **Cenário de falha:** com 400 trabalhos publicados, abrir o Portfólio lê
  400 documentos e arranca 400 downloads de imagem; abrir a página de um
  departamento a partir do Início faz o mesmo. Com 500 clientes a abrir o
  Portfólio três vezes por dia são ~600 000 leituras/dia só nesta query. O
  custo em euros continua baixo (~0,36 €/dia), mas a memória e o tempo até
  o ecrã pintar crescem linearmente e sem tecto — e cada arranque a frio
  paga tudo outra vez, porque o SDK não tem cache persistente (DES-13).
- **Evidência:**
  ```ts
  // src/data/works.ts:18-21
  export function usePublishedWorks(): ListState<Work> {
    const q = useMemo(() => query(worksCol, where('published', '==', true), orderBy('completedAt', 'desc')), []);
    return useFirestoreList<Work>(q);
  }
  ```
  Comparar com `useFeaturedWorks(max = 5)` logo a seguir (linha 27-40), que
  já leva `limit(max)`, e com `useNotifications(uid, max = 100)`.
- **A que escala começa a doer:** hoje são dezenas de trabalhos e não custa
  nada. Acima de ~80–100 trabalhos publicados já se nota o primeiro pintar
  do Portfólio num telemóvel médio; acima de ~300 é um ecrã que demora
  segundos e ocupa dezenas de MB (DES-02 e DES-03 multiplicam isto).
- **Correção proposta:** paginar. `limit(30)` na primeira página e
  `startAfter(last)` ao chegar ao fim da grelha; a contagem do cabeçalho
  (`T.portfolio.count(works.length)`) passa a vir de
  `getCountFromServer(query(worksCol, where('published','==',true)))`, que
  custa uma leitura. Os filtros por categoria/serviço/marca passam a ser
  queries (`where('category','==',…)`), o que exige dois índices compostos
  novos (`category`+`completedAt`, e `services array-contains`+`completedAt`).
  Esboço mínimo, sem mexer nos filtros, que já corta o pior:
  ```ts
  export function usePublishedWorks(max = 60): ListState<Work> {
    const q = useMemo(
      () => query(worksCol, where('published', '==', true), orderBy('completedAt', 'desc'), limit(max)),
      [max]
    );
    return useFirestoreList<Work>(q);
  }
  ```
  A página de departamento só precisa de 6 (`RecentWorks` faz
  `.slice(0, 6)`) mais a lista de serviços com trabalhos — pode passar a
  usar `usePublishedWorks(24)` em vez da mesma escuta ilimitada.
- **Esforço:** M

### DES-02 — Listas mostram a foto de 1 600 px onde o espaço é de 44 a 170 px
- **Vertente:** desempenho
- **Severidade:** Alto
- **Superfície:** app, backoffice
- **Onde:** `src/screens/PortfolioScreen.tsx:190`, `src/screens/AlertsScreen.tsx:117`, `src/screens/EventsScreen.tsx:62`, `src/screens/ProfileScreen.tsx:440`, `src/screens/DepartmentScreen.tsx:250`, `../marble-backoffice/src/pages/WorksPage.tsx:88`, `../marble-backoffice/src/pages/CheckupsPage.tsx:171`, `../marble-backoffice/src/pages/DashboardPage.tsx:153`
- **Confiança:** confirmado
- **O que está mal:** tudo o que o backoffice grava em `works.photoUrl`,
  `vehicles.photoUrl` e `events.photoUrl` é a entrega
  `c_limit,w_1600,q_auto,f_auto` (`../marble-backoffice/src/media/cloudinary.ts:30`).
  Existe um `thumbnailUrl` de 480 × 360 (`:33`), mas ele só é guardado
  dentro de `works.media[]` e nos modelos que o trazem à cabeça (`Sample`,
  `Simulation`, `RequestPhoto`, `DepartmentCover`) — `Work`, `Vehicle` e
  `MarbleEvent` não têm campo de miniatura (`src/firebase/models.ts:391-437`).
  Resultado: todas as listas com cartões pequenos pedem a foto grande.
- **Cenário de falha:** o ecrã Alertas com 100 alertas (o limite da query)
  descarrega 100 imagens de 1 600 px — da ordem de 25 MB — para as mostrar
  em quadrados de 44 × 44 px. Num telemóvel com dados móveis isto é a
  operação mais cara da app inteira; com `cloudinaryWhole(url, 96)` seriam
  ~1 MB. O Portfólio com 40 trabalhos passa de ~10 MB para ~1 MB com
  `w_400`.
- **Evidência:**
  ```tsx
  // src/screens/AlertsScreen.tsx:116-118 — thumb é 44 × 44 (styles.thumb:164)
  <View style={styles.thumb}>
    <Photo url={a.photoUrl} seed={a.type} />
  </View>
  ```
  ```ts
  // ../marble-backoffice/src/media/cloudinary.ts:29-34
  export function photoUrl(publicId: string): string {
    return `${base()}/image/upload/c_limit,w_1600,q_auto,f_auto/${publicId}`;
  }
  export function photoThumbUrl(publicId: string): string {
    return `${base()}/image/upload/c_fill,w_480,h_360,q_auto,f_auto/${publicId}`;
  }
  ```
  Contraria a nota do `ROADMAP.md:354-357` ("o backoffice gera URLs já
  otimizados … a app não precisa de saber que é Cloudinary, só mostra `url`
  e `thumbnailUrl`") e o comentário de `src/firebase/models.ts:32-33` ("A
  app usa `thumbnailUrl` quando existe (o cartão é pequeno) e cai para
  `photoUrl`") — que é exatamente o que os cartões de departamento fazem e
  o resto das listas não.
- **A que escala começa a doer:** já dói hoje, a qualquer número de
  documentos — é por imagem, não por coleção. Piora linearmente com o
  número de linhas visíveis (que DES-01 e DES-03 deixam crescer sem tecto).
- **Correção proposta:** já existe a peça certa no repositório —
  `cloudinaryWhole(url, width)` (`src/media/cloudinary.ts:55`) reescreve
  qualquer URL de entrega do Cloudinary para outra largura, sem tocar nos
  dados nem no backoffice. Dar ao `Photo` a largura que o pai vai usar:
  ```tsx
  // src/components/Photo.tsx
  type Props = { url?: string | null; seed: string; fit?: 'cover' | 'contain'; width?: number };
  export default function Photo({ url, seed, fit = 'cover', width }: Props) {
    const trimmed = url?.trim() ? (width ? cloudinaryWhole(url, width * 2) : url.trim()) : null;
    …
  }
  ```
  e passar `width={44}` em Alertas, `width={cardW}` no Portfólio,
  `width={156}` em `RecentWorks`, `width={56}` nas linhas do Perfil,
  `width={screenW}` nos cartões de Eventos. No backoffice, o mesmo com um
  `thumbUrl()` aplicado no `Thumb` (`src/components/ui.tsx:79`). A opção
  mais completa — acrescentar `thumbnailUrl` a `Work`/`Vehicle`/`MarbleEvent`
  e preenchê-lo no backoffice — só vale a pena depois, e obriga a migrar os
  documentos antigos.
- **Esforço:** M

### DES-03 — Listas grandes desenhadas com `.map()` dentro de `ScrollView`, sem virtualização
- **Vertente:** desempenho
- **Severidade:** Alto
- **Superfície:** app
- **Onde:** `src/screens/PortfolioScreen.tsx:181-203`, `src/screens/AlertsScreen.tsx:100-124`, `src/screens/EventsScreen.tsx:56-88`, `src/components/WorkGallery.tsx:39-68`
- **Confiança:** confirmado
- **O que está mal:** nenhuma das três listas principais usa `FlatList`.
  Um `ScrollView` monta **todos** os filhos de uma vez: todos os
  `<Pressable>`, todos os `<Text>` e, sobretudo, todos os `<Image>` —
  que começam a descarregar em paralelo mesmo os que estão a dez ecrãs de
  distância. O único sítio onde há virtualização é o `MediaViewer`
  (`FlatList` com `getItemLayout` e `keyExtractor`, `MediaViewer.tsx:60-75`)
  — está bem feito, mas é o ecrã que menos precisa dela.
- **Cenário de falha:** Alertas com 100 notificações monta 100 linhas e
  dispara 100 downloads no instante em que o ecrã abre, antes de o cliente
  ver a primeira. O Portfólio com 400 trabalhos (DES-01) monta 400 cartões:
  no Android de gama média isto é uma paragem de vários segundos e um pico
  de memória que pode terminar a app.
- **Evidência:**
  ```tsx
  // src/screens/PortfolioScreen.tsx:181-190
  <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
    {filtered.map((w) => (
      <Pressable key={w.id} style={[styles.card, { width: cardW }]} …>
        <Photo url={w.photoUrl} seed={w.id} />
  ```
- **A que escala começa a doer:** Alertas já está no limite hoje (a query
  traz até 100). Portfólio e Eventos acima de ~50 itens. Abaixo de ~30
  itens a diferença não se vê.
- **Correção proposta:** trocar os três `ScrollView` por `FlatList`:
  - Portfólio: `numColumns={2}`, `keyExtractor={(w) => w.id}`,
    `renderItem` extraído para um componente `React.memo` (evita a closure
    nova por render), e `getItemLayout` — os cartões têm altura fixa (148 +
    10 de espaçamento), por isso `getItemLayout={(_, i) => ({ length: 158, offset: 158 * Math.floor(i / 2), index: i })}`.
  - Alertas: `FlatList` simples com `keyExtractor`; as linhas têm altura
    variável, por isso sem `getItemLayout`.
  - Eventos: `FlatList` com `getItemLayout` (cartão de altura fixa: 110 de
    foto + corpo).
  A galeria do Detalhe é caso à parte — ver DES-11.
- **Esforço:** M

### DES-04 — Publicar um trabalho lê a coleção `clients` inteira dentro de um trigger
- **Vertente:** desempenho
- **Severidade:** Alto
- **Superfície:** functions
- **Onde:** `functions/src/handlers.ts:29`, `functions/src/index.ts:102-106`
- **Confiança:** confirmado
- **O que está mal:** quando `works/{id}` passa a `published: true`, o
  `onWorkWritten` faz `db.collection('clients').get()` — a coleção inteira,
  sem filtro nem limite — e só depois filtra em memória com
  `canReceive(c, 'new_work', after.category)`. O filtro é exatamente
  `consent.marketing === true` **e** `notificationPrefs[categoria] === true`
  — duas igualdades que o Firestore sabe fazer numa query.
- **Cenário de falha:** com 5 000 clientes, publicar um trabalho lê 5 000
  documentos para escrever, digamos, 1 200 notificações. O `onWorkWritten`
  não declara `timeoutSeconds`, por isso corre com os 60 s por defeito;
  ler 5 000 documentos, filtrar e fazer 3 commits em lote cabe, mas a
  margem encolhe com o tamanho do documento de cliente, e uma segunda
  publicação no mesmo minuto duplica tudo. O mesmo padrão está em
  `functions/src/jobs/events.ts:18` (`loadAppClients`), mas aí é uma vez por
  dia e a lista é reaproveitada pela retenção — por isso conta-se em DES-07.
- **Evidência:**
  ```ts
  // functions/src/handlers.ts:28-31
  if (justPublished && !after.newWorkNotifiedAt) {
    const clients = (await db.collection('clients').get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Client);
    const recipients = clients.filter((c) => canReceive(c, 'new_work', after.category).ok);
  ```
- **Porque não é Crítico:** está guardado por `justPublished &&
  !after.newWorkNotifiedAt`, ou seja corre **uma vez por trabalho**, não em
  cada edição no backoffice. A grande maioria das escritas em `works` sai
  do trigger sem ler nada.
- **A que escala começa a doer:** irrelevante até ~500 clientes. Aos 5 000
  são 5 000 leituras por publicação e o cold start passa a contar; acima de
  ~20 000 clientes arrisca o timeout de 60 s.
- **Correção proposta:** filtrar na query e paginar, usando um índice
  composto novo por categoria:
  ```ts
  const prefField = `notificationPrefs.${prefKeyOf(after.category)}`;
  let q = db.collection('clients')
    .where('consent.marketing', '==', true)
    .where(prefField, '==', true)
    .orderBy('__name__')
    .limit(450);
  for (;;) {
    const snap = await q.get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const d of snap.docs) batch.set(db.collection('notifications').doc(), notificationDoc({ … }, now));
    await batch.commit();
    if (snap.size < 450) break;
    q = q.startAfter(snap.docs[snap.size - 1]);
  }
  ```
  (`deletedAt`/`createdByTeam` continuam a filtrar-se em memória — são
  poucos.) Declarar `timeoutSeconds: 300` no `onWorkWritten` enquanto isso
  não estiver feito é uma rede de segurança de um minuto de trabalho.
- **Esforço:** M

### DES-05 — `runFollowUps` faz duas leituras por trabalho ativo, em série (N+1)
- **Vertente:** desempenho
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/jobs/followUps.ts:45`, `functions/src/jobs/followUps.ts:20-29`
- **Confiança:** confirmado
- **O que está mal:** a query `works.where('followUp.active','==',true)`
  não tem `limit`, e dentro do `for` de cada trabalho chama-se `load()`,
  que lê o cliente e o carro/chão. As duas leituras são paralelas entre si
  (`Promise.all`), mas o ciclo é sequencial: cada trabalho paga um ida-e-volta
  de leitura mais um a três de escrita antes de se passar ao seguinte.
- **Cenário de falha:** fórmula das leituras do job diário inteiro
  (`N` clientes, `V` carros/chãos, `W` trabalhos, `A` trabalhos com
  acompanhamento ativo, `C` pedidos fechados acumulados, `X` simulações com
  mais de 90 dias que têm `requestId`):

  ```
  leituras/dia ≈ 500 (recibos) + 3A (followUps) + N (clientes) + V + W (retenção)
                 + C (pedidos) + X (simulações)
  ```

  - **N = 100** (A≈20, V≈120, W≈150, C≈50, X≈30): ≈ **1 000 leituras/dia**,
    ~10 s de tempo de relógio. Cabe nos 540 s com folga enorme.
  - **N = 5 000** (A≈300, V≈7 000, W≈9 000, C≈4 000, X≈3 000):
    ≈ **29 000 leituras/dia**, ~0,01 €/dia — o custo nunca é o problema. O
    tempo é dominado pelo ciclo do `runFollowUps`: 300 trabalhos × ~260 ms
    de idas-e-voltas ≈ **80 s** dos 540 s. **Cabe.**
  - O ponto de rutura é `A`, não `N`: acima de **~1 800 trabalhos com
    acompanhamento ativo no mesmo dia** o `runFollowUps` sozinho passa dos
    540 s e o `dailyJobs` morre a meio, deixando os jobs seguintes
    (`events`, `retention`, `requests`, `simulations`) por correr nesse dia.
- **Evidência:**
  ```ts
  // functions/src/jobs/followUps.ts:45-54
  const snap = await db.collection('works').where('followUp.active', '==', true).get();
  for (const doc of snap.docs) {
    …
    const { client, vehicle } = await load(db, work);   // 2 leituras por trabalho
  ```
- **Correção proposta:** duas mudanças pequenas. (1) `.limit(500)` na query
  — o job é idempotente (cada passo fica marcado com um `*At`), por isso o
  que sobrar é apanhado no dia seguinte. (2) carregar clientes e
  carros/chãos em bloco antes do ciclo, com `db.getAll(...refs)` em lotes
  de 300, em vez de dois `get()` por trabalho; o ciclo passa a ser só
  memória mais as escritas.
- **Esforço:** M

### DES-06 — Os varrimentos de retenção releem todos os dias o que já trataram, e a lista só cresce
- **Vertente:** desempenho
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/requests.ts:234`, `functions/src/simulations.ts:282`
- **Confiança:** confirmado
- **O que está mal:** `runRequestRetention` lê **todos** os pedidos com
  `status == 'closed'` e salta em memória os que já têm `anonymizedAt`. Um
  pedido anonimizado continua `closed` para sempre, por isso é relido todos
  os dias até ao fim da vida do projeto. O mesmo em
  `runSimulationRetention`: lê todas as simulações com `createdAt <= cutoff`
  e salta as que têm `requestId` — essas nunca são apagadas, logo ficam a
  ser lidas todos os dias.
- **Cenário de falha:** cinco anos de operação com 5 000 clientes deixam
  facilmente 20 000 pedidos fechados e 10 000 simulações ligadas a pedidos:
  são 30 000 leituras por dia (~0,01 €) e uns segundos de job, **só para não
  fazer nada**. Não parte nada; é desperdício que cresce com a idade do
  negócio e não com o número de clientes.
- **Evidência:**
  ```ts
  // functions/src/requests.ts:234-238
  const snap = await db.collection('requests').where('status', '==', 'closed').get();
  for (const d of snap.docs) {
    const r = { id: d.id, ...d.data() } as ServiceRequest;
    if (r.anonymizedAt) continue;   // relido todos os dias, para sempre
  ```
  ```ts
  // functions/src/simulations.ts:282-285
  const snap = await db.collection('simulations').where('createdAt', '<=', cutoff).get();
  for (const d of snap.docs) {
    summary.checked++;
    if (d.data().requestId) continue;   // idem
  ```
- **Correção proposta:** pôr o filtro na query em vez de no ciclo.
  - Pedidos: `where('status','==','closed').where('closedAt','<=',cutoff).orderBy('closedAt').limit(300)`
    (índice composto `status` + `closedAt`) e, para excluir os já tratados,
    um campo `retentionDone: true` com `where('retentionDone','==',false)`
    ou, mais simples, mudar o `status` para `'archived'` ao anonimizar.
  - Simulações: `where('createdAt','<=',cutoff).where('requestId','==',null).limit(300)`
    obriga a gravar `requestId: null` na criação; alternativa sem migração é
    manter a query e acrescentar `.limit(500)` com `startAfter` guardado em
    `system/simulationGuard`.
- **Esforço:** M

### DES-07 — A retenção varre `clients`, `vehicles` e `works` inteiros todos os dias
- **Vertente:** desempenho
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/jobs/retention.ts:50`, `functions/src/jobs/retention.ts:90`, `functions/src/jobs/events.ts:18`
- **Confiança:** confirmado
- **O que está mal:** `lastServiceByClient()` faz
  `Promise.all([db.collection('vehicles').get(), db.collection('works').get()])`
  para construir um mapa `clientId → última data de serviço`, e o ciclo
  seguinte percorre todos os clientes. São três coleções inteiras por dia
  (a de clientes é partilhada com o job dos eventos, o que já está bem
  pensado — `jobs/index.ts:38`).
- **Cenário de falha:** com 5 000 clientes, 7 000 carros/chãos e 9 000
  trabalhos são 21 000 leituras por dia para decidir sobre um punhado de
  contas inativas — a esmagadora maioria dos clientes está ativa e o ciclo
  sai no `continue`. Tempo: poucos segundos (o Admin SDK faz streaming),
  por isso não ameaça os 540 s; o que incomoda é ser trabalho garantidamente
  inútil, e crescer com tudo ao mesmo tempo.
- **Evidência:**
  ```ts
  // functions/src/jobs/retention.ts:50-53
  const [vehicles, works] = await Promise.all([db.collection('vehicles').get(), db.collection('works').get()]);
  vehicles.docs.forEach((v) => bump(v.data().clientId, v.data().lastServiceAt ?? v.data().createdAt));
  works.docs.forEach((w) => bump(w.data().clientId, w.data().completedAt));
  ```
- **Correção proposta:** restringir a query aos candidatos. A atividade só
  interessa a quem já está perto do corte, e `clients.lastActiveAt` e
  `clients.updatedAt` já bastam para pré-filtrar:
  ```ts
  const warnCutoff = addDays(addDays(now, -INACTIVE_YEARS * 365), WARNING_DAYS);
  const candidates = await db.collection('clients').where('updatedAt', '<=', Timestamp.fromDate(warnCutoff)).get();
  ```
  e só depois, para esses (dezenas, não milhares), ler os carros/chãos e
  trabalhos com `where('clientId','in', chunkDe30)`. `lastServiceByClient`
  deixa de existir na forma atual. O job dos eventos passa a carregar os
  clientes por si (já tem o caminho `clients ?? await loadAppClients(db)`),
  com o filtro de consentimento na query (ver DES-04).
- **Esforço:** M

### DES-08 — A lista de clientes do backoffice faz trabalho quadrático a cada tecla da pesquisa
- **Vertente:** desempenho
- **Severidade:** Médio
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/pages/ClientsPage.tsx:43`, `../marble-backoffice/src/pages/ClientsPage.tsx:19-40`, `../marble-backoffice/src/data/duplicates.ts:11-20`
- **Confiança:** confirmado
- **O que está mal:** duas coisas na mesma página. (1) A linha 43 chama
  `findMatchingAccounts(c, activeClients)` para **cada** cliente, **fora de
  qualquer `useMemo`** — é O(clientes²) e recorre a cada render, incluindo
  a cada tecla escrita na caixa de pesquisa. (2) O `useMemo` das linhas
  (19-40) depende de `search`, por isso também recorre a cada tecla, e lá
  dentro faz `vehicles.data.filter(...)` por cliente — O(clientes × veículos)
  — mais outro `findMatchingAccounts` por cliente.
- **Cenário de falha:** com 2 000 clientes e 2 500 carros/chãos, escrever
  "joão" na pesquisa desencadeia, por cada uma das quatro teclas,
  ~4 000 000 comparações de duplicados (cada uma com `normalizeEmail` e
  `normalizePhone`, que criam strings) mais 5 000 000 de filtragens de
  veículos. A caixa de pesquisa deixa de responder.
- **Evidência:**
  ```tsx
  // ../marble-backoffice/src/pages/ClientsPage.tsx:42-43
  const accounts = activeClients.filter(hasAppAccount).length;
  const duplicates = activeClients.filter((c) => findMatchingAccounts(c, activeClients).length > 0).length;
  ```
  ```tsx
  // ../marble-backoffice/src/pages/ClientsPage.tsx:22-29 — dentro do useMemo que depende de `search`
  .map((c) => {
    const cv = vehicles.data.filter((v) => v.clientId === c.id);
    return { c, vehicles: cv.length, pending: …, duplicates: findMatchingAccounts(c, activeClients) };
  })
  ```
- **A que escala começa a doer:** invisível até ~200 clientes; notório a
  partir de ~800; inutilizável acima de ~3 000.
- **Correção proposta:** calcular índices uma vez, com `useMemo` que **não**
  dependa de `search`, e deixar a pesquisa a filtrar uma lista já pronta:
  ```tsx
  const byEmail = useMemo(() => indexBy(activeClients.filter(hasAppAccount), (c) => normalizeEmail(c.email)), [activeClients]);
  const byPhone = useMemo(() => indexBy(activeClients.filter(hasAppAccount), (c) => normalizePhone(c.phone)), [activeClients]);
  const vehiclesByClient = useMemo(() => groupBy(vehicles.data, (v) => v.clientId), [vehicles.data]);
  const enriched = useMemo(() => activeClients.map((c) => ({ … })), [activeClients, byEmail, byPhone, vehiclesByClient]);
  const rows = useMemo(() => enriched.filter(matches(search, filter)).sort(…), [enriched, search, filter]);
  ```
  Tudo passa a O(clientes + veículos). A mesma revisão vale para
  `findMatchingAccounts` usado em `ClientDetailPage`.
- **Esforço:** S

### DES-09 — Nove faces de fonte bloqueiam o primeiro pixel da app, e três nunca são usadas
- **Vertente:** desempenho
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `App.tsx:22-40`, `src/theme/theme.ts:18-27`
- **Confiança:** confirmado
- **O que está mal:** `App.tsx` carrega nove faces (`AlexBrush_400Regular`,
  `Jost_400Regular/500Medium/600SemiBold`, `Manrope_400/500/600/700/800`) e
  devolve só um `ActivityIndicator` enquanto `fontsLoaded` for falso — ou
  seja, **nada** da app aparece antes de as nove estarem prontas. Três
  delas não são usadas em estilo nenhum: `AlexBrush_400Regular` (só
  referida por `fonts.script`, 0 usos), `Jost_400Regular` (só por
  `fonts.eyebrowLight`, 0 usos) e `Jost_600SemiBold` (nem sequer aparece no
  mapa `fonts`).
- **Cenário de falha:** as nove somam 785 240 B de TTF. No nativo é leitura
  de ficheiros locais (algumas centenas de ms e nada de rede), mas na app
  **web** — que é como o Fábio testa e como o link público abre — são
  ~767 KB descarregados antes do primeiro pixel, dos quais 238 592 B
  (AlexBrush 115 420 + Jost 400 61 524 + Jost 600 61 648) não servem para
  nada.
- **Evidência:**
  ```
  $ grep -ro "fonts\.script" src/ App.tsx | wc -l      → 0
  $ grep -ro "fonts\.eyebrowLight" src/ App.tsx | wc -l → 0
  $ grep -rno "Jost_600SemiBold" src/                   → (nada)
  $ ls -la node_modules/@expo-google-fonts/alex-brush/400Regular/AlexBrush_400Regular.ttf
    115420 …
  ```
  ```tsx
  // App.tsx:34-40
  if (!fontsLoaded) {
    return (<View style={styles.loading}><ActivityIndicator color={colors.gold} /></View>);
  }
  ```
- **Correção proposta:** tirar as três faces não usadas do `useFonts` e as
  duas chaves mortas (`script`, `eyebrowLight`) de `src/theme/theme.ts` —
  menos 233 KB e menos três pedidos, sem mudar um pixel. Se um dia a
  AlexBrush voltar a fazer falta, carrega-se à parte e sem bloquear. Em
  segundo lugar, deixar a app pintar com as fontes do sistema em vez de
  esperar por todas: `expo-splash-screen` já é dependência —
  `SplashScreen.preventAutoHideAsync()` no arranque e `hideAsync()` no
  `useEffect` de `fontsLoaded` dá a mesma coisa sem o ecrã intermédio com
  o indicador.
- **Esforço:** S

### DES-10 — `google-auth-library` entra no arranque a frio de todas as Functions
- **Vertente:** desempenho
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/src/index.ts:24`, `functions/src/simulations.ts:6`, `functions/src/vertex.ts:1`
- **Confiança:** confirmado
- **O que está mal:** `index.ts` importa `./simulations` no topo, que importa
  `./vertex`, que importa `google-auth-library` no topo. Como todas as
  funções partilham o mesmo `index.ts`, esse grafo é carregado no cold start
  de **todas** elas — incluindo a mais frequente, `onNotificationCreated`,
  que só precisa de `firebase-admin` e de um `fetch`. O mesmo vale para
  `./cloudinary` e `./email`, que só servem dois triggers.
- **Cenário de falha:** cada push novo que chega a uma instância fria paga
  o `require` de 3,1 MB de módulos (`google-auth-library` 1,8 MB +
  `gcp-metadata` 1,1 MB + `gaxios`, `gtoken`, `jws`) que nunca vai usar.
  Com `maxInstances: 5` e um lembrete de evento para milhares de clientes,
  isso acontece nas cinco instâncias.
- **Evidência:**
  ```
  $ du -sk functions/node_modules/google-auth-library …
    1793  google-auth-library
    1059  gcp-metadata
     162  gaxios
      56  gtoken
      43  jws
  ```
  ```ts
  // functions/src/vertex.ts:1
  import { GoogleAuth } from 'google-auth-library';
  ```
- **Correção proposta:** importar o Vertex só quando é preciso, dentro do
  handler que o usa:
  ```ts
  // functions/src/simulations.ts — em vez do import no topo
  const { generateEditedImage } = await import('./vertex');
  ```
  (o `VertexConfig` continua a poder ser importado como `import type`, que
  desaparece na compilação). Ganha-se o cold start de
  `onNotificationCreated`, `onWorkWritten`, `onClientUpdated`,
  `onVehicleUpdated` e `dailyJobs` — cinco das sete funções.
- **Esforço:** S

### DES-11 — A galeria do Detalhe monta todas as fotos de 1 600 px ao abrir o ecrã
- **Vertente:** desempenho
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/components/WorkGallery.tsx:39-68`, `src/screens/WorkDetailScreen.tsx:71-86`
- **Confiança:** confirmado
- **O que está mal:** `WorkGallery` desenha `items.map(...)` dentro de um
  `ScrollView` horizontal com `pagingEnabled`. Todos os `<Photo>` são
  montados e todos os downloads arrancam no instante em que o Detalhe abre,
  mesmo que o cliente nunca deslize. Cada foto é `item.url`, ou seja o
  `c_limit,w_1600` do backoffice (DES-02), e o `WorkFormPage` deixa juntar
  vários itens por trabalho.
- **Cenário de falha:** um trabalho com 10 fotos na galeria descarrega da
  ordem de 2,5–4 MB ao abrir o Detalhe, para mostrar uma. O vídeo, esse,
  está bem resolvido: o `MediaViewer` só monta o leitor para o item ativo
  (`MediaViewer.tsx:113-122`) e a galeria mostra só a miniatura com a
  etiqueta "Ver vídeo" — ver "O que está bem".
- **Evidência:**
  ```tsx
  // src/components/WorkGallery.tsx:47-58
  {items.map((item, i) => (
    <Pressable key={item.key} style={{ width, height }} …>
      <Photo url={item.type === 'video' ? item.thumbnailUrl : item.url} seed={`${seed}-${i}`} fit="contain" />
  ```
- **Correção proposta:** `FlatList` horizontal com `pagingEnabled`,
  `getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}`
  (a largura é fixa e conhecida) e `initialNumToRender={1}`,
  `windowSize={3}` — o mesmo padrão que o `MediaViewer` já usa a três
  ficheiros de distância. Somado a DES-02, a foto do herói pode ainda ser
  pedida a `cloudinaryWhole(item.url, heroW * 2)` em vez dos 1 600 px fixos.
- **Esforço:** S

### DES-12 — O backoffice serve-se num só bundle de 983 KB, sem divisão por rota
- **Vertente:** desempenho
- **Severidade:** Baixo
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/App.tsx:8-24`, `../marble-backoffice/vite.config.ts:10-14`
- **Confiança:** confirmado
- **O que está mal:** as 17 páginas são importadas estaticamente no topo de
  `App.tsx`, por isso o Vite produz um único chunk. A build atual é
  `dist/assets/index-BBIni1hL.js` com 983 121 B (295 854 B em gzip) — SDK
  do Firebase, React, React Router, `@dnd-kit` e as 17 páginas, tudo junto,
  mesmo para quem só abre o Painel.
- **Cenário de falha:** primeira visita num portátil com ligação fraca
  descarrega ~289 KB antes de ver o Painel. É Baixo porque: são dois ou
  três utilizadores, em desktop, e o Hosting já serve os assets com
  `immutable` a um ano (commit `1c532f2` do backoffice), por isso só a
  primeira visita depois de cada deploy paga.
- **Evidência:**
  ```
  $ ls -la dist/assets
    983121 index-BBIni1hL.js
     16128 index-BgUS2BXv.css
  $ gzip -c dist/assets/index-BBIni1hL.js | wc -c
    295854
  ```
- **Correção proposta:** `React.lazy` nas rotas menos usadas
  (`WorkFormPage` 593 linhas, `CheckupsPage` 747, `SamplesPage` 389,
  `FeaturedPage` 312 — só o `@dnd-kit` desta última já são dezenas de KB),
  com um `<Suspense fallback={<LoadingState />}>` à volta das `Routes`. O
  Vite faz o resto sozinho. Aproveitar para reduzir `public/logo.png`
  (191 807 B de PNG para um logótipo).
- **Esforço:** S

### DES-13 — O Firestore corre sem cache persistente: cada arranque relê tudo do servidor
- **Vertente:** desempenho
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/firebase/config.ts:8`, `src/firebase/app.ts:23`
- **Confiança:** confirmado
- **O que está mal:** a app usa `getFirestore(app)` sem passar por
  `initializeFirestore(...)`, por isso fica com a cache **em memória**. Em
  React Native isto não é evitável com o SDK JS (o `persistentLocalCache`
  do `firebase/firestore` assenta em IndexedDB, que só existe no browser),
  mas na app web é uma linha. Efeito: enquanto uma escuta está montada os
  documentos ficam em memória e um segundo componente com a mesma query não
  paga leituras novas (é o que salva o Portfólio e a página de departamento
  de lerem `works` duas vezes); assim que a app fecha, ou o ecrã
  desmonta e todas as escutas daquele alvo caem, o recoletor em memória
  deita os documentos fora e a leitura seguinte volta ao servidor.
- **Cenário de falha:** o cliente abre a app dez vezes por dia; dez vezes
  paga `W` leituras de `works` no Portfólio (DES-01) e as 100 de Alertas,
  em vez de as receber da cache e só sincronizar o delta. É o multiplicador
  silencioso por trás de DES-01.
- **Evidência:**
  ```ts
  // src/firebase/config.ts:4-8
  import { getFirestore } from 'firebase/firestore';
  import app from './app';
  export { auth } from './authInstance';
  export const db = getFirestore(app);
  ```
- **Correção proposta:** na web, trocar por
  `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`,
  atrás do mesmo padrão `config.ts` / `config.native.ts` que já existe para
  o Auth (`authInstance.ts` vs `authInstance.native.ts`). No nativo não há
  equivalente sem trocar para `@react-native-firebase/firestore` — decisão
  que não vale a pena tomar só por isto; a mitigação real no telemóvel são
  os limites de DES-01.
- **Esforço:** S

### DES-14 — `CheckupSheet` está sempre montado no Perfil e mantém uma escuta que nunca fecha
- **Vertente:** desempenho
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/screens/ProfileScreen.tsx:566`, `src/components/CheckupSheet.tsx:30`, `src/data/checkups.ts:29-31`
- **Confiança:** confirmado
- **O que está mal:** o componente é renderizado incondicionalmente
  (`<CheckupSheet vehicle={sheetVehicle} …/>`, com `vehicle` a null quando a
  folha está fechada), e chama `useCheckupAvailability()`, que abre um
  `onSnapshot` sobre `settings/checkups`. Como o Perfil é uma tab e fica
  montado depois da primeira visita, a escuta dura a sessão inteira mesmo
  que o cliente nunca peça um checkup.
- **Cenário de falha:** é um documento só — o custo é uma leitura e uma
  ligação de escuta a mais por sessão. Não escala com nada; fica registado
  por ser a única escuta da app que não corresponde a nada visível.
- **Evidência:**
  ```tsx
  // src/screens/ProfileScreen.tsx:565-566
  {/* Agendamento de checkup (Secção 8). */}
  <CheckupSheet vehicle={sheetVehicle} onClose={() => setSheetVehicle(null)} />
  ```
  ```ts
  // src/data/checkups.ts:29-31
  export function useCheckupAvailability(): { availability: Availability; loading: boolean } {
    const ref = useMemo(() => doc(db, COLLECTIONS.settings, 'checkups'), []);
    const { data, loading } = useFirestoreDoc<CheckupAvailability>(ref);
  ```
- **Correção proposta:** `{sheetVehicle ? <CheckupSheet vehicle={sheetVehicle} onClose={…} /> : null}`.
  Confirmar antes que a folha não depende de estar montada para a animação
  de entrada (a leitura de `CheckupSheet.tsx` sugere que não: o `useEffect`
  de pré-preenchimento dispara com `[vehicle, options.length > 0]`).
- **Esforço:** S

### DES-15 — As fotos de um pedido de orçamento sobem uma a uma
- **Vertente:** desempenho
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/screens/RequestQuoteScreen.tsx:200-212`
- **Confiança:** confirmado
- **O que está mal:** o envio das (até cinco) fotos é um `for` com `await`
  por foto. Cada uma já vem reduzida a 1 600 px e qualidade 0,85 no
  telemóvel (`src/media/images.ts:19`, `requestPhotos.ts:12`), o que está
  bem feito; o que se perde é o paralelismo.
- **Cenário de falha:** cinco fotos de ~300 KB em 4G a 1,5 Mbps de upload
  são ~8 s em série contra ~3 s com duas ou três em paralelo. O cliente
  está a olhar para o ecrã, à espera, depois de já ter carregado em
  "Enviar".
- **Evidência:**
  ```ts
  // src/screens/RequestQuoteScreen.tsx:200-203
  for (let i = 0; i < photos.length; i++) {
    …
    const photo = await uploadRequestPhoto(photos[i].uri, id, (fraction) => …);
  ```
- **Correção proposta:** subir em paralelo com concorrência limitada a 2 ou
  3 (`Promise.all` sobre lotes de 2–3), mantendo o progresso por foto que o
  `PhotoPicker` já mostra. Cuidado: a ordem do array de resultados tem de
  ser preservada (o `RequestPhoto[]` que vai para o Firestore é o que a
  equipa vê pela ordem escolhida).
- **Esforço:** S

### DES-16 — Limiar a partir do qual o `DataContext` do backoffice deixa de servir
- **Vertente:** desempenho
- **Severidade:** Sugestão
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/data/DataContext.tsx:41-62`
- **Confiança:** confirmado
- **O que está mal:** nada, hoje — a metodologia diz explicitamente que
  escutar coleções inteiras com dezenas de documentos não é achado, e a
  decisão está escrita no próprio ficheiro ("O volume é pequeno … mais
  simples e mais rápido ter tudo em memória do que uma query por página").
  Fica registado o limiar para a próxima corrida.
- **Cenário de falha:** quatro das nove escutas não têm limite (`works`,
  `events`, `clients`, `vehicles`) e as outras têm 400/500. O ponto em que
  isto passa a ser achado: quando `clients` ou `works` passarem de ~1 500
  documentos — aí o `DataProvider` gasta segundos e vários MB a carregar
  tudo antes de o Painel aparecer, e o `useMemo` de `value`
  (`DataContext.tsx:64-89`) reconstrói quatro `Map` completos a cada
  snapshot de qualquer uma das nove coleções.
- **Evidência:**
  ```tsx
  // ../marble-backoffice/src/data/DataContext.tsx:41-44
  const qWorks = useMemo(() => query(collection(db, COLLECTIONS.works), orderBy('completedAt', 'desc')), []);
  …
  const qClients = useMemo(() => query(collection(db, COLLECTIONS.clients), orderBy('createdAt', 'desc')), []);
  ```
- **Correção proposta (quando chegar a hora):** manter o `DataContext` só
  para o que a barra lateral e o Painel precisam (contagens por agregação
  `getCountFromServer`, e as 50 linhas mais recentes de cada coleção); cada
  página de lista passa a ter a sua query com `limit(50)` + `startAfter`, e
  a pesquisa passa a ser server-side (`where('email','>=',q)` com índice) em
  vez de `includes()` em memória.
- **Esforço:** L

### DES-17 — `expo-image` em vez do `Image` do React Native no `Photo`
- **Vertente:** desempenho
- **Severidade:** Sugestão
- **Superfície:** app
- **Onde:** `src/components/Photo.tsx:41-48`, `package.json` (dependências)
- **Confiança:** confirmado
- **O que está mal:** o `Photo` usa o `<Image>` do `react-native`. No
  telemóvel isso apoia-se na cache HTTP da plataforma (NSURLCache /
  OkHttp), que é pequena e volátil — com imagens de 1 600 px (DES-02) as
  entradas são despejadas depressa e voltar ao Portfólio volta a
  descarregar. Não há placeholder progressivo: o cartão fica no gradiente
  até a imagem inteira chegar. `expo-image` não é dependência do projeto.
- **Cenário de falha:** o cliente vai ao Detalhe e volta ao Portfólio: com
  sorte as imagens vêm da cache do sistema, sem sorte descarregam outra
  vez. Não é mensurável sem instrumentação — por isso é sugestão, não
  achado.
- **Evidência:**
  ```tsx
  // src/components/Photo.tsx:40-48
  <Image source={{ uri }} style={styles.fill} resizeMode={fit} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
  ```
  ```
  $ grep -n "expo-image\"" package.json   → (nada; há expo-image-manipulator e expo-image-picker)
  ```
- **Correção proposta:** `npx expo install expo-image` e trocar dentro do
  `Photo` (a API é compatível: `source`, `contentFit` em vez de
  `resizeMode`, mais `cachePolicy="memory-disk"`, `transition={150}` e
  `placeholder`). Ganha-se cache em disco gerida pela app, transição suave e
  descodificação fora da thread da UI — e o resto do código não muda, porque
  toda a app passa pelo `Photo`. Fazer **depois** de DES-02: com imagens já
  do tamanho certo, o ganho da cache é muito maior.
- **Esforço:** S

### DES-18 — O envio de ficheiros no backoffice não tem limite de concorrência
- **Vertente:** desempenho
- **Severidade:** Sugestão
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/components/MediaUploader.tsx:58-75`
- **Confiança:** confirmado
- **O que está mal:** o oposto de DES-15: `addFiles` percorre a lista e
  dispara `uploadMedia(file, …)` **sem `await`**, por isso todos os
  ficheiros largados sobem ao mesmo tempo. Com fotos até 10 MB e vídeos até
  100 MB (`media/cloudinary.ts:20-21`), largar oito ficheiros de uma vez
  satura o upload e todas as barras de progresso avançam devagar ao mesmo
  tempo — parece que nada está a acontecer.
- **Cenário de falha:** a equipa larga a galeria de um trabalho (8 fotos +
  1 vídeo) numa ligação de escritório; o browser abre nove ligações e o
  vídeo, que é o que demora, só acaba no fim. Em rigor não é mais lento no
  total — é a perceção e o risco de timeout do XHR que pioram.
- **Evidência:**
  ```tsx
  // ../marble-backoffice/src/components/MediaUploader.tsx:58,67
  for (const file of list.slice(0, Math.max(0, room))) {
    …
    uploadMedia(file, (f) => setPending(…))
      .then((media) => { … })
  ```
- **Correção proposta:** uma fila com concorrência 2 (fotos primeiro,
  vídeos no fim), ou simplesmente `await` dentro do ciclo para vídeos e
  paralelo para fotos.
- **Esforço:** S

### DES-19 — Índices automáticos em campos de texto de coleções que crescem
- **Vertente:** desempenho
- **Severidade:** Sugestão
- **Superfície:** regras
- **Onde:** `firestore.indexes.json:53`
- **Confiança:** provável
- **O que está mal:** `"fieldOverrides": []` — nenhum campo tem a indexação
  automática desligada. O Firestore cria um índice ascendente e outro
  descendente por **cada** campo de **cada** documento, incluindo os que
  nunca serão filtrados nem ordenados: `notifications.title` e
  `.description`, `requests.message` e `requests.fields[]` (array, que gera
  uma entrada por elemento), `works.description`, `simulations.error`.
- **Cenário de falha:** as escritas continuam a custar o mesmo (o Firestore
  fatura por documento escrito, não por entrada de índice), mas o
  armazenamento dos índices cresce com o texto e a latência de escrita
  sobe. É `provável` e não `confirmado` porque não tenho acesso à consola
  para ver o tamanho real dos índices dos dois projetos.
- **Evidência:**
  ```json
  // firestore.indexes.json:53
  "fieldOverrides": []
  ```
  A coleção que mais cresce é `notifications` (uma por cliente por evento
  ou trabalho publicado): com 5 000 clientes, um único lembrete de evento
  cria 5 000 documentos com `title` + `description` indexados sem uso.
- **Correção proposta:** quando o volume o justificar, acrescentar
  `fieldOverrides` com `indexes: []` para `notifications.title`,
  `notifications.description`, `requests.message`, `requests.fields` e
  `works.description`. Verificar primeiro na consola (Firestore → Utilização)
  quanto ocupam hoje — pode não valer o deploy.
- **Esforço:** S

### DES-20 — `useUnreadCount` abriria uma segunda escuta idêntica sobre `notifications`
- **Vertente:** desempenho
- **Severidade:** Sugestão
- **Superfície:** app
- **Onde:** `src/data/notifications.ts:28-31`
- **Confiança:** confirmado
- **O que está mal:** `useUnreadCount(uid)` chama `useNotifications(uid)`,
  que constrói uma query nova e abre um `onSnapshot` próprio. Hoje **não é
  usado em lado nenhum** (`grep -rn "useUnreadCount" src/` só devolve a
  definição), por isso não custa nada; mas se alguém o usar num ecrã que já
  lista os alertas — que é precisamente para o que parece existir — passam a
  existir duas escutas sobre a mesma query. O SDK partilha o alvo no
  servidor, por isso não duplica leituras, mas duplica o estado React e os
  re-renders.
- **Cenário de falha:** um dia alguém põe o contador no ícone da tab
  Alertas; o `AlertsScreen` e a tab passam a manter dois estados com as
  mesmas 100 notificações, que se atualizam em cadeia.
- **Evidência:**
  ```ts
  // src/data/notifications.ts:28-31
  export function useUnreadCount(uid: string | null | undefined): number {
    const { data } = useNotifications(uid);
    return data.filter((n) => !n.read).length;
  }
  ```
- **Correção proposta:** ou apagar (é código morto), ou — se o contador
  voltar — resolvê-lo com `getCountFromServer(query(…, where('read','==',false)))`
  ou com um contador mantido pelas Functions em `clients/{uid}.unreadCount`,
  que é uma leitura em vez de cem. O contador que o `AlertsScreen` mostra
  hoje já sai da lista que ele próprio escuta (`AlertsScreen.tsx:33`) — isso
  está certo.
- **Esforço:** S

## O que está bem

Verificado, com ficheiro e linha, para a próxima corrida não repetir:

- **Não falta nenhum índice.** As 36 queries do inventário foram cruzadas
  com `firestore.indexes.json` (6 índices compostos) e com as regras de
  indexação automática. As seis combinações `where` + `orderBy` da app têm
  índice composto; as Functions reutilizam os índices `clientId`+`createdAt`
  de `requests` e `simulations` (`requests.ts:112`, `simulations.ts:192`),
  e `handlers.ts:101` só tem igualdades, que o Firestore resolve por merge
  de índices simples. Nenhuma query junta igualdade com desigualdade em
  campos diferentes. **Resposta à pergunta 2 da lista de verificação:
  nenhuma query parte em produção por falta de índice.**
- **Os limites que existem estão nos sítios certos:** `useNotifications`
  100 (`notifications.ts:10`), `useMyRequests` 20 (`requests.ts:23`),
  `useMySimulations` 30 (`simulations.ts:28`), `useFeaturedWorks` 5
  (`works.ts:27`), `runReceipts` 500 (`jobs/receipts.ts:15`), `DataContext`
  400/500 nas três coleções de maior rotação.
- **Os tectos de custo estão feitos por agregação, não por varrimento:**
  `requests.ts:128` e `simulations.ts:207` usam `.count().get()`, que custa
  uma leitura em vez de N.
- **As escutas fecham todas.** `useFirestoreList` e `useFirestoreDoc`
  devolvem o `onSnapshot` diretamente do `useEffect`
  (`firestoreHooks.ts:41` e `:60`), o mesmo no backoffice
  (`hooks.ts:46`, `:18`) e no `AuthContext.tsx:167`. Nenhuma escuta dentro
  de um componente de lista.
- **As queries vêm todas memoizadas** com `useMemo` antes de entrarem nos
  hooks — nenhum caso de query recriada por render (que religaria a escuta).
  O comentário de `hooks.ts:34-36` até explica porquê.
- **A redução de imagens antes do upload está feita e com números:** avatar
  a 1 024 px (`avatarPicker.ts:11`), fotos de pedido e do simulador a
  1 600 px, qualidade 0,85 (`requestPhotos.ts:12`, `images.ts:19`); o
  backoffice reduz no browser acima de 3 MB para 2 560 px, qualidade 0,88
  (`../marble-backoffice/src/media/cloudinary.ts:24-25`); as imagens que vão
  ao modelo do Vertex são reescritas para 1 024 px
  (`functions/src/simulations.ts:28`, `modelInputUrl`).
- **O vídeo está bem resolvido.** A galeria mostra a miniatura com a
  etiqueta "Ver vídeo" (`WorkGallery.tsx:58-64`); o leitor `expo-video` só
  é montado para o item ativo do `MediaViewer` (`MediaViewer.tsx:113-122`),
  e a miniatura do vídeo vem de `so_0,c_fill,w_800,h_500`
  (`../marble-backoffice/src/media/cloudinary.ts:38-40`). Nunca há mais do
  que um vídeo a carregar.
- **`MediaViewer` é o único ecrã virtualizado, e está certo:** `FlatList`
  com `keyExtractor`, `getItemLayout` e `initialScrollIndex`
  (`MediaViewer.tsx:60-75`).
- **Os filtros pesados estão memoizados.** `PortfolioScreen:75-84` (cinco
  `useMemo` encadeados para categoria → serviço → marca), `events.ts:15-25`
  (divisão próximos/passados), `samples.ts:16-22`, `WorkDetailScreen:35-37`,
  `DepartmentScreen:237`, `CheckupSheet.tsx:31`. **Resposta à pergunta 5:**
  o único contexto que pode re-renderizar a app inteira é o `AuthContext`,
  e o seu `value` **está** memoizado (`AuthContext.tsx:191-303`); muda
  quando muda `client`, o que inclui a escrita diária de `lastActiveAt`
  (`AuthContext.tsx:97`) — uma vez por dia e por sessão, guardada por
  `lastActiveTouched`. É aceitável como está.
- **Os cartões de departamento e as amostras já usam `thumbnailUrl`**
  (`HomeScreen.tsx:195`, `DepartmentScreen.tsx:295`, `ProfileScreen.tsx:81`)
  — é a prova de que a peça certa existe e só falta aplicá-la ao resto
  (DES-02). `Thumb` do backoffice já tem `loading="lazy"`
  (`../marble-backoffice/src/components/ui.tsx:83`).
- **Os triggers filtram cedo.** `onWorkWritten` sai sem ler nada quando não
  houve publicação nem mudança de carro/chão (`handlers.ts:27,43`);
  `onVehicleUpdated` sai logo se não houver `checkupRequest`
  (`handlers.ts:139`); `pushNotification` sai em `team_alert` e em
  reexecuções (`push.ts:32-33`); `handleSimulationCreated` e
  `handleRequestCreated` releem o doc e saem se já tiver `processedAt`
  (`simulations.ts:185`, `requests.ts:105`).
- **O job diário é idempotente e resistente a falhas parciais:** cada passo
  marca o seu `*At` e cada job apanha os próprios erros
  (`jobs/index.ts:26-35`), por isso um timeout não corrompe nada — o que
  sobrar é apanhado no dia seguinte. Os clientes são carregados **uma vez**
  e partilhados entre `events` e `retention` (`jobs/index.ts:38`).
- **O push já vai em lotes de 100** com o formato do Expo
  (`expo.ts:8,48-66`), e as notificações são escritas em lotes de 450
  (`jobs/events.ts:43`, `handlers.ts:32`) — abaixo do limite de 500 do
  Firestore. Sem `Promise.all` sem limite em lado nenhum das Functions.
- **`onSimulationWritten` tem os recursos declarados à mão** (180 s,
  512 MiB — `index.ts:130`). Com as imagens reescritas a 1 024 px antes de
  irem para base64, o pico de memória de uma simulação anda nas dezenas de
  MB, muito abaixo dos 512 MiB; e 180 s cobrem com folga os 10–30 s típicos
  do modelo de imagem. Não é achado.
- **`Photo` tem fallback estável e sem ícone decorativo** (gradiente por
  `seed`, `Photo.tsx:26-30,50`), e volta a tentar quando o URL muda
  (`:36`) — comportamento correto, sem re-render desnecessário.

### Perguntas da lista de verificação

1. **Qual é o ecrã que mais lê por abertura?** O Portfólio: `W` documentos,
   onde `W` é o número total de trabalhos publicados, sem tecto (DES-01). A
   página de departamento lê o mesmo mais as amostras (`W + S + 1`).
2. **Que query parte em produção por falta de índice?** Nenhuma — ver acima.
3. **Que listas mostram imagens em tamanho original?** Nenhuma mostra o
   original (o backoffice já limita a 1 600 px no upload), mas Alertas
   (44 px), Portfólio (170 px), Eventos, Perfil e Departamento pedem todas
   os 1 600 px em vez do `thumbnailUrl` de 480 px que já existe — DES-02.
4. **Quanto custa o job diário a 5 000 clientes?** ≈ 29 000 leituras/dia
   (~0,01 €) e ~90 s dos 540 s disponíveis. Cabe; o ponto de rutura são
   ~1 800 trabalhos com acompanhamento ativo no mesmo dia — ver a fórmula
   em DES-05.
5. **O que re-renderiza a app inteira sem precisar?** Nada de grave: o
   `AuthContext` está memoizado e muda uma vez por dia e por sessão com o
   `lastActiveAt`. O problema de render está nas listas (DES-03) e na
   `ClientsPage` do backoffice (DES-08), não nos contextos.
6. **O que está bem?** A lista acima.

## Não verificado

- **Peso do bundle da app (web).** Não existe build (`npx expo export --platform web`)
  e a instrução era não correr builds. O número de DES-09 (785 240 B de
  fontes) é medido nos `.ttf` do `node_modules`, não no bundle final; o peso
  do JS da app web — SDK do Firebase, React Navigation, `react-native-web`,
  `react-native-svg`, `expo-video` — fica por medir. `expo-video` e
  `expo-notifications` entram no bundle web sem lá servirem para nada
  óbvio: vale uma passagem quando houver build.
- **Tamanhos reais das imagens no Cloudinary.** Os "~250 KB por foto de
  1 600 px" são a ordem de grandeza típica de `q_auto,f_auto`; não abri a
  Media Library nem fiz pedidos HEAD (seriam chamadas a um serviço externo).
  A razão entre `w_1600` e `w_480` (~6–10×) é o que sustenta DES-02 e essa
  não depende do valor absoluto.
- **Contagens reais de documentos por coleção** nos projetos dev e prod —
  não corri scripts contra o Firebase (proibido nesta corrida). Todos os
  limiares ("~80 trabalhos", "~1 800 acompanhamentos ativos") são derivados
  do código e de custos típicos de ida-e-volta ao Firestore (~50–100 ms),
  não medidos.
- **Tamanho dos índices automáticos** (DES-19) — precisa da consola do
  Firebase (Firestore → Utilização), sem acesso a partir daqui. Daí a
  confiança `provável`.
- **Latência real do Vertex AI** em `onSimulationWritten`: o ROADMAP diz
  10–30 s e o timeout são 180 s, mas não há medições de produção — a Secção
  16 ainda tem passos pendentes do lado do Fábio (ativar a API, papel
  "Vertex AI User"), por isso nunca correu com volume.
- **Comportamento com cache fria vs. quente no telemóvel real.** DES-13
  descreve o que o SDK faz por construção; não foi observado no Marble Dev.
