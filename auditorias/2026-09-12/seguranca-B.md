# Auditoria 2026-09-12 — seguranca — parte B

Commits auditados: app `28b0700` (master, limpo), backoffice `1c532f2`.
Superfícies: app (`src/**`, config Expo/EAS), backoffice (`../marble-backoffice/src/**`),
Hosting (`docs/`, `firebase.json` dos dois repositórios), `.gitignore` e histórico git dos dois.
`firestore.rules` foi lida só para saber o que as regras deixam a app e o backoffice
fazer; os achados sobre as regras em si são da parte A.

## Âmbito

**Lidos na íntegra (app, 38 de 72):** `src/auth/*` (4), `src/firebase/*` (5, incl.
`models.ts`), `src/media/*` (4), `src/push/*` (4), `src/navigation/*` (3),
`src/data/{requests,simulations,firestoreHooks,samples,works,notifications,vehicles,settings,events}.ts`,
`src/i18n/locale.ts`, `src/screens/{LoginScreen,RequestQuoteScreen,SimulatorScreen,DeleteAccountScreen,PersonalDataScreen,LegalScreen}.tsx`,
`src/components/Photo.tsx`, `App.tsx`, `index.ts`, `app.json`, `app.config.js`, `eas.json`,
`.env.example`, `.env.production`, `google-services.json`, `firebase.json`, `.gitignore`,
`locales/*.json`, `docs/index.html`.
**Lidos por excerto ou grep (app, os restantes 34):** `PortfolioScreen` (50-80, validação
dos params), `DepartmentScreen` (30-80), `ProfileScreen`, `WorkDetailScreen`, `AlertsScreen`,
`data/requestForms.ts`, `data/departmentContent.ts`; todos os 72 passaram pelos greps de
`console.*`, `Linking`/`openURL`, `window.*`, `localStorage`/`AsyncStorage`,
`dangerouslySetInnerHTML`, `href`, `route.params`, `sendEmailVerification`/`reauthenticate`.
Ficaram de fora por não terem superfície de segurança: `theme/`, `utils/{dates,layout}.ts`,
`i18n/{pt,en,types,index}.ts`, componentes de apresentação, `HomeScreen`, `EventsScreen`,
`NotificationsOnboardingScreen`, `legal/texts.ts` (é da vertente RGPD).
**Backoffice (40 ficheiros):** na íntegra `auth/AuthContext.tsx`, `pages/{NoAccessPage,LoginPage}.tsx`,
`firebase/app.ts`, `main.tsx`, `App.tsx`, `data/{writes,duplicates}.ts`,
`components/SendAlertModal.tsx`, `media/cloudinary.ts`, `index.html`, `vite.config.ts`,
`firebase.json`, `.gitignore`, `.env.example`, `README.md`; por excerto
`pages/{RequestDetailPage,SimulationsPage,ClientDetailPage,ClientFormPage,WorkFormPage,SamplesPage}.tsx`,
`components/{MediaUploader,ui,VehicleModal}.tsx`; os 40 passaram pelos greps de
`innerHTML`, `href`/`window.open`/`target=_blank`, `console.*`, `import.meta.env`/`VITE_`,
`localStorage`/`setPersistence`, `getIdTokenResult`/`claims`, `signInWithCustomToken`.
Não lidos: `data/{DataContext,hooks}.ts` (as queries são o ponto A.1.2 da parte A),
`components/{Layout,Toast}.tsx`, as páginas de listagem, `utils/*`, `styles/global.css`.
**Contexto:** `CLAUDE.md`, `SPEC.md`, `DEVELOPMENT.md` (inteiro), `ROADMAP.md` (linhas
`**Estado:**` e as decisões das Secções 5, 6, 11, 16), `docs/store/checklist-contas.md` (excertos).

**Comandos corridos (só leitura), um resultado por linha:**
- `git ls-files | grep -iE "serviceAccount|adminsdk|\.env|credentials|\.p8|\.jks|\.pem|google-services|\.key$"` (app): só `.env.example`, `.env.production`, `functions/.env`, `functions/.env.marble-studios-prod`, `google-services.json`; (backoffice): só `.env.example`.
- `git log --all -S 'private_key'`, `-S 'BEGIN PRIVATE KEY'`, `-S 'api_secret'`, `-S 'CLOUDINARY_API_SECRET='` nos dois repositórios: nenhum commit.
- `git log --all --diff-filter=A --name-only -- '*serviceAccountKey*' '*adminsdk*' '.env' ...` (app): `.env` entrou no commit `0658028` (Secção 1) e saiu em `c30b3de`; `git show 0658028:.env` só tem `TODO` em todos os valores — nada real chegou ao git. Backoffice: nada.
- `curl -sS -I` a `https://marble-studios-app.web.app/`, `https://app.marble.pt/`, `https://marble-studios-backoffice-dev.web.app/`: 200, `Strict-Transport-Security` presente nos três (o Hosting põe-no sozinho), sem `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` nem `Referrer-Policy` em nenhum.
- `grep -n -i "restri|referrer|SHA-256|api key|chave de API|App Check" DEVELOPMENT.md ROADMAP.md docs/store/checklist-contas.md`: só referências ao App Check e ao SHA-256 do keystore; nenhuma restrição de chave de API documentada.
- `diff -q` dos dois `models.ts`: diferem (nota para a vertente qualidade; não afeta segurança).

## Contagem
| Severidade | Achados |
|---|---|
| Crítico | 0 |
| Alto | 1 |
| Médio | 4 |
| Baixo | 5 |
| Sugestão | 3 |

## Achados

### SEG-B-01 — Qualquer pessoa com o cloud name enche a conta do Cloudinary e apaga as fotos da app do ar
- **Vertente:** seguranca
- **Severidade:** Alto
- **Superfície:** app
- **Onde:** `src/media/cloudinary.ts:93-96`, `src/media/cloudinary.ts:115-120`, `src/media/cloudinary.ts:152-157`, `../marble-backoffice/src/media/cloudinary.ts:78-90`, `../marble-backoffice/README.md:94-117`, `.env.production:17-22`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os quatro presets (`marble-avatars`, `marble-requests`, `marble-simulations`, `marble-works`) são *unsigned* e os seus nomes e o cloud name (`kr9bmaqh`) vão no bundle da app, no bundle do backoffice e em `.env.production` no git. Um `POST https://api.cloudinary.com/v1_1/kr9bmaqh/video/upload` com `upload_preset=marble-works` não exige conta, token, App Check nem sessão Firebase — a única barreira é a configuração do preset na consola. O README diz que `marble-works` tem só "Unsigned, folder works" (sem formatos permitidos, sem transformação de entrada); o plano gratuito é de 25 créditos (≈ 25 GB), e o backoffice aceita vídeos até 100 MB pelo mesmo preset. Esgotados os créditos, o Cloudinary deixa de servir: portfólio, cartões do Início, avatares, amostras e resultados do simulador ficam no gradiente (`Photo.tsx` cai para o placeholder), e a Function do simulador deixa de conseguir subir resultados. Não custa dinheiro no plano gratuito — custa a app inteira. Nota adicional (não verificado, depende da opção *Overwrite* do preset, que o README não documenta): o upload unsigned aceita o parâmetro `public_id`; se *Overwrite* estiver ligado em `marble-works`, um estranho substitui a foto de um trabalho publicado por outra imagem, porque a app entrega por `public_id`.
- **Cenário de falha:** 250 pedidos de 100 MB com `upload_preset=marble-works` (script, sem autenticação) → 25 GB de armazenamento → conta sobre a quota → todas as imagens `res.cloudinary.com/kr9bmaqh/...` deixam de responder → app e backoffice sem uma única foto até a equipa pagar ou apagar à mão.
- **Evidência:** `src/media/cloudinary.ts:93-96`:
  ```ts
  form.append('upload_preset', preset);
  form.append('tags', `avatar,uid_${uid}`);
  const res = await xhrUpload(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, onProgress);
  ```
  `../marble-backoffice/README.md:101-103`: "`marble-works`: Signing mode **Unsigned**, folder `works`" — mais nada configurado. `../marble-backoffice/src/media/cloudinary.ts:21`: `MAX_VIDEO_BYTES = 100 * 1024 * 1024` (limite só no browser).
- **Correção proposta:** (1) Imediato, na consola do Cloudinary (só configuração, sem código): em cada preset, *Allowed formats* (`jpg,png,webp,heic`; em `marble-works` também `mp4,mov`), *Incoming transformation* `c_limit,w_2000,h_2000` (já documentado para `marble-requests`/`marble-simulations`, falta em `marble-works` e é só "convém" em `marble-avatars`), *Overwrite* desligado e *Unique filename* ligado; ativar em Settings → Security a notificação de quota. (2) A sério (esforço M): passar os uploads a **assinados**: uma callable `signUpload({ kind })` nas Functions gera `timestamp` + `signature` com o `CLOUDINARY_API_SECRET` que já está no Secret Manager, limita por uid (ex.: 20 ficheiros/dia) e devolve os parâmetros; a app e o backoffice enviam o mesmo `FormData` com `api_key`, `timestamp`, `signature` em vez de `upload_preset`. Quando o App Check entrar (Secção 11c), a callable ganha `enforceAppCheck` sem mais mudanças. Esboço da Function:
  ```ts
  export const signUpload = onCall({ secrets: [CLOUDINARY_API_SECRET] }, async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'login');
    const folder = { avatar: 'avatars', request: 'requests', simulation: 'simulations' }[req.data.kind];
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `folder=${folder}&tags=${req.data.tags}&timestamp=${timestamp}`;
    const signature = createHash('sha1').update(toSign + CLOUDINARY_API_SECRET.value()).digest('hex');
    return { timestamp, signature, folder, apiKey: CLOUDINARY_API_KEY.value() };
  });
  ```
- **Esforço:** M

### SEG-B-02 — Contas criadas sem verificação de email: a app manda emails do Firebase e do Resend para qualquer endereço que o atacante escreva
- **Vertente:** seguranca
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `src/auth/AuthContext.tsx:203-215`, `src/auth/AuthContext.tsx:216-222`, `src/screens/RequestQuoteScreen.tsx:184`, `src/screens/RequestQuoteScreen.tsx:214-218`, `firestore.rules:85-90`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** nem o registo nem o pedido de orçamento verificam o email (`grep sendEmailVerification|emailVerified src` → nada). `createAccountFromRequest` cria a conta com o email escrito no formulário, deixa a sessão no dispositivo de quem escreveu e dispara `sendPasswordResetEmail` para esse endereço; o pedido copia `name`/`email`/`phone` do formulário e a Function (parte A) envia a confirmação "Recebemos o teu pedido" de `app@marble.pt` para `request.email`, que as regras só validam como string até 120 caracteres — não o ligam a `request.auth.token.email`. Resultado: quem quiser faz o domínio `marble.pt` e o `noreply@marble-studios-prod.firebaseapp.com` enviar emails a terceiros que nunca pediram nada, com o nome que o atacante escolher no corpo; e fica com uma conta "em nome" desse email (o dono real só a recupera por "repor password", o que também invalida a sessão do atacante — mas até lá a conta e os pedidos são do atacante). O tecto `REQUEST_DAILY_CAP` (20/dia) limita a parte do Resend; a parte do Firebase (repor password a um email arbitrário por cada conta criada) só tem as quotas por IP do Firebase Auth — e a chave de API web não tem restrições (SEG-B-04).
- **Cenário de falha:** script contra a REST do Identity Toolkit com a chave de `.env.production:8`: `signUp` com `vitima@empresa.pt` + password aleatória → `sendOobCode(PASSWORD_RESET)` → a vítima recebe "Repor a password da Marble Studios" sem nunca ter ouvido falar da app; com sessão, o atacante cria um pedido com `email: vitima@empresa.pt`, `name: "<texto à escolha>"` → a vítima recebe a confirmação do Resend de `app@marble.pt` com esse texto (até 20/dia).
- **Evidência:** `src/auth/AuthContext.tsx:207-213`:
  ```ts
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), randomPassword());
  await updateProfile(cred.user, { displayName: name.trim() });
  await createClientDoc(cred.user, { name: name.trim(), phone: phone.trim(), acceptedTerms: true });
  setCreatedUid(cred.user.uid);
  await sendPasswordResetEmail(auth, email.trim()).catch(() => {});
  ```
  `firestore.rules:85,89`: `d.clientId == request.auth.uid` … `isStr(d.email, 120)` (o email do pedido não é comparado com o da conta).
- **Correção proposta:** (a) nas regras (parte A), `d.email == request.auth.token.email` em `validNewRequest` — a app já preenche o email a partir de `user.email` quando há sessão (`RequestQuoteScreen.tsx:94`), por isso nada muda para o cliente; (b) na Function, só enviar a confirmação ao cliente quando `request.auth.token.email_verified` ou, mais simples, quando o email do pedido é o do Auth; (c) no fluxo "pedido cria conta", trocar `createUserWithEmailAndPassword` + `sendPasswordResetEmail` por **email link sign-in** (`sendSignInLinkToEmail`): a conta só nasce quando o dono do email clica no link, o que verifica o email de graça e deixa de haver contas com password que ninguém conhece (resolve também SEG-B-13). Até lá, ligar no Firebase Console a proteção de enumeração (já está, segundo `DEVELOPMENT.md:156-158`) e o App Check na Secção 11c.
- **Esforço:** M

### SEG-B-03 — Backoffice abre e carrega URLs escritos pelo cliente sem validar o domínio (phishing à equipa, fuga de IP)
- **Vertente:** seguranca
- **Severidade:** Médio
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/pages/RequestDetailPage.tsx:203-206`, `../marble-backoffice/src/pages/RequestDetailPage.tsx:216-227`, `../marble-backoffice/src/pages/RequestDetailPage.tsx:145-147`, `../marble-backoffice/src/pages/SimulationsPage.tsx:141`, `../marble-backoffice/src/pages/ClientDetailPage.tsx:132`, `firestore.rules:69-74`, `firestore.rules:216-220`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `requests.photos[].url/thumbnailUrl`, `requests.simulation.photoUrl/resultUrl`, `simulations.photo.url/thumbnailUrl` e `clients.avatarUrl` são escritos pelo SDK de cliente e as regras só verificam "string até 600" (`validImage`, `validRequestSimulation`) — ou nada, no caso de `avatarUrl` (`clients` aceita qualquer campo). O backoffice mete-os diretamente em `<img src>` e em `<a href target="_blank">` "abre em tamanho real", e o email do pedido em `mailto:`. Um cliente mal-intencionado põe um URL seu: (1) a equipa clica em "Foto" à espera do Cloudinary e cai numa página do atacante — uma cópia do login do backoffice "sessão expirada" é o caminho mais curto para roubar a conta `admin` (é a única coisa que o backoffice tem); (2) o `<img>` de um domínio do atacante regista o IP e o horário de quem abre a ficha; (3) `email: "x@y.pt?subject=...&body=..."` pré-preenche o email que a equipa envia. `rel="noreferrer"` já impede `javascript:` de correr no contexto do backoffice, por isso não há XSS — é engenharia social e rastreio.
- **Cenário de falha:** cliente cria um pedido pelo SDK com `photos: [{ url: "https://marble-backoffice-login.example/", thumbnailUrl: "<foto real do Cloudinary>", publicId: "x" }]` → no backoffice a miniatura parece normal → a equipa clica → página falsa pede a password da conta da equipa.
- **Evidência:** `../marble-backoffice/src/pages/RequestDetailPage.tsx:203-206`:
  ```tsx
  <a key={p.publicId || i} className="media-item" href={p.url} target="_blank" rel="noreferrer">
    <div className="thumb wide">
      <img src={p.thumbnailUrl || p.url} alt={`Foto ${i + 1}`} loading="lazy" />
  ```
  `firestore.rules:216-219`: `validImage(p)` só exige `isStr(p.url, 600) && isStr(p.thumbnailUrl, 600) && isStr(p.publicId, 300)`.
- **Correção proposta:** uma função `isOurCdn(url)` no backoffice (`^https://res\.cloudinary\.com/kr9bmaqh/`) usada por `Thumb`, pelas galerias do pedido/simulação e pelo avatar — URL fora disso mostra "URL inválido" e não é link; nas regras (parte A), o mesmo prefixo com `matches()` em `validImage`, `validRequestSimulation` e, para `avatarUrl`, uma validação de `clients` em `update`. `mailto:` só com `encodeURIComponent` e depois de validar o email com a mesma regex da app (`validation.ts:6`).
- **Esforço:** S

### SEG-B-04 — Restrições das chaves de API do Firebase (web e Android) não estão documentadas nem, ao que se vê, aplicadas
- **Vertente:** seguranca
- **Severidade:** Médio
- **Superfície:** app
- **Onde:** `.env.production:8`, `google-services.json:18`, `google-services.json:37`, `DEVELOPMENT.md:1029-1041`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a chave web do prod (`AIzaSyD64p…`, `.env.production`) e a chave Android do dev (`AIzaSyCtev…`, `google-services.json`) estão no git — o que é normal e não é o achado. O achado é que `DEVELOPMENT.md` (a tabela "Firebase: os dois projetos" e "Lançamento nas lojas") não regista restrições de nenhuma delas na consola Google Cloud (HTTP referrers para a web, pacote + SHA-1 para Android, restrição de API a Identity Toolkit/Firestore) — a metodologia desta vertente marca isto como Médio. Sem restrições, a chave web serve para chamar o Identity Toolkit a partir de qualquer sítio (é o que torna SEG-B-02 trivial de automatizar) e para gastar quota de Firestore/Auth em nome do projeto.
- **Cenário de falha:** qualquer script usa `AIzaSyD64p…` contra `identitytoolkit.googleapis.com` para criar contas e disparar emails (SEG-B-02) ou para inundar leituras públicas de `works`/`events` fora da app — a fatura de Firestore no plano Blaze não tem tecto configurado.
- **Evidência:** `grep -n -i "restri|referrer|SHA-256|api key|chave de API" DEVELOPMENT.md` → só `DEVELOPMENT.md:366` (Cloudinary) e `:1371` (SHA-256 do keystore para o App Check). `.env.production:8`: `EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyD64pq4KBeIKgnz0DQaFxcCibdGdXF_gIM`.
- **Correção proposta:** na consola Google Cloud → APIs & Services → Credentials, para cada projeto: chave "Browser key (auto created by Firebase)" com *HTTP referrers* (`https://app.marble.pt/*`, `https://marble-studios-backoffice*.web.app/*`, `http://localhost:*` só no dev) e *API restrictions* limitadas a Identity Toolkit, Token Service, Firestore; chave Android com *Android apps* (`pt.marble.app` / `pt.marble.app.dev` + SHA-1 do keystore do EAS, `eas credentials`). Atenção: a app nativa usa o SDK JS (não o Android SDK), por isso a chave que ela usa é a **web** e não pode ter restrição de referrer sem partir a app no telemóvel — a solução aí é o App Check (Secção 11c) e um orçamento com alerta no Billing; registar a decisão na tabela de `DEVELOPMENT.md`.
- **Esforço:** S

### SEG-B-05 — API secret do Cloudinary e chave do Resend colados numa conversa a 2026-09-06 e ainda por rodar
- **Vertente:** seguranca
- **Severidade:** Médio
- **Superfície:** scripts
- **Onde:** `docs/store/checklist-contas.md:172-186`, `DEVELOPMENT.md:1395`
- **Confiança:** provável
- **Estado:** aberto
- **O que está mal:** a própria documentação regista que o `CLOUDINARY_API_SECRET` e a `RESEND_API_KEY` de produção "foram colados por engano no chat com o Claude" e que convém rodá-los antes do lançamento (checklist 6d). Até serem rodados, a chave que apaga ficheiros no Cloudinary e a que envia email como `app@marble.pt` existem fora do Secret Manager, num histórico de conversa. Não consegui verificar se a rotação já foi feita (não tenho acesso às consolas); o estado documentado a 2026-09-12 é "por fazer".
- **Cenário de falha:** exportação ou fuga do histórico da conversa → quem a lê apaga a Media Library inteira pela Admin API (`api_secret` da conta "Root") ou envia email de `app@marble.pt` até a Resend bloquear o domínio.
- **Evidência:** `docs/store/checklist-contas.md:174-176`: "A chave do Resend e o API secret do Cloudinary foram colados por engano no chat com o Claude a 2026-09-06. Não é grave (a conversa é privada), mas antes do lançamento convém rodá-los". `DEVELOPMENT.md:1395`: "**Rodar antes do lançamento** (ficaram colados na conversa — checklist 6d)".
- **Correção proposta:** fazer já o passo 6d (10 min, passos na checklist), sem esperar pelo lançamento — o dev também usa os mesmos pares e já corre Functions publicadas; depois marcar 6d como feito com a data.
- **Esforço:** S

### SEG-B-06 — Sem CSP, X-Frame-Options, X-Content-Type-Options nem Referrer-Policy nos dois sites do Hosting
- **Vertente:** seguranca
- **Severidade:** Baixo
- **Superfície:** hosting
- **Onde:** `firebase.json:30-40`, `../marble-backoffice/firebase.json:16-35`, `../marble-backoffice/index.html:1-21`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** os dois `firebase.json` só definem `Cache-Control`. O `curl -I` confirma: HSTS vem por defeito do Hosting (nos três URLs), mas nenhum manda `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options: nosniff` nem `Referrer-Policy`. No backoffice — um SPA autenticado que edita dados de clientes — a falta de `frame-ancestors` deixa-o ser embebido num iframe de outro site (clickjacking sobre "Apagar", "Enviar alerta"); e sem `Referrer-Policy`, os links `target="_blank"` para o Cloudinary levam o URL da página (`/pedidos/<id>`) no Referer — `rel="noreferrer"` já cobre os `<a>` (SEG-B-03), mas não os `<img>`.
- **Cenário de falha:** página de terceiros com `<iframe src="https://marble-studios-backoffice-dev.web.app/pedidos/x">` sobreposto a um botão invisível — o membro da equipa com sessão clica onde pensa que é outra coisa.
- **Evidência:** `curl -sS -I https://marble-studios-backoffice-dev.web.app/` → `HTTP/1.1 200 OK`, `Cache-Control: no-cache`, `Strict-Transport-Security: max-age=31556926; includeSubDomains; preload` — e mais nada de segurança. `../marble-backoffice/firebase.json:19-22`: só `{ "key": "Cache-Control", "value": "no-cache" }`.
- **Correção proposta:** nos dois `firebase.json`, em `headers` para `**`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`; no backoffice ainda `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' https://res.cloudinary.com data: blob:; media-src https://res.cloudinary.com; connect-src 'self' https://*.googleapis.com https://api.cloudinary.com wss://*.firebaseio.com https://*.firebaseapp.com; frame-ancestors 'none'` (o Vite gera JS sem inline; o CSS usa `style` inline em JSX, daí o `'unsafe-inline'` em `style-src`; testar no dev antes do prod). Nas páginas legais basta `frame-ancestors 'none'` + `nosniff`.
- **Esforço:** S

### SEG-B-07 — Password da conta de demonstração das lojas em texto simples no git
- **Vertente:** seguranca
- **Severidade:** Baixo
- **Superfície:** hosting
- **Onde:** `docs/store/ficha-loja.md:125`, `docs/store/ficha-loja.md:134`, `firebase.json:25-29`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `revisao@marble.pt / Marble-Revisao-2026!` está no ficheiro versionado. O Hosting não a publica (`ignore: ["store/**", "**/*.md"]` — confirmado), mas o repositório é a única cópia partilhada entre dois PCs e a conta vai existir no prod para a Apple e o Google entrarem: quem tiver acesso ao repositório (ou a um clone num PC) entra na app como esse cliente, vê os alertas e pode pedir orçamentos em nome dele.
- **Cenário de falha:** clone do repositório num PC partilhado → login na app de produção com a conta de revisão → pedidos de orçamento falsos que chegam à equipa como se fossem reais.
- **Evidência:** `docs/store/ficha-loja.md:125`: "Conta de teste: revisao@marble.pt / Marble-Revisao-2026!". `firebase.json:25-29`: `"ignore": ["store/**", "**/*.md", "**/.*"]`.
- **Correção proposta:** guardar a password no gestor de passwords e deixar no ficheiro só "ver gestor de passwords"; trocar a password depois de cada revisão das lojas (o script de seed da conta já é referido em `ficha-loja.md:120` — basta correr com uma nova).
- **Esforço:** S

### SEG-B-08 — O registo e o formulário de orçamento revelam se um email tem conta
- **Vertente:** seguranca
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/auth/errors.ts:20-21`, `src/screens/RequestQuoteScreen.tsx:187-190`, `src/screens/LoginScreen.tsx:74-75`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a proteção de enumeração do Firebase (documentada em `DEVELOPMENT.md:156-158`) cobre o login e o "repor password", não o `createUserWithEmailAndPassword`: `auth/email-already-in-use` chega à app e é mostrado ("email já em uso") no registo, e no pedido de orçamento muda o formulário para o modo "já tens conta — escreve a password". Qualquer pessoa confirma, email a email, quem é cliente da Marble. É comportamento padrão do Firebase e a alternativa (criar contas só por uma callable) não vale a pena antes do App Check — regista-se para a decisão ficar consciente.
- **Cenário de falha:** lista de emails de uma empresa concorrente → tentar registar cada um → os que devolvem "já em uso" são clientes.
- **Evidência:** `src/screens/RequestQuoteScreen.tsx:187-190`:
  ```ts
  if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
    setMode('login');
    setFeedback(T.request.emailExists);
  ```
- **Correção proposta:** aceitar (documentar em `DEVELOPMENT.md`, "Autenticação"), ou — quando o pedido passar para a callable `createQuoteRequest` da Secção 11c — fazer o registo pela mesma callable e responder sempre "verifica o email" (com o email link de SEG-B-02 a enumeração desaparece de vez).
- **Esforço:** M

### SEG-B-09 — `works` público leva o uid e o id do carro do cliente
- **Vertente:** seguranca
- **Severidade:** Baixo
- **Superfície:** backoffice
- **Onde:** `../marble-backoffice/src/pages/WorkFormPage.tsx:216-220`, `firestore.rules:106-108`, `src/firebase/models.ts:396-398`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** o formulário do trabalho grava `clientId` (uid do Firebase Auth) e `vehicleId` em `works`, que é de leitura pública quando `published == true`. Não abre nenhuma leitura (as regras de `clients`/`vehicles` exigem o próprio uid), mas expõe a qualquer anónimo um identificador estável de cada cliente com trabalho publicado e a ligação uid → trabalhos → `model` ("Jaguar F-Type"). É pseudónimo, não dado pessoal direto; fica registado para a vertente RGPD decidir se o público precisa deste campo.
- **Cenário de falha:** `getDocs(query(works, where('published','==',true)))` sem sessão → lista de uids + modelos de carro; junto com SEG-B-08 (email → tem conta) não dá para ligar email a uid, mas o uid passa a ser um alvo conhecido para as escritas cruzadas que a parte A verificar.
- **Evidência:** `../marble-backoffice/src/pages/WorkFormPage.tsx:219-220`: `clientId: optional(form.clientId), vehicleId: optional(form.clientId ? form.vehicleId : '')`. `firestore.rules:107`: `allow read: if resource.data.published == true || isAdmin();`.
- **Correção proposta:** a app não usa `works.clientId` em lado nenhum (grep em `src/`: só o tipo). Duas opções: mover a ligação trabalho ↔ cliente para um subdocumento só da equipa (`works/{id}/private/link`) ou manter e aceitar por escrito na vertente RGPD.
- **Esforço:** M

### SEG-B-10 — Parâmetros de URL da app web sem validação rebentam o ecrã (`legal/:doc`, `request?department=`, `simulator?kind=`)
- **Vertente:** seguranca
- **Severidade:** Baixo
- **Superfície:** app
- **Onde:** `src/screens/LegalScreen.tsx:18-19`, `src/data/requestForms.ts:151-154`, `src/screens/RequestQuoteScreen.tsx:67-68`, `src/screens/SimulatorScreen.tsx:71`, `src/navigation/RootNavigator.tsx:112-135`
- **Confiança:** provável
- **Estado:** aberto
- **O que está mal:** só na web (não há `scheme` em `app.json` e `linking.prefixes` é `[]`, por isso não há deep links nativos). `LegalScreen` faz `LEGAL[params.doc]` e lê `text.shortTitle` — `legal/qualquer-coisa` dá `TypeError` e ecrã em branco; `requestForm(department)` faz `FORMS[department]` e `tx(f.lead)` — `request?department=xyz` idem; `simulator?kind=xyz` chega a `T.simulator.heading[kind]` (só fica sem título). Não é injeção (nada vai para HTML, URL ou query) e não há dados em risco — é robustez, e nenhum destes URLs se partilha por agora. `PortfolioScreen.tsx:58-73` e `DepartmentScreen.tsx:54-66` já validam os seus e são o modelo a seguir. Não corri a app web para confirmar o rebentar — daí "provável".
- **Cenário de falha:** link `https://<app web>/legal/x` → página branca sem botão de voltar.
- **Evidência:** `src/screens/LegalScreen.tsx:18-19`: `const { params } = useRoute<...>(); const text = LEGAL[params.doc];` seguido de `{text.shortTitle}` na linha 28, sem guarda.
- **Correção proposta:** `LEGAL[params.doc] ?? LEGAL.privacy`; em `RequestQuoteScreen`, `const department = isDepartmentId(x) ? x : undefined` antes de `requestForm`; em `SimulatorScreen`, `KINDS.includes(params.kind)`.
- **Esforço:** S

### SEG-B-11 — Política de password mínima (6 caracteres) e sem política no projeto
- **Vertente:** seguranca
- **Severidade:** Sugestão
- **Superfície:** app
- **Onde:** `src/auth/validation.ts:14-18`, `DEVELOPMENT.md:133-162`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a app aceita 6 caracteres sem mais nada, que é o mínimo do Firebase; `DEVELOPMENT.md` não diz se a *password policy* do Firebase Auth (Authentication → Settings) foi configurada nos dois projetos. Como a conta de equipa do backoffice pode ser "a mesma conta" de um cliente (`README.md:59-60`), a password fraca de um cliente que depois recebe o claim `admin` é a password do backoffice.
- **Cenário de falha:** membro da equipa regista-se na app com `123456`, recebe o claim, e a conta que edita todos os clientes tem seis dígitos.
- **Evidência:** `src/auth/validation.ts:16`: `if (password.length < 6) return S.validation.passwordShort;`.
- **Correção proposta:** ativar a política no Firebase (mínimo 10, exigir letra + número, "enforce on sign-in" só para contas novas) nos dois projetos, subir o mínimo em `validation.ts` e no texto `passwordShort`, e registar em `DEVELOPMENT.md`; recomendar às contas `admin` password própria ou 2FA quando o Identity Platform o permitir.
- **Esforço:** S

### SEG-B-12 — `.env.production` não tem o preset das simulações: o simulador não existe na build de produção
- **Vertente:** seguranca
- **Severidade:** Sugestão
- **Superfície:** app
- **Onde:** `.env.production:15-22`, `.env.example:30-34`, `src/media/cloudinary.ts:28-34`, `src/screens/SimulatorScreen.tsx:220`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** `EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS` só está em `.env.example`; em `.env.production` falta, e `simulationUploadConfigured` fica `false` — "sem a variável o simulador não aparece em lado nenhum" (`DEVELOPMENT.md:924-926`). Não é segurança; é o único sítio onde a configuração pública de prod diverge da de dev, e o `DEVELOPMENT.md` só lembra de criar o preset no prod, não de acrescentar a variável. Regista-se para a Secção 11 parte 2 não descobrir isto na loja.
- **Cenário de falha:** build `production` → páginas Epoxy/Automotive sem bloco "Simulador", Perfil sem "As tuas simulações".
- **Evidência:** `.env.production` termina em `EXPO_PUBLIC_CLOUDINARY_PRESET_REQUESTS=marble-requests` (linha 22); `src/media/cloudinary.ts:34`: `export const simulationUploadConfigured = Boolean(cloudName && simulationPreset);`.
- **Correção proposta:** acrescentar `EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS=marble-simulations` a `.env.production` quando o preset existir no prod (passo 1 de "O que o Fábio faz uma vez por projeto"), e uma linha na checklist da Secção 11.
- **Esforço:** S

### SEG-B-13 — Apagar conta exige a password, que uma conta nascida de um pedido de orçamento não tem
- **Vertente:** seguranca
- **Severidade:** Sugestão
- **Superfície:** app
- **Onde:** `src/screens/DeleteAccountScreen.tsx:27-31`, `src/auth/AuthContext.tsx:207`, `src/auth/AuthContext.tsx:282-284`, `src/screens/PersonalDataScreen.tsx:53-59`
- **Confiança:** confirmado
- **Estado:** aberto
- **O que está mal:** a reautenticação antes de `deleteUser` está certa (é o que impede alguém com o telemóvel desbloqueado de apagar a conta). Mas as contas criadas por `createAccountFromRequest` têm uma password aleatória que ninguém conhece; se o cliente nunca clicou no email "repor password", o ecrã "Apagar a minha conta" pede-lhe uma password que não existe, e o ecrã não explica o que fazer — o caminho é ir a "Dados pessoais" → "Enviar link de alteração de password", que não é óbvio. É a promessa RGPD de apagar a conta na app a falhar num caso comum (o pedido de orçamento é a porta de entrada principal).
- **Cenário de falha:** cliente entrou pelo pedido, quer apagar a conta → "Password errada" → desiste ou escreve para `app@marble.pt`.
- **Evidência:** `src/screens/DeleteAccountScreen.tsx:28-30`: `if (!password) { setError(T.deleteAccount.passwordRequired); return; }` — sem alternativa; `src/auth/AuthContext.tsx:207`: `createUserWithEmailAndPassword(auth, email.trim(), randomPassword())`.
- **Correção proposta:** no ecrã de apagar, um link "Não tens password? Envia-me um link para a definir" que chama `resetPassword(user.email)`; ou, com o email link sign-in de SEG-B-02, reautenticar por link (`reauthenticateWithCredential` com `EmailAuthProvider.credentialWithLink`).
- **Esforço:** S

## O que está bem

| Superfície | Verificado | Onde |
|---|---|---|
| Autenticação (app) | Reautenticação com password antes de anonimizar e apagar o utilizador; ordem certa (reauth → anonimizar → `deleteUser`) | `src/auth/AuthContext.tsx:282-300` |
| Autenticação (app) | Recuperação de password não revela se o email existe (mensagem igual; proteção de enumeração do Firebase documentada) | `src/screens/LoginScreen.tsx:77-78`, `src/auth/errors.ts:16-19`, `DEVELOPMENT.md:156-158` |
| Autenticação (app) | Aceitação dos termos exigida outra vez dentro do `AuthContext`, não só no ecrã | `src/auth/AuthContext.tsx:204,217` |
| Autenticação (app) | Doc `clients/{uid}` só recriado com resposta do servidor (`!metadata.fromCache`) — o incidente de 2026-09-09 está fechado | `src/auth/AuthContext.tsx:174-179` |
| Sessão (app) | Nativo: `initializeAuth` + AsyncStorage (padrão Expo/Firebase; o Firebase guarda só o refresh token, não a password); web: persistência por defeito do SDK. Ao terminar sessão saem o token de push (`forgetPushToken`) e a sessão; o que fica em AsyncStorage é só `marble:requests:sentAt` (timestamps, sem dados pessoais) | `src/firebase/authInstance.native.ts:13-15`, `src/auth/AuthContext.tsx:223-230`, `src/push/push.native.ts:134-139`, `src/data/requests.ts:97-123` |
| Login por token de dev (app) | Só `Platform.OS === 'web'` **e** `EXPO_PUBLIC_FIREBASE_PROJECT_ID` a acabar em `-dev` (decidido na build; `.env.production` tem `marble-studios-prod`); o token sai do URL antes de qualquer coisa; um custom token assinado pela chave do dev é recusado pelo Auth do prod (projeto diferente) mesmo que o código corresse | `src/auth/devToken.ts:12-21`, `.env.production:10` |
| Login por token de dev (backoffice) | Mesmo gate `isDevProject` decidido na build; hash removido; `hashchange` escutado só no dev | `../marble-backoffice/src/App.tsx:34-47`, `../marble-backoffice/src/firebase/app.ts:29` |
| Claim `admin` (backoffice) | Lido de `getIdTokenResult`; "Verificar outra vez" força `getIdTokenResult(true)`; sem claim → `NoAccessPage`, e as regras exigem `request.auth.token.admin == true` de qualquer forma — a UI não é a única barreira | `../marble-backoffice/src/auth/AuthContext.tsx:33-40,66`, `../marble-backoffice/src/pages/NoAccessPage.tsx:24-31`, `firestore.rules:55-57` |
| Backoffice — registo | Não existe registo no backoffice; contas só pelo script `set-admin` (parte A) | `../marble-backoffice/src/pages/LoginPage.tsx:6-9` |
| Backoffice — alertas manuais | `SendAlertModal` envia a **um** cliente de cada vez (sem "todos"); título ≤ 80 e mensagem ≤ 400 na UI; tipos de marketing bloqueados sem `consent.marketing` na UI **e** em `sendNotification`; texto gravado em claro (a app mostra em `<Text>`, sem HTML) | `../marble-backoffice/src/components/SendAlertModal.tsx:82-87,117-127,224-241`, `../marble-backoffice/src/data/writes.ts:232-251` |
| Backoffice — juntar fichas | Anonimiza a ficha de origem (`mergedInto` + `deletedAt`), não apaga; move carros/trabalhos/alertas num só batch; recusa juntar duas contas da app | `../marble-backoffice/src/data/writes.ts:170-199` |
| Backoffice — clientes | Em contas da app o email não é editável (é o do Auth); `notes` só da equipa; a equipa nunca escreve `pushTokens`, `consent`, `avatarUrl` nem `locale` | `../marble-backoffice/src/data/writes.ts:152-163`, `../marble-backoffice/src/pages/ClientFormPage.tsx:94-95` |
| Backoffice — uploads | Tipo e tamanho validados no browser (10 MB imagem / 100 MB vídeo, redução a 2560 px); fotos "por URL" exigem `https://` | `../marble-backoffice/src/media/cloudinary.ts:46-54,67-76`, `../marble-backoffice/src/components/MediaUploader.tsx:95-105` |
| Backoffice — HTML | Sem `dangerouslySetInnerHTML`/`innerHTML`; todos os `<a target="_blank">` têm `rel="noreferrer"`; `sourcemap: false` na build; só variáveis `VITE_*` chegam ao bundle e `.env`/`.env.production` estão no `.gitignore`; `robots: noindex` | grep em `../marble-backoffice/src`, `../marble-backoffice/vite.config.ts:13`, `../marble-backoffice/.gitignore:7-9`, `../marble-backoffice/index.html:7` |
| Uploads (app) | Fotos reencodadas em JPEG pelo `expo-image-manipulator` e recolhidas com `exif: false` — não vai GPS nem EXIF para o Cloudinary nem para a equipa (avatar 1024 px, pedidos/simulações 1600 px) | `src/media/images.ts:10-21`, `src/media/avatarPicker.ts:19-25`, `src/media/requestPhotos.ts:20-27,37` |
| Uploads (app) | `public_id` escolhido pelo Cloudinary (a app não envia `public_id`), logo um cliente não colide com o ficheiro de outro pela app; tags `uid_<uid>`/`request_<id>`/`simulation_<id>` só afetam os próprios ficheiros | `src/media/cloudinary.ts:84-97,108-116,145-153` |
| Push (app) | Permissão nunca pedida no arranque; token guardado por `arrayUnion` e removido ao sair e ao apagar conta; formato do token vem do Expo, não de input do cliente | `src/push/push.native.ts:99-139`, `src/auth/AuthContext.tsx:228,291,298` |
| Escritas do cliente (app) | Só as documentadas: `clients/{uid}` (nome, telemóvel, prefs, avatar, consentimentos, `lastActiveAt`/`locale`, `onboardingSeenAt`, `pushTokens`), `notifications.read`, criar `requests`, `checkupRequest` em `vehicles`, criar/ligar/apagar `simulations` — nada de `works`, `events`, `settings`, `samples` | `src/data/*.ts`, `src/auth/AuthContext.tsx`, `src/push/push.native.ts` |
| Queries (app) | `works` e `samples` levam sempre `where('published','==',true)`; `notifications`, `vehicles`, `requests`, `simulations` levam `where('clientId','==',uid)` — batem com as condições de `list` das regras | `src/data/works.ts:19,30-35`, `src/data/samples.ts:14`, `src/data/notifications.ts:14-19`, `src/data/vehicles.ts:14`, `src/data/requests.ts:27`, `src/data/simulations.ts:30` |
| Web (app) | Nenhum `console.log` com dados (só um `console.warn` de desenvolvimento em `departmentContent.ts:664`); `?lang=` restrito a `pt|en` por regex; sem `window.*` fora do dev token e do idioma | grep em `src/`, `src/i18n/locale.ts:16-20` |
| Deep links (app) | Sem `scheme` em `app.json` e `linking.prefixes: []` — os parâmetros só entram pela web; `PortfolioScreen` e `DepartmentScreen` validam categoria/serviço/id antes de aplicar | `src/navigation/RootNavigator.tsx:112-135`, `src/screens/PortfolioScreen.tsx:58-73`, `src/screens/DepartmentScreen.tsx:40-54` |
| Config pública (app) | `.env.production` e `google-services.json` só com identificadores públicos; `google-services.prod.json`, `serviceAccountKey*.json`, `credentials.json`, `.env` e `*.p8/*.jks/*.pem` no `.gitignore`; `eas.json` sem segredos (a chave do Play é um caminho para um ficheiro ignorado) | `.gitignore:14-19,40-51,65`, `eas.json:43-50` |
| Git (os dois) | Nenhuma chave privada, `api_secret` nem `serviceAccountKey` em nenhum commit; o único `.env` que entrou (Secção 1) só tinha `TODO` | comandos em "Âmbito" |
| Hosting | `docs/` publica só `index.html` e `legal/*.html` (sem `<script>`), `store/**` e `*.md` ignorados; HSTS ativo nos três URLs; backoffice com `no-cache` nas rotas e `immutable` nos assets | `firebase.json:22-41`, `../marble-backoffice/firebase.json`, `curl -I` |
| Emails (Functions, só olhado para SEG-B-02) | `escapeHtml` e `textToHtml` existem em `functions/src/email.ts:45-56` — a injeção de HTML pelo `message` do pedido está tratada do lado que envia (a parte A confirma o uso) | `functions/src/email.ts:45-56` |

## Lista de verificação (respostas desta parte)

1. **Cliente lê doc de outro?** Pelas superfícies da app: não — todas as queries levam `clientId == uid` e os `getDoc` de `simulations`/`works` caem em `missing` quando as regras negam (`firestoreHooks.ts:68-74`). O que as regras deixam por `get` direto é da parte A.
2. **Cliente altera campo da equipa/Functions?** A app só escreve os campos listados em "O que está bem"; mas as regras de `clients` aceitam qualquer campo em `update` (`firestore.rules:126`) — a consequência (`retentionWarnedAt`, `createdByTeam`, `mergedInto`, `avatarUrl` com URL externo → SEG-B-03) é da parte A.
3. **Cliente faz uma Function agir sobre recursos de outro?** Pela app: `publicId` e `url` vêm do Cloudinary, mas as regras aceitam qualquer string (`firestore.rules:216-219`); se a Function apagar por `publicId` do doc em vez de por tag, um cliente apaga ficheiros alheios — a parte A traça isso em `functions/src`. Tags: só afetam ficheiros do próprio.
4. **Anónimo escreve? Lê dados pessoais?** Não escreve: `createUserWithEmailAndPassword` é o único caminho sem sessão e cria só a própria conta (SEG-B-02: para qualquer email). Lê `works` publicados com `clientId`/`vehicleId` (SEG-B-09), `events`, `settings/*`, `samples` publicadas (a `description` "só para a equipa" das amostras — `SamplesPage.tsx:336` — vai num doc público; não é dado pessoal, é nota interna: ver parte A ponto 6).
5. **Com o cloud name enche a conta ou sobrepõe ficheiros?** Enche: sim, sem tecto (SEG-B-01). Sobrepõe: provável se *Overwrite* estiver ligado no preset (não documentado). Além disso, a decisão registada em `ROADMAP.md:1466-1468` de não ligar "strict transformations" deixa qualquer pessoa gastar os 25 000 créditos de transformação por mês pedindo URLs com transformações novas — risco aceite por escrito; fica aqui só como lembrete.
6. **Segredos no git, nos `.env`, nos logs?** Git (HEAD e histórico dos dois repositórios): não. `.env.production`/`google-services.json`: só valores públicos. Logs da app: nenhum `console.log`. Fora do git: os segredos colados na conversa de 2026-09-06 ainda por rodar (SEG-B-05).
7. **Custo máximo por dia de um ataque de volume?** Pedidos: 20/dia no projeto (`REQUEST_DAILY_CAP`) → no máximo 40 emails do Resend e 20 push; simulações: 60/dia ≈ 4 €/dia (`DEVELOPMENT.md:1022-1023`); uploads: **sem tecto** — o plano gratuito do Cloudinary esgota-se e a app fica sem imagens (SEG-B-01); emails do Firebase Auth (registo de contas com emails alheios): só as quotas por IP do Firebase (SEG-B-02, SEG-B-04); leituras públicas de Firestore: sem tecto nem orçamento documentado (SEG-B-04). O paliativo `REQUEST_DAILY_CAP` cobre o que `DEVELOPMENT.md:631-642` promete (pedidos), e só isso.
8. **Claim `admin` obtido ou mantido indevidamente?** Pelo backoffice, não: é lido do token e as regras exigem-no. Mantido: depois de `set-admin --remove` o ID token continua válido até 1 h a não ser que o script revogue os refresh tokens — verificar na parte A (`scripts/set-admin.mjs`).
9. **Login por token de dev morto em produção?** Sim, por duas camadas: gate decidido na build (`-dev` no project ID; `.env.production` é `marble-studios-prod`) e o custom token do dev ser rejeitado pelo Auth do prod. Confirmado em `src/auth/devToken.ts:12-15` e `../marble-backoffice/src/App.tsx:35`.
10. **Riscos aceites documentados e o paliativo?** App Check adiado (`DEVELOPMENT.md:1358-1376`, decisão de 2026-09-06) com `REQUEST_DAILY_CAP` como paliativo — cobre os pedidos; não cobre uploads (SEG-B-01), criação de contas/emails (SEG-B-02) nem leituras. "Strict transformations" desligado (`ROADMAP.md:1466-1468`) — aceite. `delete: false` em `clients` — aceite, respeitado pelo backoffice (`mergeClients` anonimiza).

## Não verificado

- **Configuração real dos presets no Cloudinary** (Overwrite, Unique filename, Allowed formats, Incoming transformation, pasta): sem acesso à consola; SEG-B-01 assume o que o README documenta e marca o resto como não confirmado.
- **Restrições das chaves de API na consola Google Cloud** e **política de password / proteção de enumeração** no Firebase Auth dos dois projetos: sem acesso; SEG-B-04 e SEG-B-11 baseiam-se na ausência de documentação.
- **Se a rotação de segredos (checklist 6d) já foi feita**: SEG-B-05 fica "provável".
- **`.env.production` do backoffice**: não está no git (correto), por isso não confirmei que aponta ao prod e ao mesmo cloud name.
- **Build web de produção (`expo export`)**: não foi gerada nem inspecionada; a análise de "o que a web expõe" é sobre o código-fonte.
- **Rebentar dos parâmetros de URL (SEG-B-10)**: por leitura do código, sem correr a app web.
- **`../marble-backoffice/src/data/{DataContext,hooks}.ts`**: as queries do backoffice contra as condições das regras são o ponto A.1.2 — ficam para a parte A.
- **Encriptação da sessão no dispositivo**: `AsyncStorage` é o padrão documentado pelo Expo para o Firebase JS; não avaliei `expo-secure-store` (limite de 2 KB por valor, que o blob do Auth pode exceder) — sem achado.
- **`npm audit` / `npm outdated`**: não corridos — pertencem à vertente dependências.
