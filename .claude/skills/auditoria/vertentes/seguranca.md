# Vertente: segurança

Objetivo: encontrar o que um cliente mal-intencionado, um membro da equipa
descuidado ou um estranho com o cloud name do Cloudinary consegue fazer que
não devia — e o que custa dinheiro ou expõe dados sem tecto. Só leitura.

Divide-se em duas partes (o orquestrador diz qual és):

- **Parte A:** `firestore.rules`, `firestore.indexes.json`, `functions/src`,
  `functions/.env*`, `scripts/`, `../marble-backoffice/scripts/`.
- **Parte B:** `src/`, `App.tsx`, `app.json`, `app.config.js`, `eas.json`,
  `.env.production`, `.env.example`, `google-services.json`, `locales/`,
  `../marble-backoffice/src`, `../marble-backoffice/index.html`,
  `../marble-backoffice/vite.config.ts`, `docs/`, `firebase.json`,
  `../marble-backoffice/firebase.json`, `.gitignore` dos dois repositórios
  e o histórico git.

As duas partes leem `src/firebase/models.ts` (o modelo de dados) e o
cabeçalho de `firestore.rules` (a intenção documentada).

## Método — Parte A

### 1. Matriz de acesso das regras

Para cada `match` em `firestore.rules`, preenche uma matriz
coleção × principal × operação e cola-a no relatório (secção "O que está
bem" ou como evidência de achados):

- principais: anónimo, cliente dono (`request.auth.uid == clientId`), outro
  cliente autenticado, equipa (`admin: true`);
- operações: `get`, `list`, `create`, `update`, `delete`.

Depois compara com a intenção escrita no cabeçalho do ficheiro e em
`SPEC.md`. Armadilhas a verificar uma a uma:

1. `resource.data` é nulo em `create` — qualquer função que o use
   (`ownsResource()`) numa regra de `create` nega sempre ou deixa passar o
   que não devia. Verifica cada `allow create`.
2. **As regras não filtram queries.** Para cada `list` permitido com
   condição sobre `resource.data` (ex.: `published == true`,
   `clientId == uid`), encontra TODAS as queries da app (`src/data/*.ts`) e
   do backoffice (`../marble-backoffice/src/data/hooks.ts`,
   `DataContext.tsx`) a essa coleção e confirma que levam o filtro que a
   regra exige. Uma query sem o filtro falha inteira — é defeito, e às
   vezes esconde uma regra que ninguém testa.
3. **Campos que o dono pode mudar em `update`.** Onde não há `hasOnly`
   sobre `affectedKeys()`, lista os campos do modelo (`models.ts`) e diz
   quais são da equipa ou das Functions e o que um cliente ganha ao
   escrevê-los: `clients/{uid}` é o caso principal (`notes`, `mergedInto`,
   `createdByTeam`, `retentionWarnedAt`, `deletedAt`, `consent.*`,
   `clientSince`, `pushTokens`, `locale`, `lastActiveAt`). Para cada campo:
   consequência concreta (adiar a retenção, forjar a data do consentimento,
   meter o push token de outra pessoa, marcar-se como "juntado" a outra
   ficha…).
4. **Campos escritos por clientes em que as Functions confiam.** Percorre
   `functions/src` e, para cada valor lido de um documento que um cliente
   pode escrever (regras) e que a Function usa para agir — apagar no
   Cloudinary por `publicId`/URL, enviar email com `name`/`email`/`message`,
   fazer push para `pushTokens`, chamar o Vertex com `source.*`/`photo.*`,
   ligar `requestId` — traça o caminho e diz o que um valor hostil faz.
   Exemplos a confirmar ou descartar: apagar um ficheiro alheio do
   Cloudinary criando uma simulação com o `publicId` de outra pessoa e
   apagando-a; injeção de HTML no email ao equipa via `message`; push para
   um token que não é do cliente.
5. **Validação campo a campo** (`validNewRequest`, `validNewSimulation`,
   `validNewCheckupRequest`): compara com `REQUEST_LIMITS`,
   `CHECKUP_LIMITS` e os tipos em `models.ts`. Listas (`services`,
   `fields`, `photos`) só têm tamanho limitado — o conteúdo chega à equipa
   e aos emails: onde é que é escapado?
6. **Coleções públicas** (`events`, `settings/*`, `works` publicados,
   `samples` publicados): há campos com dados pessoais (nome do cliente,
   matrícula, morada, `clientId`, notas internas) nos tipos `Work`,
   `Event`, `Sample`, `HomeSettings`? Se o backoffice escreve um campo
   assim, é exposição pública.
7. Coleções em `COLLECTIONS` sem `match` (negadas por omissão): a app ou o
   backoffice tentam usá-las?
8. Claim `admin`: como se dá (`../marble-backoffice/scripts/set-admin.mjs`),
   como se tira, se há lista de quem o tem, e se o backoffice o verifica
   só na UI (`AuthContext.tsx`) ou se as regras chegam.

### 2. Cloud Functions

Para cada trigger em `functions/src/index.ts` e para os jobs em
`functions/src/jobs/`:

1. **Loops de re-trigger:** a Function escreve no documento que a disparou?
   Como termina (comparação before/after, campo de estado)?
2. **Confiança em dados de cliente** (ponto A.4) — segue o fluxo até à
   chamada externa: Cloudinary (`cloudinary.ts` — o `publicId` apagado é
   restringido a uma pasta/prefixo?), Resend (`email.ts` — escapa HTML?),
   Expo (`expo.ts`, `push.ts` — valida o formato do token? trata os
   recibos `DeviceNotRegistered`?), Vertex (`vertex.ts` — o que vai no
   prompt vem do cliente? a resposta é validada antes de subir para o
   Cloudinary?).
3. **Tectos e custo:** `REQUEST_DAILY_CAP`, `SIMULATION_DAILY_CAP`, o
   limite por cliente. São aplicados DEPOIS da escrita (o trigger já
   correu, a foto já está no Cloudinary)? Como se conta o dia (fuso)? O
   que custa uma inundação de 1000 simulações antes do tecto? Há alguma
   forma de o tecto ser contornado (apagar e recriar, `platform` diferente)?
4. **Segredos:** `defineSecret` só; nada em `.env`; nenhum `logger`
   imprime segredo, token ou chave. Verifica o que os `logger.info`
   imprimem de dados pessoais (emails, nomes, telefones) — vai para o
   Cloud Logging.
5. **Job de retenção** (`jobs/retention.ts`): que critério apaga ou
   anonimiza; risco de apanhar contas ativas (o que conta como atividade);
   o que acontece a `vehicles`, `requests`, `simulations`, `notifications`
   da conta; apaga o utilizador do Auth? É reversível?
6. **Erros:** um erro a meio deixa documentos em `pending` para sempre?
   Retries do Eventarc duplicam emails/push?
7. **`scripts/runJobs.ts`:** corre contra que projeto; recusa o prod?

### 3. Scripts de administração (`scripts/`, `../marble-backoffice/scripts/`)

Por script: que chave usa (`serviceAccountKey.dev.json`/`.prod.json`),
se recusa o prod, se escreve ou só lê, se pede confirmação antes de
apagar/alterar, e o que acontece se se enganar no argumento. Chaves e
credenciais: `git ls-files` contra os padrões do `.gitignore` e
`git log --all -p -S 'private_key'`, `-S 'BEGIN PRIVATE KEY'`,
`-S 'serviceAccountKey'` para saber se alguma vez entrou uma chave no
histórico (se sim: Crítico, mesmo que já não esteja no HEAD).

`docs/store/*.md` tem credenciais da conta de demonstração das lojas:
avalia (repositório privado, mas é git).

## Método — Parte B

### 4. App (`src/`)

1. **Autenticação** (`src/auth/`): reset de password, verificação de
   email (existe? é exigida para alguma coisa?), reautenticação antes de
   apagar conta (`DeleteAccountScreen.tsx`), persistência da sessão
   (`authInstance.native.ts` — AsyncStorage), erros que revelam se um
   email existe (`errors.ts`), políticas de password (`validation.ts`).
2. **Login por token de dev** (`src/auth/devToken.ts`): as duas condições
   (browser + projeto acaba em `-dev`) são robustas numa build de produção
   web? De onde vem o projectId? Pode um `#token=` de um projeto ser aceite
   noutro?
3. **Uploads unsigned para o Cloudinary** (`src/media/cloudinary.ts`,
   `avatarPicker.ts`, `requestPhotos.ts`): presets usados, pastas, o que
   impede qualquer pessoa com o cloud name de encher a conta (limites do
   preset são configuração do Cloudinary — cita o que o README do
   backoffice diz estar configurado e o que não diz). O `publicId` é
   escolhido pela app ou pelo Cloudinary? Pode colidir com o de outro
   cliente?
4. **Metadados das fotos:** a foto é reencodada (`expo-image-manipulator`)
   antes de subir? Se não, vão coordenadas GPS do EXIF para o Cloudinary
   e para a equipa.
5. **Dados no dispositivo:** o que fica em AsyncStorage/localStorage
   (sessão, rascunhos, dados pessoais) e se sobrevive ao logout.
6. **Configuração pública:** `.env.production`, `google-services.json`,
   `app.json`, `app.config.js`: valores esperados (as chaves web do
   Firebase são públicas por desenho) — mas regista se `DEVELOPMENT.md`
   documenta restrições da chave de API na consola Google Cloud (HTTP
   referrers, apps Android por SHA); se não documenta, é achado Médio.
7. **Deep links / navegação:** algum ecrã aceita parâmetros que se
   tornem URL, HTML ou query sem validação?
8. **Web:** o que a build web expõe (`window.*`, tokens no hash,
   `console.log` com dados).

### 5. Backoffice (`../marble-backoffice/src`)

1. `AuthContext.tsx` + `NoAccessPage.tsx`: verifica o claim `admin` via
   `getIdTokenResult`? Força refresh do token depois do `set-admin`?
   Sessão persistente em que storage?
2. Escritas (`data/writes.ts`, páginas de formulário): tudo depende das
   regras `isAdmin()` — confirma que nenhuma escrita cria campos que as
   regras dos clientes depois consideram (ex.: `notifications` com HTML,
   `works` com dados de cliente).
3. `SendAlertModal.tsx`: texto livre → `notifications` → push. Há limite
   de tamanho? Vai para todos os clientes de uma vez?
4. `MediaUploader.tsx` + `media/cloudinary.ts`: preset unsigned da
   equipa; tamanho/tipo validados no cliente apenas?
5. `dangerouslySetInnerHTML`, `href` com valores de documentos (links
   `javascript:`), `window.open` com URLs de clientes (fotos dos pedidos).
6. `duplicates.ts` (juntar fichas): anonimiza ou apaga? Reversível?
7. `vite.config.ts` / `index.html`: variáveis `VITE_*` expostas, CSP.

### 6. Hosting e headers

`firebase.json` dos dois repositórios: o que `docs/` publica (o `ignore`
apanha tudo o que não deve sair?), headers (CSP, HSTS, X-Frame-Options —
ausência é Baixo, regista), rewrites do backoffice.

## Lista de verificação (responde a todas)

1. Um cliente consegue ler um documento de outro cliente? Por que caminho
   (get, list, Function)?
2. Um cliente consegue alterar um campo que é da equipa ou das Functions?
   Quais e com que efeito?
3. Um cliente consegue fazer uma Function agir sobre recursos de outro
   (Cloudinary, email, push, Vertex)?
4. Um anónimo consegue escrever alguma coisa? Ler algo com dados pessoais?
5. Alguém com o cloud name do Cloudinary consegue encher a conta ou
   sobrepor ficheiros?
6. Há segredos no git (HEAD ou histórico), nos `.env` versionados, nos logs?
7. Que custo máximo por dia tem um ataque de volume (pedidos, simulações,
   uploads, emails, push) com os tectos atuais?
8. O claim `admin` pode ser obtido ou mantido indevidamente?
9. O login por token de dev está mesmo morto em produção?
10. O que fica documentado em `DEVELOPMENT.md`/`ROADMAP.md` como risco
    aceite (App Check adiado, tecto diário como paliativo) — e o paliativo
    cobre o que promete?

## Rubrica desta vertente

- **Crítico:** leitura ou escrita cruzada entre clientes; segredo no git;
  Function que apaga ou envia para recursos alheios por valor de cliente;
  anónimo a escrever.
- **Alto:** abuso em volume sem tecto ou com tecto contornável; campo da
  equipa alterável pelo cliente com efeito real; injeção em email/push;
  retenção que pode apagar contas ativas.
- **Médio:** validação incompleta sem efeito cruzado; logs com dados
  pessoais; restrições de chave de API não documentadas; scripts sem
  guarda contra o prod.
- **Baixo:** headers em falta; endurecimentos.

## Não é achado

- As chaves web do Firebase e o cloud name do Cloudinary serem públicos.
- `works`/`events`/`samples`/`settings` públicos quando não têm dados
  pessoais — é o desenho.
- `delete: false` em `clients` — decisão documentada (RGPD por
  anonimização).
- App Check adiado — decisão do Fábio de 2026-09-06; reporta só se o
  paliativo (`REQUEST_DAILY_CAP`) não cobre o que `DEVELOPMENT.md` diz.

## Entrega

Relatório no formato de `esquema.md`, com a matriz de acesso (parte A) ou
a tabela de superfícies verificadas (parte B) em "O que está bem". Cada
achado com evidência. Não inventes linhas: se não leste, é "Não
verificado".
