# Marble Studios App — notas de desenvolvimento

## Como correr o projeto

```
npx expo start --web      # preview no browser
npx expo start            # QR code para abrir na app Expo Go (Android/iOS)
```

**Se o PowerShell disser "running scripts is disabled on this system"**:
usa `npx.cmd` em vez de `npx` (ex: `npx.cmd expo start --web`). O `.cmd`
contorna a política de execução sem mexer em definições do Windows.

## Estado atual

Os seis ecrãs leem o Firestore de dev em tempo real (Secção 4, 2026-09-03):
- `src/screens/HomeScreen.tsx` — Início: carrossel = `works` com
  `featured: true`; ponto no sino = alertas por ler; cartões
  Automotive/Epoxy/Graphic abrem o Portfólio filtrado
- `src/screens/PortfolioScreen.tsx` — Portfólio: `works` publicados
- `src/screens/WorkDetailScreen.tsx` — Detalhe: um doc de `works`
- `src/screens/EventsScreen.tsx` — Eventos: `events` (Próximos/Passados)
- `src/screens/AlertsScreen.tsx` — Alertas: `notifications` do uid
- `src/screens/ProfileScreen.tsx` — Perfil: `clients/{uid}` + `vehicles`

Já não há arrays de exemplo em nenhum ecrã. Ver "Dados reais" abaixo.

## Por fazer a seguir

1. **Firebase real** — feito (2026-09-03): `marble-studios-dev` e
   `marble-studios-prod` existem, com Firestore (`eur3`, production mode) e
   Auth (email/password) ativos; config nos `.env` / `.env.production`.
   Ver "Firebase: os dois projetos" abaixo para o que falta (regras + seed).
2. **Autenticação** — feito (2026-09-03): ver "Autenticação" abaixo.
3. **Ligar os ecrãs ao Firestore** — feito (2026-09-03): ver "Dados reais"
   abaixo.
4. **Painel da equipa (backoffice)** — ainda não desenhado nem construído.
   É a próxima secção; é quem vai criar trabalhos, eventos, carros/chãos e
   alertas (a app só lê, exceto marcar alertas como lidos).
5. **Notificações push** — Firebase Cloud Messaging + lógica dos lembretes
   automáticos (checkup 1 semana depois, etc.) ainda por implementar.
6. **Fotos reais** — a app mostra qualquer URL público em `photoUrl`
   (`src/components/Photo.tsx`) e cai num gradiente dourado quando está
   vazio. Onde alojar as fotos decide-se com o backoffice (Secção 5); até
   lá todos os `photoUrl` do seed estão vazios (o repositório GitHub é
   privado, não serve para alojar fotos). Exceção transitória: a foto do
   Jaguar vem embutida na app (`src/data/localPhotos.ts` →
   `assets/work-jaguar-purple.jpg`) como reserva para o doc `work-example`
   enquanto o `photoUrl` estiver vazio. Quando o backoffice preencher URLs,
   apaga esse ficheiro e os `fallback=` nos três ecrãs.

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
