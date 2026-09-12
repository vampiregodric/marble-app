# Auditoria 2026-09-12 — dependencias

## Âmbito

Três projetos, só leitura, nenhum ficheiro alterado (`git status --porcelain`
vazio nos dois repositórios no fim da corrida).

Commits: app `691938a` (2026-09-12), backoffice `1c532f2` (2026-09-10).

Ficheiros lidos (18): `package.json` + `package-lock.json` da raiz, de
`functions/` e de `../marble-backoffice/`; `functions/tsconfig.json`;
`tsconfig.json`; `firebase.json`; `eas.json`; `app.json`;
`src/navigation/RootNavigator.tsx`; `scripts/build-icons.mjs`;
`scripts/auth-email-config.mjs`; `CLAUDE.md`; `AGENTS.md`; `DEVELOPMENT.md`
(capítulos "Notificações push e Cloud Functions", "Deploy", "Instalar uma vez
(PC novo)", "Segundo PC"); `.claude/skills/auditoria/vertentes/dependencias.md`.

Ficou de fora: o conteúdo de `node_modules` salvo para confirmar chamadas
concretas (`uuid`, `@types/node`); não foi avaliada a segurança do código
das dependências, só a sua proveniência, versão e alcance.

### Comandos corridos (todos de leitura)

| Comando | Pasta | Resultado em uma linha |
|---|---|---|
| `node -v` / `npm -v` | — | Node v24.19.0, npm 11.17.0 (as Functions correm em Node 22) |
| `npm audit --json` | raiz | 25 moderados, 0 altos, 0 críticos (746 pacotes) |
| `npm audit --omit=dev --json` | raiz | 18 moderados — os 7 que desaparecem são a cadeia do `firebase-admin` (devDependency) |
| `npm audit --json` | `functions` | 8 moderados, 0 altos, 0 críticos (243 pacotes) |
| `npm audit --omit=dev --json` | `functions` | 9 moderados (junta `firebase-functions`, que entra na cadeia quando a árvore encolhe) |
| `npm audit --json` | backoffice | 16 moderados, 0 altos, 0 críticos (914 pacotes, 815 deles de dev) |
| `npm audit --omit=dev --json` | backoffice | **0 vulnerabilidades** — tudo o que o backoffice publica está limpo |
| `npm outdated --json` | raiz | 23 pacotes atrás; 12 são patches dentro do SDK 57, o resto são majors (RN 0.87, React 19.3, TS 7, firebase-admin 14) |
| `npm outdated --json` | `functions` | 3: `firebase-admin` 13.10→14.4, `google-auth-library` 10.9→11.0, `typescript` 5.9→7.0 |
| `npm outdated --json` | backoffice | 10; majors pendentes: `vite` 7→8, `@vitejs/plugin-react` 5→6, `firebase-admin` 13→14, `typescript` 5.9→7 |
| `npm ls --depth=0` | as três | Nenhum `UNMET`, nenhum `invalid`, nenhum `extraneous` — os três lockfiles estão em sintonia com o `package.json` |
| `npx expo install --check` | raiz | Saída 1, 12 pacotes `expo-*` abaixo do esperado pelo SDK 57; **nada foi corrigido** (sem prompt, `CI=1`, stdin fechado) |
| `npm ls uuid` / `npm ls pngjs` / `npm ls google-auth-library` | raiz, `functions` | Traçagem das cadeias (ver achados DEP-03 e DEP-06) |
| `git ls-files \| grep package` | app, backoffice | Os três `package-lock.json` estão no git |
| `git log -1 -- <lockfile>` | app, backoffice | Raiz 2026-09-05, `functions` 2026-09-09, backoffice 2026-09-03 |
| Varrimento dos três lockfiles (script próprio) | — | 0 origens fora de `registry.npmjs.org`, 0 `git+`/`file:`/`link`, todos com `integrity`; 2 pacotes com script de instalação na app e nas Functions, 5 no backoffice |
| Varrimento de imports (script próprio, 150 ficheiros) | `src`, `functions/src`, `scripts`, `../marble-backoffice/src` | 2 dependências fantasma na raiz (ver DEP-03) |

### Tabela de alcance

| Pacote | Versão | Severidade npm | Onde corre | Alcançável | Ação | Esforço |
|---|---|---|---|---|---|---|
| `uuid` | 9.0.1 | moderado (GHSA-w5hq-g745-h8pq, CVSS 7.5) | Node 22 das Functions, via `firebase-admin` → `google-gax`/`teeny-request`/`gaxios` | **não** — todas as chamadas são `v4()`; a falha é em `v3`/`v5`/`v6` com `buf` | subir no major `firebase-admin` 14 | M |
| `uuid` | 9.0.1 | moderado (mesmo advisory) | só build/dev da raiz (`xcode` ← `@expo/config-plugins`) e scripts locais (`firebase-admin`) | não | esperar pelo Expo | — |
| `decode-uri-component` | ≤0.4.2 | moderado (GHSA-vcc3-ghjq-m6fr, DoS) | bundle da app, via `query-string` ← `@react-navigation/core` | **provável só no web de dev** — no nativo `prefixes: []` e sem `scheme` no `app.json` | esperar upstream (`fixAvailable: false`) | — |
| `@opentelemetry/core` | <2.8.0 | moderado (GHSA-8988-4f7v-96qf) | devDependency do backoffice (`firebase-tools` → `@google-cloud/pubsub`) | não (dev) | `firebase-tools` 15.30.0 | S |
| `csv-parse` | <7.0.2 | moderado (GHSA-8cw4-87c7-c6xx) | devDependency do backoffice (`firebase-tools`) | não (dev) | idem | S |
| `stream-json` | ≤3.4.0 | moderado (GHSA-528h-pc64-c93x) | devDependency do backoffice (`firebase-tools`) | não (dev) | idem | S |
| `qs` | 6.15.x | moderado ×2 (GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g) | devDependency do backoffice (`express`/`body-parser` do servidor local do `firebase-tools`) | não (dev) | idem | S |
| `firebase-admin` | 13.10.0 | moderado (propagação) | Functions (prod), scripts locais, devDep do backoffice | via `uuid` → não | major 14.4.0 | M |
| `@google-cloud/firestore`, `@google-cloud/storage`, `google-gax`, `retry-request`, `teeny-request`, `gaxios` | várias | moderado (propagação) | Functions (prod) | não — nenhum advisory próprio, só arrastam `uuid` | resolvido pelo `firebase-admin` 14 | M |
| `expo`, `@expo/cli`, `@expo/config`, `@expo/config-plugins`, `@expo/metro-config`, `@expo/prebuild-config`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `xcode`, `expo-splash-screen` | SDK 57 | moderado (propagação de `uuid`) | só ferramenta de build (CLI, prebuild) — não entra no bundle | não | nenhuma; o `fixAvailable` do npm aponta `expo@46`, uma regressão de 11 SDKs que não se faz | — |
| `@react-navigation/native`, `/core`, `/elements`, `/bottom-tabs`, `/native-stack` | 7.x | moderado (propagação de `decode-uri-component`) | bundle da app | ver linha do `decode-uri-component` | esperar upstream | — |
| 12 pacotes `expo-*` | 57.0.x | sem advisory | app nativa (a build EAS instala do lockfile) | n/a | `npx expo install` (patches dentro do SDK 57) | S |
| `firebase-tools`, `eas-cli` | **sem pin** | sem advisory | deploys e builds de **produção**, a partir da pasta da app | **sim** — executa com credenciais de prod | declarar em `devDependencies` da app | S |

## Contagem

| Severidade | Achados |
|---|---|
| Crítico | 0 |
| Alto | 1 |
| Médio | 5 |
| Baixo | 3 |
| Sugestão | 1 |

## Achados

### DEP-01 — Deploys e builds de produção correm `firebase-tools`/`eas-cli` sem versão fixa
- **Vertente:** dependencias
- **Severidade:** Alto
- **Superfície:** dependencias
- **Onde:** `DEVELOPMENT.md:983`, `DEVELOPMENT.md:992`, `DEVELOPMENT.md:1320`, `DEVELOPMENT.md:1333`, `eas.json:3`, `package.json:36-40`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** todos os deploys (Functions, regras do Firestore, hosting de prod) e todas as builds/submissões de loja são feitos com `npx.cmd firebase-tools ...` e `npx.cmd eas-cli ...` a partir da pasta da app, onde nenhum dos dois está instalado nem declarado. O `npx` vai buscar a versão mais recente ao registo npm e executa-a, sem lockfile e sem verificação de integridade, com as credenciais da Firebase e da Google Play. O backoffice já faz o contrário: `firebase-tools: "^15.29.0"` nas `devDependencies` e o deploy por `npm run deploy:dev`.
- **Cenário de falha:** uma versão comprometida (ou só com uma regressão) de `firebase-tools` publicada no npm é descarregada e corrida na próxima vez que o Fábio fizer `npx.cmd firebase-tools deploy --only hosting:legal --project prod`; corre com a sessão de prod da Firebase CLI já autenticada. Variante sem malícia e muito mais provável: o PC de casa e o do escritório apanham versões diferentes em dias diferentes e um deploy comporta-se de forma diferente do outro — exatamente o que a regra "Dois PCs" do `CLAUDE.md` existe para evitar ("o git é a única memória partilhada"; uma versão que nunca é escrita em lado nenhum não passa de um PC para o outro).
- **Evidência:**
```
$ ls node_modules/firebase-tools node_modules/.bin/firebase*   # na pasta da app
ls: cannot access 'node_modules/firebase-tools': No such file or directory
ls: cannot access 'node_modules/.bin/firebase*': No such file or directory

DEVELOPMENT.md:992  5. **Páginas legais** (prod, quando quiser): `npx.cmd firebase-tools deploy --only hosting:legal --project prod`.
DEVELOPMENT.md:1320 - Parte 2: `npx.cmd eas-cli build --profile production --platform android`
eas.json:3    "version": ">= 16.0.0"      <- chão sem tecto: aceita qualquer major futuro do EAS CLI
```
- **Correção proposta:** declarar as duas ferramentas nas `devDependencies` da app, com a mesma versão que o backoffice já usa, e trocar os comandos do `DEVELOPMENT.md` por scripts do `package.json` (o lockfile passa a fixar a versão e a integridade, e os dois PCs ficam iguais com `npm ci`):
```json
"devDependencies": {
  "eas-cli": "^16.0.0",
  "firebase-tools": "^15.30.0"
},
"scripts": {
  "deploy:functions:dev": "firebase deploy --only functions --project dev",
  "deploy:legal:prod": "firebase deploy --only hosting:legal --project prod"
}
```
  No `eas.json`, trocar `">= 16.0.0"` por um intervalo com tecto (`"^16.0.0"`). Nota: isto muda um fluxo que está a funcionar, por isso é para propor ao Fábio em escolha múltipla, não para trocar por iniciativa própria (regra 6 do `CLAUDE.md`).
- **Esforço:** S

### DEP-02 — 12 pacotes do Expo abaixo do SDK 57 e o lockfile leva-os para a build de loja
- **Vertente:** dependencias
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `package.json:14-26`, `package-lock.json`, `eas.json:30-41`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `npx expo install --check` acusa 12 pacotes `expo-*` abaixo da versão que o SDK 57 espera — entre eles `expo-notifications` (o coração da Secção 6), `expo-image-picker` e `expo-splash-screen`. Como a build EAS instala a partir do `package-lock.json`, é esta combinação antiga que vai dentro do APK/AAB. O lockfile da raiz não é tocado desde 2026-09-05.
- **Cenário de falha:** a build `production` da Secção 11 sai com `expo-notifications@57.0.16` enquanto o `expo@57.0.19` (e o runtime nativo que ele gera) espera `57.0.18`; o próprio Expo avisa "Your project may not work correctly until you install the expected versions". Um defeito assim só aparece no telemóvel, depois de a build estar submetida — e uma build de loja não se repete em minutos.
- **Evidência:**
```
$ CI=1 npx --no-install expo install --check
The following packages should be updated for best compatibility with the installed expo version:
  expo@57.0.19 - expected version: ~57.0.22
  expo-notifications@57.0.16 - expected version: ~57.0.18
  expo-image-picker@57.0.15 - expected version: ~57.0.17
  expo-splash-screen@57.0.8 - expected version: ~57.0.9
  (… 8 outros: expo-constants, expo-dev-client, expo-device, expo-font,
     expo-image-manipulator, expo-linear-gradient, expo-localization, expo-video)
Found outdated dependencies
exit=1
```
- **Correção proposta:** correr `npx expo install --fix` (só ele — é a ferramenta que o Expo dá para isto e mantém os `~`), fazer commit do `package.json` + `package-lock.json`, e verificar a app na Marble Dev antes de qualquer build de loja. São todos patches dentro do SDK 57, não há salto de major. Fazer isto **antes** da build `production`, nunca entre a build e a submissão.
- **Esforço:** S

### DEP-03 — Dois scripts da raiz importam pacotes que ninguém declarou (`pngjs`, `google-auth-library`)
- **Vertente:** dependencias
- **Superfície:** scripts
- **Severidade:** Médio
- **Onde:** `scripts/build-icons.mjs:19`, `scripts/auth-email-config.mjs:20`, `package.json:36-40`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `scripts/build-icons.mjs` importa `pngjs` e `scripts/auth-email-config.mjs` importa `google-auth-library`; nenhum dos dois está no `package.json` da raiz. Só funcionam porque o npm iça pacotes transitivos para a raiz do `node_modules`. `pngjs` está lá em 3.4.0 (quatro majors atrás do atual) por causa de `expo-notifications` → `@expo/image-utils` → `parse-png`; `google-auth-library` está lá por causa do `firebase-admin`.
- **Cenário de falha:** a correção do DEP-02 (`expo install --fix`) sobe o `expo-notifications` e, com ele, a cadeia `@expo/image-utils`. Se essa cadeia deixar de usar `parse-png` — ou passar a usar `pngjs@7` — o `npm run build:icons` deixa de correr, ou passa a correr contra uma API diferente, sem que nada no `package.json` tenha mudado. A pista do erro não aponta para a causa: o script quebra por causa de uma dependência do push.
- **Evidência:**
```
$ npm ls pngjs
marble-app@1.0.0
`-- expo-notifications@57.0.16
  `-- @expo/image-utils@0.11.5
    `-- parse-png@2.1.0
      `-- pngjs@3.4.0            <- scripts/build-icons.mjs:19 usa isto diretamente

$ npm ls google-auth-library
marble-app@1.0.0
`-- firebase-admin@13.10.0
  `-- google-auth-library@10.9.1  <- scripts/auth-email-config.mjs:20 usa isto diretamente
```
- **Correção proposta:** declarar os dois nas `devDependencies` da raiz (é o que `functions/package.json:18` já faz com o `google-auth-library`, que lá está explícito):
```json
"devDependencies": {
  "google-auth-library": "^10.9.1",
  "pngjs": "^7.0.0",
  ...
}
```
  Ao subir o `pngjs` para 7 há que confirmar `scripts/build-icons.mjs` (a API `new PNG({...})` mantém-se, mas vale a pena correr `npm run build:icons` e comparar os ícones gerados). Se se preferir não mexer na versão, declarar `"pngjs": "^3.4.0"` já resolve a fragilidade.
- **Esforço:** S

### DEP-04 — `predeploy` das Functions compila com o TypeScript 6 da raiz quando falta o `node_modules` de `functions/`
- **Vertente:** dependencias
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `firebase.json:11-13`, `functions/package.json:10`, `functions/package.json:21`, `package.json:39`, `DEVELOPMENT.md:986-989`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o projeto tem dois compiladores: `typescript ~6.0.3` na raiz e `^5.9.0` em `functions/`. O `predeploy` do `firebase.json` corre `npm --prefix "$RESOURCE_DIR" run build`, que resolve o `tsc` pela cadeia de `node_modules/.bin` — se `functions/node_modules` não existir, apanha o TypeScript 6 da raiz e o deploy rebenta com TS5107. Já aconteceu, e a mitigação é uma instrução escrita no `DEVELOPMENT.md` que o operador tem de se lembrar de seguir.
- **Cenário de falha:** exatamente o caso "Segundo PC" do `CLAUDE.md` — o Fábio clona no escritório, corre `npm ci` na raiz (é o que a memória muscular manda), e o primeiro `firebase deploy --only functions` falha com um erro de `moduleResolution` que não tem nada a ver com o que ele estava a fazer. Passo 3 do capítulo "Instalar uma vez" (`DEVELOPMENT.md:1560`) manda correr `npm ci` nas três pastas, mas nada impede o deploy de arrancar sem isso.
- **Evidência:**
```
firebase.json:11-13    "predeploy": [ "npm --prefix \"$RESOURCE_DIR\" run build" ]
functions/package.json:10   "build": "tsc"
functions/package.json:21   "typescript": "^5.9.0"     (instalado: 5.9.3)
package.json:39             "typescript": "~6.0.3"     (instalado: 6.0.3)

DEVELOPMENT.md:986-990  "atenção: se a pasta `functions` do checkout não tiver `node_modules`,
   o predeploy usa o TypeScript 6 da raiz e falha com TS5107 (`moduleResolution=node10`);
   corre `npm ci` em `functions/` primeiro."
```
- **Correção proposta:** deixar de depender da memória do operador — pôr a instalação no próprio `predeploy`, que é o único sítio por onde o deploy passa sempre:
```json
"predeploy": [
  "npm --prefix \"$RESOURCE_DIR\" ci",
  "npm --prefix \"$RESOURCE_DIR\" run build"
]
```
  A alternativa mais barata (mas que não fecha o buraco) é acrescentar `"moduleResolution": "node10"` explícito ao `functions/tsconfig.json` para o TS6 aceitar o projeto. A nota do `DEVELOPMENT.md:986` passa a descrever o comportamento, não um passo manual.
- **Esforço:** S

### DEP-05 — Functions compiladas contra tipos do Node 26 mas correm em Node 22, e nada fixa o Node local
- **Vertente:** dependencias
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/package.json:6-8`, `functions/tsconfig.json:1-17`, `firebase.json:9`, `DEVELOPMENT.md:1535`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `functions/package.json` declara `engines.node: "22"` e o `firebase.json` declara `runtime: "nodejs22"`, mas `functions/package.json` não declara `@types/node`. O TypeScript vai então buscar o `@types/node@26.4.1` que o `firebase-functions` arrasta (via `@types/cors`/`@types/express`), e o `functions/tsconfig.json` não tem `"types"` para o travar. Resultado: o compilador valida o código contra a biblioteca-padrão de um Node quatro majors à frente daquele onde o código vai correr. Somando: o Node local é 24.19.0, o `DEVELOPMENT.md:1535` só diz "Node.js LTS" sem major, e não há `engines` na raiz nem no backoffice, nem `.nvmrc`, nem `.npmrc` em lado nenhum.
- **Cenário de falha:** alguém usa uma API que só existe a partir do Node 24 ou 26 (por exemplo `import`/globais novos de `node:util` ou `node:fs`). O `npm run functions:typecheck` passa, o `npm run functions:build` passa, o deploy passa — e a função rebenta em execução no Node 22, em produção, com `TypeError: ... is not a function`. `functions/src` usa globais do Node em cinco ficheiros (`cloudinary.ts`, `index.ts`, `scripts/runJobs.ts`, `simulations.ts`, `vertex.ts`), por isso a superfície não é teórica.
- **Evidência:**
```
$ npm ls @types/node          # na pasta functions
marble-functions@
+-- firebase-admin@13.10.0 ... `-- @types/node@26.4.1 deduped
`-- firebase-functions@7.3.2
  +-- @types/cors@2.8.19 `-- @types/node@26.4.1     <- é este que o tsc usa
$ node -e "require('./node_modules/@types/node/package.json').version"  -> 26.4.1

functions/package.json:6-8   "engines": { "node": "22" }
firebase.json:9              "runtime": "nodejs22"
functions/tsconfig.json      sem "types" -> inclui todos os @types encontrados
```
- **Correção proposta:** declarar o tipo certo e fechar a porta aos outros:
```jsonc
// functions/package.json
"devDependencies": { "@types/node": "^22.0.0", "typescript": "^5.9.0" }

// functions/tsconfig.json
"compilerOptions": { "types": ["node"], ... }
```
  E, para o Node local, acrescentar `"engines": { "node": ">=22" }` à raiz e registar no `DEVELOPMENT.md:1535` qual o major LTS instalado em casa (24.19.0 a 2026-09-12), para o PC do escritório não ficar noutro.
- **Esforço:** S

### DEP-06 — `firebase-admin` preso no 13.10 nos três projetos, com o major 14 já disponível
- **Vertente:** dependencias
- **Severidade:** Médio
- **Superfície:** functions
- **Onde:** `functions/package.json:16`, `package.json:38`, `../marble-backoffice/package.json:30`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o `firebase-admin@13.10.0` é a raiz de 8 dos 9 avisos moderados que o `npm audit --omit=dev` dá nas Functions, e o npm só oferece uma saída: o major `14.4.0`. O mesmo 13.10.0 está declarado nos três projetos, por isso o salto tem de ser coordenado (Functions em produção, scripts de administração da raiz, scripts do backoffice). Quanto mais tempo passa, mais breaking changes se acumulam num salto que já vai ter de ser feito.
- **Cenário de falha:** não há exploração conhecida por aqui — a análise de alcance mostra que o único advisory real da cadeia (`uuid` GHSA-w5hq-g745-h8pq) **não é alcançável** (ver DEP-09). O risco é de dívida: o dia em que uma vulnerabilidade **alcançável** sair no `@google-cloud/firestore` ou no `google-auth-library`, a correção vai exigir o major 14 na mesma, mas com o prazo de um incidente em vez de uma tarde calma. `google-auth-library` (10.9 → 11.0) está na mesma situação em `functions/package.json:18`.
- **Evidência:**
```
$ npm audit --omit=dev --json    # functions
{"moderate":9,"high":0,"critical":0}
firebase-admin  moderate  isDirect=true  fixAvailable={"name":"firebase-admin","version":"14.4.0","isSemVerMajor":true}
  -> @google-cloud/firestore, @google-cloud/storage, google-gax, retry-request, teeny-request, gaxios, uuid

$ npm outdated --json   # functions
firebase-admin       13.10.0 -> 14.4.0
google-auth-library  10.9.1  -> 11.0.2
```
- **Correção proposta:** tarefa própria, fora de uma secção de funcionalidade: ler as notas de migração do `firebase-admin` 14, subir os três `package.json` ao mesmo tempo, correr `npm run functions:build`, `npm run typecheck` nos três, `npm run check:firestore:auth -- <chave>` e `npm run functions:jobs -- <chave>` contra o `dev` antes de qualquer deploy. Não misturar com o `google-auth-library` 11 no mesmo commit.
- **Esforço:** M

### DEP-07 — `decode-uri-component` no bundle da app: DoS só alcançável pela build web de desenvolvimento
- **Vertente:** dependencias
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/navigation/RootNavigator.tsx:112-113`, `src/navigation/RootNavigator.tsx:165`, `package.json:11-13`, `app.json:1-80`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o único advisory que chega ao bundle da app é o `GHSA-vcc3-ghjq-m6fr` no `decode-uri-component` (DoS por descodificação exponencial de percentagens malformadas), que entra por `query-string` ← `@react-navigation/core`. No nativo não é alcançável: o `linking` tem `prefixes: []` e o `app.json` não declara `scheme`, por isso nenhum URL externo chega ao parser. Na build web (a que corre em `expo start --web` para as revisões de UI) o React Navigation lê `window.location` e passa a query pelo `query-string`.
- **Cenário de falha:** alguém abre a preview web com um URL de query malformado propositadamente (`?a=%E0%A4%A`…) e o separador bloqueia. É auto-DoS numa build que não é produto: o `firebase.json:22-41` só publica o alvo `legal` a partir de `docs/`, não há hosting da app web. O `npm audit` marca `fixAvailable: false` — não há versão corrigida a jusante, e a cadeia inteira do `@react-navigation` (5 pacotes) aparece no relatório só por propagação deste.
- **Evidência:**
```
$ npm audit --omit=dev --json    # raiz
decode-uri-component  moderate  range=<=0.4.2  fixAvailable=false
  via: GHSA-vcc3-ghjq-m6fr  "Denial of service via exponential decoding of malformed percent-encoded input"
  effects: query-string -> @react-navigation/core -> @react-navigation/native -> bottom-tabs, native-stack

src/navigation/RootNavigator.tsx:112-113
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],                 <- nenhum prefixo: no nativo não entra URL externo
$ grep -n "scheme" app.json     -> (sem resultados)
```
- **Correção proposta:** aceitar e reavaliar. Não há correção a jusante (`fixAvailable: false`) e o `@react-navigation` ainda não migrou para um parser sem esta falha. Voltar a verificar na próxima corrida da auditoria; se um dia a app web passar a ser publicada, isto sobe de severidade e passa a merecer um `overrides` do `decode-uri-component`.
- **Esforço:** S

### DEP-08 — Os 16 avisos do backoffice são todos de ferramentas de desenvolvimento
- **Vertente:** dependencias
- **Severidade:** Baixo
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/package.json:26-34`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o `npm audit` do backoffice dá 16 moderados, mas `npm audit --omit=dev` dá **zero**: tudo o que é publicado no hosting está limpo. Os 16 vivem em `firebase-tools` (`@opentelemetry/core`, `csv-parse`, `stream-json`, `uuid`, `gaxios`, `@google-cloud/pubsub`), no `express`/`body-parser`/`qs` do servidor local do emulador, e no `firebase-admin` dos scripts de administração. Nenhum precisa de correção urgente; o `firebase-tools` 15.30.0 (um patch) limpa a maioria.
- **Cenário de falha:** para qualquer um destes ser explorado seria preciso tráfego hostil dirigido ao emulador/servidor local do `firebase-tools` a correr no PC do Fábio, ou um ficheiro CSV/JSON hostil dado de comer à CLI. Não há caminho a partir do backoffice publicado.
- **Evidência:**
```
$ npm audit --json            # ../marble-backoffice
{"info":0,"low":0,"moderate":16,"high":0,"critical":0,"total":16}
$ npm audit --omit=dev --json # ../marble-backoffice
{"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
   (prod: 100 dependências; dev: 815)
$ npm outdated --json  ->  firebase-tools 15.29.0 -> 15.30.0
```
- **Correção proposta:** subir `firebase-tools` para `^15.30.0` no `../marble-backoffice/package.json` quando houver outro motivo para lá mexer (é um patch, limpa `csv-parse`, `stream-json`, `@opentelemetry/core` e `gaxios`). Não justifica uma tarefa só para isto.
- **Esforço:** S

### DEP-09 — `uuid` no runtime das Functions: presente, com CVSS 7.5, e não alcançável
- **Vertente:** dependencias
- **Severidade:** Baixo
- **Superfície:** functions
- **Onde:** `functions/package.json:16`, `package.json:38`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o `uuid@9.0.1` está dentro do Node 22 de produção (via `firebase-admin`) e tem o advisory de maior CVSS de toda esta auditoria (7.5, escrita fora de limites). Registado à parte porque um `npm audit` cru dá a entender que há um problema sério em produção — e não há: o advisory só afeta `v3`, `v5` e `v6` quando se lhes passa um `buf`, e **todas** as chamadas na árvore das Functions são `v4()`. O mesmo advisory aparece na raiz por dois caminhos, ambos fora de produção: `xcode` ← `@expo/config-plugins` (só prebuild) e `firebase-admin` (só os scripts locais do Fábio).
- **Cenário de falha:** nenhum neste projeto. Passa a haver um se alguma dependência futura começar a chamar `uuid.v5(nome, ns, buf)` — daí ficar registado em vez de descartado.
- **Evidência:**
```
$ grep -rn "uuid_1\.\|uuid\.v" node_modules/{google-gax,teeny-request,gaxios}/build/src/*.js
google-gax/build/src/util.js:108:      return (0, uuid_1.v4)();
teeny-request/build/src/index.js:135: const boundary = uuid.v4();
gaxios/build/src/gaxios.js:417:       const boundary = (0, uuid_1.v4)();
   (nenhuma ocorrência de v3/v5/v6 em toda a árvore)

advisory: GHSA-w5hq-g745-h8pq — "Missing buffer bounds check in v3/v5/v6 when buf is provided"
```
- **Correção proposta:** aceitar com motivo (a função vulnerável não é chamada) e deixar que saia com o major do `firebase-admin` do DEP-06. Reverificar na próxima corrida se a árvore mudar.
- **Esforço:** S

### DEP-10 — Nenhuma rotina automática vigia as dependências (não há `.github/`)
- **Vertente:** dependencias
- **Severidade:** Sugestão
- **Superfície:** dependencias
- **Onde:** raiz do repositório da app (sem `.github/`), `../marble-backoffice` (sem `.github/`)
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** não existe `.github/` em nenhum dos dois repositórios — nem `dependabot.yml`, nem `renovate.json`, nem workflow nenhum. Um advisory novo numa dependência de produção só aparece quando alguém correr `npm audit` à mão, e esta auditoria é o primeiro registo de que isso aconteceu.
- **Cenário de falha:** sai um advisory **alto e alcançável** no `firebase-admin` ou no `firebase` daqui a três meses. Ninguém é avisado. Descobre-se na auditoria seguinte, ou não se descobre.
- **Evidência:**
```
$ ls .github                       -> No such file or directory   (marble-app)
$ ls .github/dependabot.yml renovate.json .renovaterc*  -> nenhum existe
$ ls -a | grep -i "npmrc\|nvmrc"   -> nenhum, nos três projetos
```
- **Correção proposta:** um `.github/dependabot.yml` com três entradas `npm` (`/`, `/functions`, e outro tanto no repositório do backoffice), agrupadas e semanais, é o mais barato e não precisa de minutos de Actions. Se se quiser um travão real, um workflow que corra `npm audit --omit=dev --audit-level=high` nas três pastas falha o PR quando entrar algo alcançável em produção — repare-se que hoje esse comando passaria nos três projetos, por isso entra sem dívida pendente.
- **Esforço:** S

## O que está bem

- **Nenhuma vulnerabilidade crítica ou alta em nenhum dos três projetos**, com ou sem `devDependencies` (`npm audit --json` nas três pastas: 25 / 8 / 16 moderados, zero acima disso).
- **O backoffice publicado está limpo:** `npm audit --omit=dev` em `../marble-backoffice` dá 0 vulnerabilidades em 100 dependências de produção.
- **Os três `package-lock.json` estão no git** (`git ls-files`: `package-lock.json`, `functions/package-lock.json`, `../marble-backoffice/package-lock.json`) e batem certo com os `package.json` — `npm ls --depth=0` nas três pastas não dá um único `UNMET`, `invalid` ou `extraneous`.
- **Proveniência das dependências sem nada de estranho:** varrimento dos três lockfiles (746 + 243 + 914 pacotes) — todos resolvidos em `registry.npmjs.org`, todos com `integrity`, zero `git+`, `file:` ou `link:`.
- **Scripts de instalação só onde é normal:** `@firebase/util` e `protobufjs` na app e nas Functions; mais `esbuild`, `fsevents` e `re2` no backoffice. Todos pacotes conhecidos que precisam mesmo do passo de instalação (binários nativos).
- **Nenhum SDK de terceiros para os serviços externos, como o briefing supunha — confirmado.** Cloudinary (`src/media/cloudinary.ts:96`, `functions/src/cloudinary.ts:47,65`, `functions/src/simulations.ts:151`), Resend (`functions/src/email.ts:8`), Expo Push (`functions/src/expo.ts:6-7`) e Vertex AI (`functions/src/vertex.ts:45`) são todos chamados por `fetch`/XHR contra o endpoint HTTP. Quatro integrações externas a custo zero de superfície de dependências — é a decisão com melhor retorno de todo este relatório.
- **`google-auth-library` está declarado onde é usado a sério** (`functions/package.json:18`, para autenticar o Vertex AI); o problema do DEP-03 é só na raiz.
- **O alinhamento com o SDK 57 está certo em tudo o que não é `expo-*`:** `react@19.2.3`, `react-dom`, `react-native@0.86.3`, `react-native-web`, `react-native-screens`, `react-native-safe-area-context`, `react-native-svg` e `@react-native-async-storage/async-storage` não são acusados pelo `expo install --check` — as fixações exatas (sem `^`) no `package.json:28-30` estão a fazer o seu trabalho.
- **Pacotes declarados e não importados são todos legítimos:** `expo-font` e `expo-splash-screen` entram como plugins (`app.json:38,57`), `expo-dev-client`, `react-native-screens`, `react-native-web`, `react-dom` e `@expo/metro-runtime` são plataforma/nativo sem `import` no código. Nenhuma dependência a mais para remover.
- **O backoffice fixa o `firebase-tools` nas `devDependencies`** (`../marble-backoffice/package.json:31`) e faz o deploy por `npm run deploy:dev` — é o padrão certo, e é o que falta na app (DEP-01).

## Não verificado

- **Reprodutibilidade real dos lockfiles:** confirmar que um `npm ci` limpo dá exatamente esta árvore exigiria instalar, o que está fora do âmbito de leitura. A verificação feita foi indireta (`npm ls --depth=0` sem `invalid`/`UNMET` nos três projetos).
- **Advisories que o `npm audit` não cobre:** só foi consultada a base do registo npm. Não foram cruzadas outras fontes (GitHub Advisory fora do npm, OSV, Snyk), nem foi feita análise de pacotes abandonados ou com mudança recente de manutentor — o `npm audit` não detecta nenhuma dessas coisas.
- **`@types/node` no backoffice e na raiz:** foi confirmado o caso das Functions (DEP-05); não foi traçada a mesma cadeia nos outros dois projetos, onde o efeito é menor (não há runtime de servidor fixado).
- **Versões de `firebase-tools`/`eas-cli` realmente usadas nos deploys já feitos:** não é possível saber a posteriori quais foram (é precisamente o sintoma do DEP-01 — nada as regista).
- **Impacto concreto do salto `firebase-admin` 13 → 14:** as notas de migração do major não foram lidas; o DEP-06 avalia a dívida, não o custo exato do salto.
