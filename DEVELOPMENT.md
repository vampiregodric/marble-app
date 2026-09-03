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
   vazio. Onde alojar as fotos decide-se com o backoffice (Secção 5). No
   dev só o Jaguar tem foto, servida pelo repo público no GitHub.

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
projeto — os aliases estão em `.firebaserc`). Nota: o Claude Code em modo
automático não pode correr deploys — corre tu este comando no teu
PowerShell. Os índices demoram 1 a 3 minutos a construir.

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

## Nota importante: pasta do projeto está dentro do OneDrive

Isto causa um problema real: o Metro (o compilador do Expo) às vezes não
deteta alterações a ficheiros guardados nesta pasta, porque o OneDrive
interfere com a monitorização de ficheiros do Windows. Sintoma: editas um
ficheiro, mas o que aparece no telemóvel/browser continua a versão antiga.

**Solução se isto acontecer:** parar o servidor (Ctrl+C) e voltar a correr
`npx expo start`. Isso força a reler tudo do disco.

**Solução definitiva (recomendada):** mover esta pasta para fora do
OneDrive, por exemplo para `C:\Users\VGodr\Projects\marble-app`. Pastas de
projetos de código não devem viver em pastas sincronizadas na cloud
(OneDrive/Dropbox/Google Drive) — é uma prática standard, não é specific
a este projeto.
