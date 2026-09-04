# Marble Studios App — Roadmap de Construção

## Como usar este documento

Este projeto vai ser construído em várias conversas separadas, cada uma
focada numa secção. Se estás a começar uma conversa nova para atacar uma
secção específica, faz isto primeiro:

1. Lê `SPEC.md` — os requisitos de negócio (o que o dono da Marble Studios
   pediu, decisões tomadas, coisas ainda em aberto).
2. Lê `DEVELOPMENT.md` — como correr o projeto, estado técnico atual,
   avisos conhecidos.
3. Volta aqui e lê APENAS a secção que te foi pedida. Não precisas de
   perceber as outras secções para trabalhar na tua.
4. No fim, atualiza o estado da secção neste ficheiro (de "Por fazer" para
   "Feito", com uma nota do que foi construído) para a próxima conversa
   saber onde ficámos.

Diz ao Claude, no início dessa conversa, algo como: *"Estou a trabalhar no
projeto Marble Studios em C:\Users\VGodr\Projects\marble-app — lê o
ROADMAP.md e ataca a Secção 4 — Ligar os 6 ecrãs a dados reais."* (usa
sempre o nome completo da secção, nunca só o número)

---

## Base (concluída)

O esqueleto da app está construído e commitado (`git log` tem o commit
inicial). Inclui:

- Projeto Expo/React Native (TypeScript), navegação por tabs + stack
- Tema visual (`src/theme/theme.ts`): cores preto/dourado, tipografia
  (Alex Brush, Jost, Manrope)
- 6 ecrãs de UI, com **dados de exemplo fixos** (ainda sem backend real):
  - `src/screens/HomeScreen.tsx` — Início
  - `src/screens/PortfolioScreen.tsx` — Portfólio
  - `src/screens/EventsScreen.tsx` — Eventos
  - `src/screens/AlertsScreen.tsx` — Alertas
  - `src/screens/ProfileScreen.tsx` — Perfil
  - `src/screens/WorkDetailScreen.tsx` — Detalhe de um trabalho
- Assets reais: logótipo (`assets/logo.png`), uma foto de trabalho
  (`assets/work-jaguar-purple.jpg`)
- Firebase SDK instalado, config por preencher (`src/firebase/config.ts`)

---

## Secções por construir

Cada secção abaixo está pensada para ser atacada isoladamente. As que têm
"Depende de" precisam de outra secção estar feita primeiro; as outras
podem avançar em qualquer ordem ou em paralelo (conversas diferentes).

### Secção 1 — Firebase & modelo de dados
**Estado:** Feito (2026-09-03). Os dois projetos existem, a app liga-se ao
de dev, `firestore.rules` publicadas no dev, e as 5 coleções têm um
documento de exemplo cada. Para confirmar num novo ambiente:
`npm run check:firestore`.
**Depende de:** nada — pode começar já
**Objetivo:** Criar **dois** projetos Firebase — um de desenvolvimento
(`marble-studios-dev` ou semelhante) e um de produção (`marble-studios-prod`)
— para nunca arriscarmos partir dados reais de clientes ao testar coisas
novas. Ativar Firestore + Authentication nos dois. Preencher
`src/firebase/config.ts` para apontar ao projeto de dev por omissão (usar
variável de ambiente para trocar para produção no build final). Desenhar
a estrutura de coleções: `clients`, `vehicles` (carro/chão, ligado a um
`clientId`), `works` (trabalhos do portfólio), `events`,
`notifications`/`reminders`.
**Critério de conclusão:** app liga-se ao Firebase de dev sem erros;
coleções criadas na consola com pelo menos um documento de exemplo em
cada; projeto de produção existe mas fica "vazio" até ao lançamento.
**Nota (2026-09-03):** construído nesta sessão —
`src/firebase/config.ts` agora lê `EXPO_PUBLIC_FIREBASE_*` de `.env`
(dev) / `.env.production` (prod) em vez de valores fixos; modelo de dados
TypeScript das 5 coleções em `src/firebase/models.ts`; `firestore.rules` +
`firestore.indexes.json` + `firebase.json` + `.firebaserc` (aliases `dev`/
`prod`) prontos para deploy via CLI; script `npm run seed -- <chave.json>`
(`scripts/seed-firestore.mjs`) para popular um documento de exemplo por
coleção via Firebase Admin SDK. Projetos `marble-studios-dev` e
`marble-studios-prod` criados na consola (Firestore `eur3` em production
mode, Auth email/password, app web registada, Analytics/Gemini desligados);
config real já nos `.env` / `.env.production`; `App.tsx` importa
`src/firebase/config` no arranque. Verificado: `npx expo start --web`
carrega o `.env` e a app arranca sem erros de Firebase.

### Secção 2 — Autenticação de cliente
**Estado:** Feito (2026-09-03). Email/password com recuperação de password,
sessão persistente, Perfil com dados reais. Ver nota no fim.
**Depende de:** Secção 1
**Objetivo:** Ecrã de login/registo (email/password, e possivelmente
Google/Apple sign-in), ligado ao Firebase Auth. Perfil passa a mostrar
dados do utilizador autenticado em vez do "Fábio Pombinho" fixo.
**Ficheiros:** novo `src/screens/LoginScreen.tsx`, ajustar
`RootNavigator.tsx` para mostrar login antes das tabs quando não há sessão.
**Decisões (2026-09-03, Fábio):** só email/password por agora (Google/Apple
ficam para depois da conta de developer — Secção 11); Início, Portfólio e
Eventos abertos sem conta, login só aparece nos tabs Perfil e Alertas;
registo pede nome, email, password e telemóvel obrigatório (a equipa liga
ao cliente no fluxo de checkup).
**Nota (2026-09-03):** construído nesta sessão — `src/auth/AuthContext.tsx`
(sessão + doc `clients/{uid}` em tempo real, `signIn`/`signUp`/`signOut`/
`resetPassword`/`updateClient`), `src/screens/LoginScreen.tsx` (entrar /
criar conta / recuperar password num só ecrã), `src/components/AuthGate.tsx`
(envolve os tabs Perfil e Alertas), `src/screens/PersonalDataScreen.tsx`
(editar nome/telemóvel, link para mudar password), `src/components/FormField.tsx`.
Firebase dividido em `src/firebase/app.ts` + `authInstance.ts` (web) /
`authInstance.native.ts` (iOS/Android com persistência em AsyncStorage —
sem isto a sessão perdia-se ao fechar a app). `ProfileScreen` mostra nome,
iniciais, "cliente desde" e preferências reais (gravadas no Firestore);
carros/chãos e "ação pendente" continuam de exemplo até à Secção 4.
Verificado no web: registo, reload mantém sessão, toggle persiste, guardar
dados pessoais, terminar sessão, password errada dá mensagem. Ficou por
fazer (de propósito, para a Secção 3): aceitação explícita de termos no
registo e "apagar conta".

### Secção 3 — Conformidade RGPD
**Estado:** Feito (2026-09-03). Termos + política no ecrã e em HTML,
aceitação obrigatória no registo, consentimento de marketing separado,
apagar conta por anonimização, retenção definida. Ver nota no fim.
**Depende de:** Secção 1, Secção 2
**Objetivo:** A app vai guardar dados pessoais reais (nome, contacto,
carro/matrícula) de clientes de um negócio na UE — isto traz obrigações
legais, não é só "ter uma página de política de privacidade" para
cumprir os requisitos da loja. Construir:
- Ecrã de política de privacidade + termos, com aceitação explícita no
  registo (não pré-marcada)
- Consentimento **separado** para notificações de marketing (ex: oferta
  de lavagem grátis) — diferente do consentimento para notificações
  operacionais (ex: lembrete de checkup do teu próprio carro)
- Opção "apagar a minha conta e dados" no Perfil, que remove/anonimiza
  o registo do cliente no Firestore
- Definir por quanto tempo os dados são guardados depois de um cliente
  sair (política de retenção)
**Nota:** vale a pena confirmar com um advogado/contabilista da Marble
Studios se há mais alguma obrigação específica (ex: faturas, dados
fiscais) — isto cobre a parte de proteção de dados pessoais na app, não
é aconselhamento legal.
**Decisões (2026-09-03, Fábio):** apagar conta = anonimizar no cliente
(sem Cloud Functions/Blaze, sem mudar regras); retenção = histórico de
trabalhos fica anonimizado, contas inativas há 3 anos são apagadas (job na
Secção 6); consentimento de marketing pede-se só no Perfil, não no registo
(o registo pede apenas a aceitação dos termos); textos redigidos em PT pelo
Claude, o Fábio preenche os dados da empresa.
**Nota (2026-09-03):** construído nesta sessão — `src/legal/texts.ts`
(política + termos + `COMPANY` + `LEGAL_VERSION` + `RETENTION`),
`src/screens/LegalScreen.tsx` (acessível sem login), checkbox de termos no
registo (`src/components/Checkbox.tsx`, nunca pré-marcada, links para os
dois textos), `src/screens/DeleteAccountScreen.tsx` (pede password,
explica consequências, ecrã de despedida), Perfil reorganizado:
"Notificações" com lembretes operacionais sempre ativos + interruptor
"Ofertas e novidades" (off por defeito) que revela as 3 categorias; "Conta"
ganha política, termos e "Apagar a minha conta e dados"; cartão de
re-aceitação quando `consent.termsVersion` ≠ `LEGAL_VERSION`.
`AuthContext` ganha `acceptTerms`, `setMarketingConsent`, `deleteAccount`,
`needsTermsAcceptance`. `npm run build:legal` gera `docs/legal/*.html`
(política, termos, página de pedido de eliminação que o Google Play
exige). Verificado no web: registo bloqueado sem checkbox, links abrem os
textos e voltam com o formulário intacto, conta antiga vê o cartão e
aceita, toggle de marketing revela categorias, apagar conta com password
errada dá erro e com a certa anonimiza o doc (confirmado via Admin SDK:
name/email/phone vazios, `deletedAt`, utilizador Auth inexistente).
**Dados da empresa preenchidos (2026-09-03):** Cacto Elegante, Lda., NIF
519355849, Rua Quinta das Rosas 12A, 2840-131 Paio Pires, app@marble.pt —
em `COMPANY` (`src/legal/texts.ts`), HTML regenerado.
**Fica para depois:** revisão por advogado; job de contas inativas
(Secção 6); publicar `docs/legal/` num URL público (Secção 11). Ponto a
confirmar com a Marble Studios: a cláusula 5 dos termos assume que fotos
dos trabalhos podem ir para o portfólio/redes sem identificar o dono e com
matrícula ocultada, salvo pedido em contrário.

### Secção 4 — Ligar os 6 ecrãs a dados reais
**Estado:** Feito (2026-09-03). Os seis ecrãs leem o Firestore em tempo
real, com estados de carregamento/vazio/erro; regras apertadas e índices
publicados no dev; seed realista. Ver nota no fim.
**Depende de:** Secção 1 (e idealmente Secção 2)
**Objetivo:** Substituir os arrays de exemplo (`WORKS`, `EVENTS`,
`ALERTS`, `departments`, etc.) por queries Firestore reais, ecrã a ecrã.
Pode ser dividido ainda mais (ex: "Secção 4a — Portfólio real",
"Secção 4b — Perfil real") se uma conversa não chegar para os 6.
**Nota:** este é o maior bloco de trabalho — vale a pena fatiar por ecrã.
**Decisão (2026-09-03):** quando houver fotos reais, os cartões dos
departamentos no Início (`HomeScreen.tsx`) passam a mostrar uma foto de
cada área em vez do ícone de linha atual — o Fábio lê ícones de linha como
"feito por IA" (ver regra 5 no `CLAUDE.md`).
**Decisões (2026-09-03, Fábio):** os seis ecrãs numa só conversa; fotos por
URL público em `photoUrl` com gradiente dourado quando vazio (o alojamento
das fotos reais decide-se na Secção 5); seed alargado e corrido no dev;
regras apertadas + índices compostos, com o Fábio a fazer o deploy.
**Nota (2026-09-03):** construído nesta sessão — camada de dados em
`src/data/` (`firestoreHooks.ts` genérico com `onSnapshot`; `works.ts`,
`events.ts`, `notifications.ts`, `vehicles.ts`, `categories.ts`),
`src/components/Photo.tsx` (URL → fallback → gradiente estável por ID),
`src/components/ListState.tsx` (a carregar / vazio / erro),
`src/utils/dates.ts` (`timeAgo`, `formatDate`, …). Ecrãs: Portfólio lê
`works` publicados (filtro por categoria em memória; aceita
`params.category`), Detalhe lê o doc e mostra "já não está disponível" para
rascunhos/inexistentes, Eventos divide Próximos/Passados por data, Início
mostra os `featured` no carrossel (toque abre o Detalhe), ponto no sino só
com alertas por ler, cartões Automotive/Epoxy/Graphic abrem o Portfólio já
filtrado (AI Business, Marble Ads e Xtreme ficam para as Secções 9 e 10);
Alertas lê `notifications` do uid, tocar marca como lido e abre o
trabalho/evento/perfil relacionado; Perfil lê `vehicles` do uid e deriva o
cartão "Ação pendente" do primeiro com `checkupStatus: 'pending'`
(desaparece quando está tudo em dia). `firestore.rules`: `works` só com
`published == true` (as queries TÊM de incluir esse `where`), cliente só
pode alterar `read` em `notifications`. `firestore.indexes.json`: 4 índices
compostos. Seed (`npm run seed -- <chave> [--client email]`) cria 8
trabalhos (1 rascunho), 3 eventos, 2 carros/chãos e 4 alertas ligados à
conta de teste. `npm run check:firestore` valida regras+índices sem login;
`npm run check:firestore:auth -- <chave>` valida Alertas/Perfil como o
cliente. Ecrãs empilhados (Detalhe, Dados pessoais, Legal, Apagar conta)
passaram a respeitar a margem inferior do sistema — o botão "Pedir
orçamento" ficava tapado pela barra de navegação do Android. Verificado no
web (8082) com dados reais: Início, Portfólio (+ filtro), Detalhe
(publicado e rascunho), Eventos (Próximos/Passados); Alertas e Perfil
verificados por script autenticado (leitura, marcar lido permitido, outras
escritas e outros clientes recusados). Fotos: todos os `photoUrl` do seed
ficam vazios (gradiente) até a Secção 5 decidir o alojamento — o
repositório GitHub passou a privado (decisão do Fábio, 2026-09-03), por
isso não serve para servir a foto do Jaguar como chegou a servir. Para o
Jaguar continuar com foto real até lá, `src/data/localPhotos.ts` embute
`assets/work-jaguar-purple.jpg` como reserva do doc `work-example`
(transitório; apagar quando houver `photoUrl` reais).

### Secção 5 — Painel da equipa (backoffice)
**Estado:** Feito (2026-09-03). Backoffice web em
`C:\Users\VGodr\Projects\marble-backoffice` (repositório próprio,
https://github.com/vampiregodric/marble.backoffice), publicado em
https://marble-studios-backoffice-dev.web.app. Ver "Decisões" e "Nota" no
fim desta secção.
**Depende de:** Secção 1
**Objetivo:** Interface para a equipa da Marble Studios gerir clientes,
carros/chãos, trabalhos (adicionar ao portfólio), eventos, e escolher o
que aparece no carrossel do Início. **Confirmado: é uma app separada**
da app do cliente, não faz parte deste projeto React Native — vai ser um
projeto novo/próprio, a apontar ao mesmo Firebase.
**Decisão em aberto:** web (mais rápido de construir e usar num
computador da loja) ou também mobile? A recomendação é começar por web —
a equipa provavelmente vai gerir isto de um computador, não em
movimento, e web evita duplicar trabalho de UI numa fase inicial.
**Nota técnica (da Secção 1):** `firestore.rules` tem `write: if false`
em `works`, `events`, `vehicles` e `notifications`. Isso só funciona se o
backoffice escrever via Admin SDK (servidor/Cloud Functions). Se for uma
app web com login da equipa a usar o SDK de cliente, é preciso dar um
*custom claim* `admin: true` aos utilizadores da equipa (via Admin SDK ou
Cloud Function) e alterar as regras para
`allow write: if request.auth.token.admin == true`.
**Da Secção 4:** o que o backoffice tem de preencher para a app mostrar bem
cada coisa: em `works`, `published` (só a true aparece — rascunhos ficam
invisíveis pelas regras), `featured` (carrossel do Início, curadoria
manual), `category` (um de `Automotive` / `Epoxy Floors` / `Graphic`),
`completedAt`, `photoUrl`; em `vehicles`, `checkupStatus` (`pending` faz
aparecer o cartão "Ação pendente" no Perfil) e `lastServiceAt`; em
`notifications`, `read: false` e o `relatedWorkId`/`relatedEventId`/
`relatedVehicleId` que a app usa para abrir o sítio certo ao tocar. **Fotos:**
decidir aqui onde ficam alojadas (Firebase Storage exige Blaze em projetos
novos; alternativas: Cloudinary, Bunny, um bucket S3/R2) — a app só precisa
de um URL público em `photoUrl`, e cai num gradiente quando está vazio.
**Galeria (pedido do Fábio, 2026-09-03, ver SPEC.md):** cada trabalho vai
ter várias fotos e vídeo, não só a capa. O backoffice precisa de upload
múltiplo e de alojamento que aguente vídeo (ou aceitar links YouTube/Vimeo
para o vídeo, que é a opção mais barata). Modelo já definido em
`src/firebase/models.ts` (`WorkMedia`, `Work.media[]`:
`{ type: 'photo' | 'video', url, thumbnailUrl?, order? }`), mantendo
`photoUrl` como capa. A galeria no Detalhe da app (deslizável + leitor de
vídeo) constrói-se assim que o backoffice conseguir carregar média, para
ser testada com fotos reais — primeira tarefa do lado da app depois disso.
**Foto de perfil do cliente (confirmado 2026-09-03, ver SPEC.md):** o
alojamento escolhido aqui tem de servir também a foto de perfil que o
cliente carrega a partir da app (a única escrita de ficheiros do lado do
cliente — precisa de regras de upload restritas ao próprio uid e de limite
de tamanho). Construir na app, junto com a galeria, depois desta secção:
seletor de imagem, upload, `clients/{uid}.avatarUrl`, e atualização da
política de privacidade (`LEGAL_VERSION`). Até lá o ícone de câmara no
avatar do Perfil fica, de propósito, sem ação.
**Decisões (2026-09-03, Fábio):** web responsiva instalável como PWA (sem
app mobile); Vite + React + TypeScript com CSS próprio no tema
preto/dourado; escrita no Firestore com o SDK de cliente + login da equipa
com claim `admin: true` (sem servidor, sem Blaze); fotos e vídeo no
**Cloudinary** (plano gratuito, upload unsigned direto do browser, com
miniaturas de vídeo e redimensionamento automáticos — serve também a foto
de perfil do cliente, preset `marble-avatars`); publicação em Firebase
Hosting do mesmo projeto (site `marble-studios-backoffice-dev`; o prod na
Secção 11); uma só zona de upload em que a primeira foto é a capa e
qualquer outra pode ser promovida; ação "Juntar fichas" construída já;
alertas manuais (lembrete de checkup, mensagem da equipa, oferta) com o
consentimento RGPD aplicado na interface e no código.
**Nota (2026-09-03):** construído nesta sessão. **Do lado da app:**
`firestore.rules` ganhou `isAdmin()` (claim `admin`) — a equipa lê e
escreve tudo, incluindo rascunhos e dados de clientes; cliente continua
igual. `useFeaturedWorks` passou a ordenar por `featuredOrder` (novo campo,
obrigatório quando `featured` é true — o Firestore exclui docs sem ele; o
índice `featured+published+featuredOrder` substitui o antigo). Modelo
ganhou `Work.featuredOrder/updatedAt`, `WorkMedia.publicId`,
`Client.createdByTeam/notes/mergedInto`, `Vehicle.plate/updatedAt`,
`MarbleEvent.updatedAt` e o tipo de alerta `message` (operacional, da
equipa). Seed atualizado (featuredOrder nos destaques, `createdByTeam` no
cliente de exemplo) e corrido no dev. `.claude/launch.json` ganhou
`marble-backoffice-web` (porta 5180). **Backoffice:** Painel (números,
checkups pendentes com contacto e "Enviar lembrete", alertas internos,
últimos trabalhos), Trabalhos (lista com filtros; formulário com galeria
drag-and-drop, capa, produtos, cliente/carro, publicado/destaque),
Destaques (ordem do carrossel por arrastar, guardada num só batch),
Eventos, Clientes (contas da app + fichas sem conta, detecção de
duplicados por email/telemóvel, "Juntar fichas" que passa carros/trabalhos/
alertas para a conta e anonimiza a ficha), ficha do cliente (dados,
consentimentos RGPD, carros/chãos com checkup, trabalhos, alertas),
Alertas (lista + envio manual com bloqueio de marketing sem consentimento).
Contas da equipa via `scripts/set-admin.mjs` (cria sem password; a pessoa
define-a com "Esqueci-me da password"); login por token só em dev
(`scripts/dev-token.mjs`) para o Claude testar sem passwords. Admins no
dev: v.godric@gmail.com e equipa.teste@example.com. Verificado no browser
com dados reais do dev: login por token, painel, lista de trabalhos,
editar trabalho com foto por URL (doc gravado com `media[]` + `photoUrl` +
`updatedAt`), destaques (tirar/juntar/guardar ordem), e deploy para o
Hosting dev. **Fica pendente do Fábio:** cloud name do Cloudinary (até lá a
galeria só aceita fotos por URL) e criar o repositório GitHub privado
`marble-backoffice`. **Próximo do lado da app:** galeria no Detalhe
(`media[]`, deslizável + vídeo), foto de perfil do cliente (preset
`marble-avatars`, `clients/{uid}.avatarUrl`, subir `LEGAL_VERSION`), e
fotos reais em vez do ícone de linha nos cartões do Início — tudo na
Secção 5b, abaixo.

### Secção 5b — Galeria e foto de perfil na app
**Estado:** Feito (2026-09-04). Galeria deslizável + visualizador em ecrã
inteiro com vídeo no Detalhe, foto de perfil do cliente (Cloudinary),
cartões do Início com a foto escolhida pela equipa no backoffice, textos
legais atualizados. Ver "Decisões" e "Nota" no fim desta secção.
**Depende de:** Secção 5 (alojamento Cloudinary e `works.media[]` já
preenchidos pelo backoffice)
**Objetivo:** Fechar o ciclo das fotos do lado da app do cliente, agora que
o backoffice carrega média para o Cloudinary:
- **Galeria no Detalhe** (`src/screens/WorkDetailScreen.tsx`): a foto
  grande do topo passa a ser uma galeria deslizável com `works.media[]`
  (ordenado por `order`), pontos de posição, e vídeo com miniatura
  (`thumbnailUrl`) que só carrega o vídeo ao tocar (`expo-video`). Sem
  `media`, mostra só a capa como hoje. Contador "3 / 7" em texto, sem
  ícones decorativos.
- **Foto de perfil do cliente** (`src/screens/ProfileScreen.tsx`): tocar no
  avatar abre o seletor de imagem (`expo-image-picker`), reduz a imagem
  (`expo-image-manipulator`, máx. 1024px) e faz upload unsigned para o
  Cloudinary com o preset `marble-avatars` (pasta `avatars`; cloud name em
  `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` no `.env`). Guarda o URL de entrega
  em `clients/{uid}.avatarUrl` (as regras já deixam o próprio escrever no
  seu doc). Remover foto = `avatarUrl: ''`. Apagar conta já limpa o campo.
- **Política de privacidade:** acrescentar "foto de perfil (opcional)" aos
  dados pessoais em `src/legal/texts.ts`, subir `LEGAL_VERSION` e correr
  `npm run build:legal`. O Perfil vai pedir nova aceitação a todos (é o
  comportamento previsto na Secção 3).
- **Fotos reais no Início:** os cartões Automotive/Epoxy/Graphic passam a
  mostrar a capa do trabalho mais recente publicado de cada categoria em
  vez do ícone de linha (decisão da Secção 4). Fallback: gradiente.
- **Limpeza:** quando a foto real do Jaguar estiver carregada no backoffice,
  apagar `src/data/localPhotos.ts` e os `fallback=` nos três ecrãs.
**Notas:** o backoffice gera URLs já otimizados (`c_limit,w_1600,q_auto,
f_auto` para fotos, `.mp4` com `q_auto` para vídeo, miniatura `.jpg` do
vídeo) — a app não precisa de saber que é Cloudinary, só mostra `url` e
`thumbnailUrl`. Para testar precisa do cloud name do Cloudinary (pedido ao
Fábio na Secção 5); sem ele, a galeria testa-se com fotos por URL público
juntadas no backoffice. O preset `marble-avatars` deve ter incoming
transformation `c_limit,w_1024,h_1024` e formatos `jpg,png,webp,heic`
(qualquer pessoa com o cloud name pode fazer upload para esse preset — o
limite de tamanho no preset é a proteção contra abuso).
**Decisões (2026-09-04, Fábio):** vídeo e fotos abrem num visualizador em
ecrã inteiro (deslizável, contador em texto, "Fechar"), o vídeo só carrega
aí; foto de perfil com menu no avatar ("Escolher da galeria", "Tirar
foto", "Remover foto" quando há foto); os cartões do Início mostram uma
foto **escolhida pela equipa no backoffice** por departamento (não "o
trabalho mais recente"), guardada em `settings/home`; extras aceites: foto
do cliente no botão de Perfil do Início, hero do Detalhe em 4:3, foto do
cliente na ficha dele no backoffice.
**Nota (2026-09-04):** construído nesta sessão. **App:**
`src/components/WorkGallery.tsx` + `MediaViewer.tsx` (`expo-video`, leitor
só para o item ativo), `galleryItems()` em `src/data/works.ts`;
`src/media/avatarPicker.ts` (`expo-image-picker` + `expo-image-manipulator`,
recorte quadrado, 1024 px) e `src/media/cloudinary.ts` (upload unsigned
`marble-avatars`, tags `avatar,uid_<uid>`, URL `c_fill,w_512,h_512,g_face`);
`src/components/Avatar.tsx` e `ActionSheet.tsx`; `ClientUpdate` aceita
`avatarUrl`; Início lê `settings/home` (`useHomeSettings`,
`src/data/departments.ts`) e desenha os seis cartões com foto de fundo ou
gradiente — os ícones de departamento saíram de `Icons.tsx`;
`src/data/localPhotos.ts` e os `fallback=` apagados (o Jaguar vem do
Cloudinary). Modelo: `COLLECTIONS.settings`, `DepartmentId`,
`DepartmentCover`, `HomeSettings`. Regras: `settings/*` leitura pública,
escrita admin (publicadas no dev). Seed: `settings/home` com o Jaguar no
Automotive (`merge`). `check:firestore` verifica `settings/home`. Textos
legais: foto de perfil (dados, base legal = consentimento, direitos),
Cloudinary como subcontratante, ficheiro apagado em 30 dias
(`RETENTION.avatarFileDays`); `LEGAL_VERSION` 2026-09-04, HTML regenerado.
`app.json`: plugins `expo-video` e `expo-image-picker` (textos de
permissão PT). **Backoffice** (repositório próprio): `settings/home` em
tempo real (`useDocument`), `saveDepartmentCover` (setDoc merge),
"Destaques > Fotos dos serviços" (seis cartões: carregar foto ou usar a
capa de um trabalho publicado, "Tirar"), avatar do cliente na ficha,
`models.ts` sincronizado, README com a obrigação de apagar o ficheiro do
avatar em 30 dias. Verificado no web (8082 + backoffice 5180 com dados
reais do dev): Início com o Jaguar no cartão Automotive (escolhido no
backoffice), Detalhe do Jaguar (hero 4:3, visualizador), Detalhe do
"Metallic Epoxy — Showroom Premium" com galeria de 2 itens (foto + vídeo
de teste carregados pelo backoffice para o Cloudinary; o vídeo reproduz no
visualizador com `expo-video`), foto de perfil carregada de ponta a ponta
(seletor → redução → Cloudinary → `avatarUrl`) com a conta de teste.
**Fica para depois:** apagar automaticamente o ficheiro do avatar no
Cloudinary ao remover/apagar conta (Secção 6, Cloud Function com a API
assinada); o vídeo de teste no trabalho "Showroom" pode ser removido no
backoffice quando a equipa tiver vídeos reais; o preset `marble-avatars`
ainda guarda na pasta `works` (cosmético, Fábio corrige no Cloudinary).

### Secção 6 — Notificações push automáticas
**Estado:** Feito (2026-09-04). Cloud Functions publicadas no dev
(`onNotificationCreated` → push, `onWorkWritten` → novo trabalho,
`onClientUpdated` → Cloudinary, `dailyJobs` às 10:00 de Lisboa), Blaze
ativo, development build Android instalada no telemóvel do Fábio e **push
real verificado** (chegou, o toque abriu os Alertas e marcou como lido).
Backoffice com o plano de acompanhamento por trabalho e a coluna Push.
**Pendente (não bloqueia):** os segredos do Cloudinary
(`functions:secrets:set CLOUDINARY_API_KEY` / `_SECRET`, pelo Fábio) e
mudar `CLOUDINARY_CLEANUP=off` → `on` em `functions/.env` + novo deploy,
para a foto de perfil ser apagada sozinha no Cloudinary; até lá a
`onClientUpdated` só regista nos logs. Ver nota no fim.
**Depende de:** Secção 1, Secção 3 (consentimento), Secção 4
**Objetivo:** Cloud Functions com scheduler para o fluxo descrito no
SPEC.md (**nota:** o SDK `firebase` JS instalado só faz FCM na web; em
iOS/Android o caminho com Expo é `expo-notifications` + Expo Push Service,
disparado a partir das Cloud Functions. Cloud Functions exigem o plano
Blaze — cartão associado, custo ~€0 a este volume): +1 semana após um trabalho
→ lembrete de checkup; sem confirmação → alerta interno à equipa; +1 mês
→ oferta automática (lavagem grátis para carros, inspeção/manutenção
para chãos — **por confirmar com o Fábio**, ver SPEC.md). Respeitar
sempre a preferência de consentimento de marketing definida na Secção 3:
`offer`, `new_work` e `event_reminder` só vão para clientes com
`consent.marketing == true` (e, para `new_work`, com a categoria ligada em
`notificationPrefs`); `checkup_reminder` é operacional e vai sempre.
Inclui também o job de retenção da Secção 3: apagar (anonimizar doc +
apagar utilizador Auth) contas sem atividade há 3 anos
(`RETENTION.inactiveAccountYears` em `src/legal/texts.ts`).
**Da Secção 4:** ao criar uma notificação, copiar o `photoUrl` do trabalho/
evento relacionado para `notifications.photoUrl` (miniatura no ecrã de
Alertas) e preencher `relatedWorkId`/`relatedEventId`/`relatedVehicleId`.
`team_alert` nunca é mostrado ao cliente (a app filtra-o).
**Da Secção 5:** o backoffice já cria docs em `notifications` à mão
(`checkup_reminder`, `message`, `offer`) com as regras de consentimento
aplicadas em `marble-backoffice/src/data/writes.ts` → `sendNotification`;
as Cloud Functions devem gerar docs com o mesmo formato (o push é um
acréscimo, não substitui o doc — é o doc que aparece no ecrã Alertas).
Os `team_alert` criados aqui aparecem no Painel do backoffice com "Marcar
como visto". Clientes com `createdByTeam: true` não têm conta na app —
nunca lhes enviar nada. Regras: só o claim `admin` escreve em
`notifications`; as Functions usam o Admin SDK, que passa por cima das
regras.
**Da Secção 5b:** a app não consegue apagar ficheiros no Cloudinary (API
assinada). A política de privacidade promete que o ficheiro da foto de
perfil desaparece do alojamento em 30 dias (`RETENTION.avatarFileDays`)
depois de o cliente a remover ou apagar a conta. Construir aqui uma Cloud
Function (trigger em `clients/{uid}` quando `avatarUrl` muda ou é apagado,
e no job de retenção) que chama a Admin API do Cloudinary (API key/secret
só em variáveis das Functions, nunca na app nem no backoffice) e apaga os
ficheiros com a tag `uid_<uid>`. Até lá é manual (ver README do
backoffice).
**Nota (2026-09-04):** decisões do Fábio nesta sessão — (1) Blaze no dev
(não GitHub Actions); (2) **chãos não têm oferta** (a lavagem grátis é só
para carros); (3) **a cadência não é geral: a equipa define o
acompanhamento trabalho a trabalho ao registar o trabalho concluído**
("PPF completo tem checkup a 1 semana e lavagem a 1 mês; só retrovisores
não; detail não; teto estrelado sim") — cartão "Acompanhamento pós-serviço"
no formulário do trabalho do backoffice, com plano padrão 7 / 3 / 30 e
tudo ajustável/desligável (`works.followUp`, `WorkFollowUp` em
`models.ts`); (4) development build Android via EAS para testar o push
real (o Expo Go no Android já não recebe push remoto desde o SDK 53).
Construído: `functions/` (TypeScript, v2, `europe-west1`; `dailyJobs` às
10:00 de Lisboa, `onNotificationCreated` → push, `onWorkWritten` →
`new_work` + `lastServiceAt`, `onClientUpdated` → Cloudinary por tag;
lógica separada do wiring e corrível localmente com `npm run
functions:jobs`), app (`src/push/`, cartão "Ativar notificações" no ecrã
Alertas, `openFromPush` no `RootNavigator`, `lastActiveAt`, token removido
ao sair/apagar conta, `assets/notification-icon.png` a partir do logo,
`eas.json`, pacote `pt.marble.app`, login por token de dev no web), backoffice
(secção de acompanhamento no formulário do trabalho com datas e estados,
"Marcar em dia" grava `checkupDoneAt`, coluna Push na lista de Alertas,
modelo sincronizado). Campos novos: `clients.pushTokens/lastActiveAt/
retentionWarnedAt`, `vehicles.checkupDoneAt/checkupRequestedAt`,
`works.followUp/newWorkNotifiedAt`, `events.reminderSentAt`,
`notifications.push`. Verificado contra o dev com o script de jobs
(checkup → alerta interno ao dia 3 → oferta recusada por falta de
consentimento; `new_work` só a quem tem categoria e consentimento;
lembrete de evento na véspera; aviso e anonimização por inatividade; push
com token inválido → `DeviceNotRegistered` e token removido) e no browser
(app web com login por token: alertas a chegar em tempo real; backoffice:
formulário, Painel com o alerta interno, coluna Push). Regras e índices do
Firestore não mudaram. Ver DEVELOPMENT.md, "Notificações push e Cloud
Functions". Para a Secção 8: o job já trata `vehicles.checkupRequestedAt`
como confirmação — basta o botão "Agendar agora" gravá-lo. Para a Secção
11: ligar o projeto prod à conta de faturação "My Billing Account" (já
existe, ver DEVELOPMENT.md "Blaze no dev"), segredos + deploy das
Functions no prod, `google-services.json`
do prod, credencial FCM do prod no EAS.

### Secção 7 — Ecrã de pedido de orçamento
**Estado:** Feito e verificado no dev (2026-09-04). Ecrã `RequestQuote`
(a partir do Detalhe com `workId`, de um departamento com `department`,
ou do Perfil), formulário por departamento (`src/data/requestForms.ts`:
opções, carro/espaço/empresa, mensagem, fotos opcionais, contacto
preferido), **conta criada na hora para quem não tem** (decisão do Fábio;
email "definir password" do Firebase), coleção `requests` com regras
validadas campo a campo e índice, Cloud Function `onRequestWritten`
(anti-spam, alerta interno no Painel, "Recebemos o teu pedido" ao cliente
com push, emails pelo Resend quando ligado, limpeza de fotos no
Cloudinary), retenção de 12 meses no job diário e anonimização ao apagar
conta, "Os teus pedidos" no Perfil, página **Pedidos** no backoffice
(estados recebido → em contacto → fechado, notas, fotos, Painel e barra
lateral), política de privacidade e termos atualizados
(`LEGAL_VERSION` 2026-09-05). Functions publicadas no dev. Verificado no
browser (fluxo com sessão, fluxo sem conta a criar conta, estado a mudar
em tempo real no Perfil, alerta nos Alertas, backoffice) e com os scripts
`check:firestore*` e `functions:jobs --request`. **Pendente do Fábio
(não bloqueia):** preset `marble-requests` no Cloudinary (fotos), conta
Resend + DNS do marble.pt + segredo `RESEND_API_KEY` + `QUOTE_EMAIL=on`
(emails para quotes@marble.pt e ao cliente), traduzir o template "repor
password" do Firebase Auth. Ver DEVELOPMENT.md, "Pedidos de orçamento".
**Depende de:** Secção 1 (para guardar o pedido)
**Objetivo:** O botão "Pedir orçamento semelhante" no Detalhe do Trabalho
(`src/screens/WorkDetailScreen.tsx`) ainda não faz nada. Construir o
formulário/fluxo de pedido de orçamento.
**Nota (2026-09-04):** decisões do Fábio — (1) o pedido **cria conta**
(os dados são os mesmos do registo; password definida por email); (2)
campos por departamento: carro/chão + o que pretende, com opções, fotos
opcionais; (3) a equipa recebe alerta interno + o cliente alerta de
confirmação, **e email para quotes@marble.pt** (Resend, remetente
app@marble.pt); (4) página Pedidos completa no backoffice; (5) prazo
prometido: **1 dia útil**; (6) retenção: **12 meses depois de fechado**.
**Para a Secção 8:** usar a mesma coleção com `type: 'checkup'` e
`vehicleId` — `validNewRequest` já aceita os dois; `handleRequestCreated`
e os textos (`requestKind`) já distinguem o tipo; a página Pedidos mostra
"Pedido de checkup". Basta o botão "Agendar agora" gravar o doc (e
`vehicles.checkupRequestedAt` é da Function ou da regra a decidir lá).
**Para as Secções 9 e 10:** `navigation.navigate('RequestQuote', { department: 'ai' | 'ads' | 'xps' })`
— os três formulários já existem em `requestForms.ts`.
**Para a Secção 11:** `RESEND_API_KEY` no prod, `BACKOFFICE_URL` do prod em
`functions/.env.prod` (ou o equivalente), preset `marble-requests`,
App Check.

### Secção 8 — Fluxo de agendamento de checkup
**Estado:** Por fazer
**Depende de:** Secção 1, Secção 6
**Objetivo:** O botão "Agendar agora" no cartão de "Ação pendente" do
Perfil (`src/screens/ProfileScreen.tsx`) ainda não faz nada. Decidir e
construir: calendário dentro da app, ou só confirmação simples que avisa
a equipa?
**Plano (2026-09-04, Fábio):** corre em **paralelo com a Secção 7**, numa
conversa própria, **sem tocar no backoffice** (que é da 7): o pedido fica
no próprio carro/chão (`vehicles/{id}`: `checkupRequestedAt` + dia
preferido + nota), as regras deixam o dono escrever só esses campos, e
uma Cloud Function (`functions/`) cria um `team_alert` "Ligar a X: pediu
checkup do Y para dia Z" no Painel que já existe. O job diário já trata
`checkupRequestedAt` como "confirmado". A cópia de `models.ts` do
backoffice sincroniza-se depois de a 7 entrar.

### Secção 9 — Conteúdo estático: AI Business & Marble Ads
**Estado:** Feito (2026-09-04). Página de serviços genérica para os cinco
departamentos com conteúdo (não só AI Business e Marble Ads — ver
"Decisões"); a Xtreme fica para a Secção 10 com o mesmo ecrã.
**Depende de:** nada
**Objetivo:** As secções "AI Business" (consultoria de IA) e "Marble Ads"
(Google/Meta Ads) na Home ainda só têm o cartão — precisam de uma página
própria quando clicadas (provavelmente informativa + formulário de
contacto, sem muita lógica de dados).
**Decisões (2026-09-04, Fábio):** os cartões Automotive, Epoxy e Graphic
também abrem uma página de serviços (não o Portfólio filtrado — "serviços
primeiro"); o Portfólio filtrado fica a um toque dentro da página. Sem
formulário próprio: o botão final abre o pedido de orçamento da Secção 7.
Conteúdo só em português, estrutura pronta para inglês. Textos: rascunho
do Claude a partir do SPEC, preço "sob consulta" em todos — **o Fábio
ainda vai corrigir factos** (serviços concretos, resultados, preços) em
`src/data/departmentContent.ts`.
**Nota (2026-09-04):** construído nesta sessão, só na app (backoffice e
Firestore intocados — o conteúdo é estático, no código).
`src/data/departmentContent.ts`: `DepartmentContent` (headline, intro,
services[], steps[], pricing, cta `quote` | `link`) por idioma
(`CONTENT.pt`, `CONTENT.en` vazio → cai para PT), `departmentContent(id)`
e `hasDepartmentContent(id)`. `src/screens/DepartmentScreen.tsx` (rota
`Department { id }`, URL web `services/:id`): foto de
`settings/home.departmentCovers` (a do cartão; gradiente sem foto), nome e
tagline de `DEPARTMENTS`, headline, intro, "O que fazemos" em cartões,
"Como funciona" com números e linha, "Trabalhos recentes" da categoria
(reutiliza `usePublishedWorks`, filtro em memória, sem índice novo) com
"Ver portfólio" → Portfólio filtrado, "Investimento", botão fixo em baixo.
Sem ícones decorativos. Início: cada cartão com conteúdo abre a página
(`hasDepartmentContent`); sem conteúdo o cartão fica inerte (Xtreme até à
Secção 10). Contrato com a Secção 7: rota `RequestQuote { workId?,
department? }` em `types.ts` e um **ecrã de reserva**
`src/screens/RequestQuoteScreen.tsx` ("em breve" + email app@marble.pt)
que a Secção 7 substitui por completo. Verificado no web (8083, dados do
dev): AI Business, Automotive (foto do Jaguar no topo e 4 trabalhos
recentes com fotos reais), cartão do Início → página, "Ver portfólio" →
Portfólio só com Epoxy, "Pedir orçamento" → ecrã de reserva com o
departamento; `npm run typecheck` limpo. **Para a Secção 10:** basta
acrescentar `xps` (e depois `inozetek`, com o `DepartmentId` novo) a
`CONTENT.pt`, com `cta: { kind: 'link', url }` para a loja online — o
cartão do Início e a rota já funcionam.

### Secção 10 — Distribuição: Xtreme Polishing Systems & Inozetek
**Estado:** Por fazer
**Depende de:** nada
**Objetivo:** O cartão "Xtreme Polishing Systems" na Home precisa de
ligar a algo real (link externo? página própria?). Preparar o mesmo
tratamento para a Inozetek quando a parceria for oficial (ver SPEC.md).
**Nota (Secção 9):** o ecrã genérico já existe — `DepartmentScreen` lê
`src/data/departmentContent.ts`. Acrescentar a entrada `xps` a
`CONTENT.pt` (headline, intro, o que vendem, como comprar, `cta: { kind:
'link', label: 'Comprar na loja', url }`) e o cartão do Início abre-a
sozinho. Para a Inozetek: novo `DepartmentId` em `models.ts` (app e
backoffice), entrada em `DEPARTMENTS` e conteúdo — a foto do cartão passa
a ser escolhível no backoffice sem mais código.
**Plano (2026-09-04, Fábio):** corre em **paralelo com a 7 e a 8**, só na
app. A Inozetek fica com o conteúdo preparado mas **sem cartão** até a
parceria ser oficial (SPEC) — o `DepartmentId` novo exige o backoffice,
que é da Secção 7.

### Secção 11 — Preparação para lançamento nas lojas
**Estado:** Por fazer
**Depende de:** praticamente todas as outras, incluindo a Secção 3
(RGPD) e o projeto Firebase de produção da Secção 1
**Objetivo:** Conta de developer Apple (99$/ano) e Google Play (25$
único), ícones/splash finais em todos os tamanhos, screenshots para as
lojas, ligar a app ao Firebase de **produção**, texto da ficha da loja.
**Da Secção 3:** as lojas exigem um URL público da política de
privacidade, e o Google Play exige também uma página web para pedir a
eliminação da conta. Ambas já existem em `docs/legal/` (geradas por
`npm run build:legal`, dados da empresa já preenchidos); falta publicá-las
(o mais simples é GitHub Pages a servir a pasta `docs/`). Preencher
também o formulário "Data safety" (Play) / "App Privacy"
(Apple) com o que a política declara: nome, email, telemóvel, dados de
veículo, identificador de push. Ainda da Secção 3, a fazer aqui e não
antes: (a) confirmar com o dono da Marble Studios a cláusula 5 dos termos
(fotos dos trabalhos no portfólio/redes sem identificar o dono, matrícula
ocultada, salvo pedido em contrário) e ajustar o texto se ele quiser
outra regra; (b) revisão dos dois textos por advogado, quando os textos estiverem
estáveis; se o texto mudar,
subir `LEGAL_VERSION` e correr `npm run build:legal`.
**Da Secção 6:** o prod precisa do plano Blaze, dos segredos do Cloudinary
(`functions:secrets:set … --project prod`) e do deploy das Functions
(`deploy --project prod --only functions`); registar a app Android do prod
no Firebase (`pt.marble.app`) e usar o seu `google-services.json` na build
de produção; carregar a credencial FCM V1 do prod no EAS. Sem isto não há
push nem lembretes em produção.
**Plano (2026-09-04, Fábio): em duas partes.** A **parte 1** arranca já,
em paralelo com 7, 8 e 10, porque as contas das lojas demoram dias a
aprovar: contas Apple Developer e Google Play (Fábio), plano Blaze e
Functions no prod, ícones e splash finais em todos os tamanhos
(`app.json`, `assets/`), perfil de produção do EAS, ficha da loja (PT/EN),
formulários "Data safety"/"App Privacy" a partir da política, páginas
legais publicadas (GitHub Pages). Não toca em `src/`. A **parte 2**
(build de produção, screenshots finais, submissão) só depois de 7, 8, 10
e 12 estarem no master.

### Secção 12 — Inglês
**Estado:** Por fazer
**Depende de:** Secções 7, 8 e 10 no master (toca em todos os ecrãs —
**nunca em paralelo com secções de UI**), antes da parte 2 da Secção 11
**Objetivo:** O SPEC diz Português + Inglês e a app está só em português.
Pôr toda a UI em PT + EN, escolhido pelo idioma do telemóvel (sem seletor
próprio, a não ser que o Fábio queira): textos dos ecrãs, estados vazios,
erros, `src/data/departmentContent.ts` (`CONTENT.en`, estrutura já pronta),
`src/data/categories.ts`, `DEPARTMENTS` (nome/tagline), datas
(`src/utils/dates.ts`). Os textos legais ficam só em PT (a revisão jurídica
é de um texto). Pesar `expo-localization` + um módulo `t()` simples em vez
de uma biblioteca de i18n completa. Os alertas criados pelo backoffice e
pelas Functions são escritos pela equipa em PT — decidir se ficam assim.

---

## Notas para quem pega numa secção

- Todos os ecrãs seguem o mesmo sistema de cores/tipografia em
  `src/theme/theme.ts` — usa sempre esses tokens, não cores à mão.
- O projeto vive fora do OneDrive de propósito (ver aviso em
  `DEVELOPMENT.md`) — nunca movas a pasta de volta para lá.
- Faz commit no fim da tua secção, com mensagem clara do que ficou feito.
