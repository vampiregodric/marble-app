# Vertente: desempenho

Objetivo: encontrar o que fica lento ou caro quando há mais clientes,
mais trabalhos e mais fotos — leituras do Firestore, imagens, listas,
re-renderizações, Cloud Functions — sem correr profilers. Estática, só
leitura. Diz sempre a que escala o padrão começa a doer: o projeto tem hoje
dezenas de documentos por coleção, não milhares.

Âmbito habitual: `src/`, `functions/src/`, `../marble-backoffice/src`,
`firestore.indexes.json`, `firestore.rules` (só para saber que queries são
possíveis).

## Método

### 1. Firestore — leituras e escutas

1. **Inventário de queries:** para cada `onSnapshot`, `getDocs`, `getDoc`
   em `src/data/*.ts`, `src/data/firestoreHooks.ts` e
   `../marble-backoffice/src/data/{hooks,DataContext}.tsx`: coleção,
   filtros, `orderBy`, `limit`, se é escuta ou leitura única, e em que
   ecrã/página vive. Tabela no relatório.
2. **Sem `limit`:** cada query sem limite numa coleção que cresce com os
   clientes (`notifications`, `requests`, `simulations`, `vehicles`,
   `works`) é achado — diz o custo (docs lidos por abertura de ecrã) e a
   escala a que importa.
3. **Índices:** cada combinação `where` + `orderBy` (e `where` de
   igualdade com desigualdade) precisa de índice composto — cruza com
   `firestore.indexes.json`. Um índice em falta rebenta em produção na
   primeira query (o SDK devolve erro com o link). Um índice a mais custa
   escritas.
4. **N+1:** `getDoc` dentro de `map`/`for` (ex.: carregar o cliente de
   cada pedido, o trabalho de cada notificação). Backoffice:
   `DataContext.tsx` subscreve coleções inteiras — quantas e com que
   volume previsível; a página Pedidos lê `clients` por pedido?
5. **Escutas que nunca fecham:** `onSnapshot` sem `unsubscribe` no
   cleanup, ou dentro de componentes de lista (uma escuta por item).
6. **Persistência offline:** o SDK JS está com cache (`initializeFirestore`
   com `persistentLocalCache`?) — em RN não há IndexedDB; diz o que está
   ativo e o efeito (arranque, dados no ecrã antes da rede).

### 2. Imagens e vídeo

1. URLs do Cloudinary: as listas usam `thumbnailUrl` (transformação
   `w_`, `q_auto`, `f_auto`) ou a imagem original? Onde se constrói o URL
   (`src/media/images.ts`, `../marble-backoffice/src/media/cloudinary.ts`).
2. Tamanho enviado: a app reduz a foto antes do upload
   (`expo-image-manipulator` — dimensão e qualidade) para avatar, pedidos e
   simulador? Números.
3. `expo-video` no detalhe do trabalho: carrega ao abrir o ecrã ou ao
   tocar? Vários vídeos numa galeria?
4. `Photo.tsx`: cache, placeholder, `resizeMode`; re-download ao voltar ao
   ecrã.

### 3. React / React Native

1. Contextos (`AuthContext`, `DataContext`, i18n): o `value` é memoizado?
   Uma mudança de `lastActiveAt` re-renderiza a app inteira?
2. Listas: `FlatList`/`SectionList` vs `map` dentro de `ScrollView` com
   dezenas de itens; `keyExtractor`; `renderItem` com closures novas por
   render; `getItemLayout` onde os itens têm altura fixa.
3. Cálculos pesados no render (filtros/sorts de listas inteiras em cada
   render sem `useMemo`) — `PortfolioScreen`, `AlertsScreen`,
   `SimulatorScreen`, páginas de lista do backoffice.
4. Arranque: fontes (`@expo-google-fonts/*` — quantas famílias/pesos),
   `SplashScreen`, primeira leitura do Firestore antes de mostrar UI.
5. Web (`react-native-web`): bundle — o que entra que só serve no nativo.

### 4. Cloud Functions

1. Importações no topo de `index.ts` que só uma função usa (cold start
   das restantes) — pesos relativos.
2. `dailyJobs`: quantas leituras por dia em função de N clientes / N
   veículos / N notificações (`receipts.ts`, `followUps.ts`,
   `retention.ts`, `events.ts`). Fórmula e valor para N = 100 e N = 5000.
   Cabe em 540 s?
3. Push (`expo.ts`, `push.ts`): lotes de 100, `Promise.all` sem limite de
   concorrência, recibos.
4. `simulations.ts`: duas imagens em base64 em 512 MiB; download da foto
   do cliente e upload do resultado — tamanhos máximos; 180 s de timeout
   chegam para o Vertex nos piores casos?
5. Triggers `onDocumentWritten` que correm em cada update sem filtrar cedo
   (ex.: `onWorkWritten` a cada edição no backoffice).

### 5. Backoffice

Bundle (se `../marble-backoffice/dist` existir, lista os tamanhos dos
`assets/*.js`; se não, diz que não construíste), code splitting por rota,
subscrições em `DataContext` vs por página, tabelas com centenas de linhas
sem paginação nem virtualização, uploads em série vs paralelo.

## Lista de verificação

1. Qual é o ecrã da app que mais lê por abertura, e quanto (docs)?
2. Que query parte em produção por falta de índice?
3. Que listas mostram imagens em tamanho original?
4. Quanto custa o job diário a 5000 clientes (leituras, tempo)?
5. O que re-renderiza a app inteira sem precisar?
6. O que está bem (com ficheiro): limites, thumbnails, memoização.

## Rubrica desta vertente

- **Crítico:** custo ou tempo que cresce com o tamanho de uma coleção
  inteira em cada abertura de ecrã ou em cada trigger, sem limite, em
  código que corre em produção hoje.
- **Alto:** índice em falta; escuta que não fecha; imagens originais em
  listas; job diário que não escala a 5000 clientes.
- **Médio:** N+1 com dezenas de leituras; contexto sem memo com efeito
  visível; bundle com peso evitável.
- **Baixo / Sugestão:** micro-otimizações, `useMemo` em cálculos leves.

## Não é achado

- Escutar coleções inteiras no backoffice quando têm dezenas de
  documentos — regista o limiar a partir do qual passa a ser (e a
  paginação a adotar nessa altura), como Sugestão.
- `maxInstances: 5` e `256MiB` nas Functions — escolha documentada.

## Entrega

Relatório no formato de `esquema.md`, com o inventário de queries e o
mapa "caminho quente → custo" em "O que está bem" ou como evidência. Sem
medir nada: são estimativas a partir do código, e dizes que o são.
