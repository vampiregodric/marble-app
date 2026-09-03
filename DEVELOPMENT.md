# Marble Studios App — notas de desenvolvimento

## Como correr o projeto

```
npx expo start --web      # preview no browser
npx expo start            # QR code para abrir na app Expo Go (Android/iOS)
```

**Se o PowerShell disser "running scripts is disabled on this system"**:
usa `npx.cmd` em vez de `npx` (ex: `npx.cmd expo start --web`). O `.cmd`
contorna a política de execução sem mexer em definições do Windows.

## Estado atual (fase MVP — UI com dados de exemplo)

Ecrãs construídos e verificados a renderizar corretamente:
- `src/screens/HomeScreen.tsx` — Início
- `src/screens/PortfolioScreen.tsx` — Portfólio
- `src/screens/EventsScreen.tsx` — Eventos
- `src/screens/AlertsScreen.tsx` — Alertas
- `src/screens/ProfileScreen.tsx` — Perfil
- `src/screens/WorkDetailScreen.tsx` — Detalhe de um trabalho

Todos usam dados de exemplo fixos no próprio ficheiro (arrays no topo de cada
screen). Ainda não há ligação real à base de dados.

## Por fazer a seguir

1. **Firebase real** — feito (2026-09-03): `marble-studios-dev` e
   `marble-studios-prod` existem, com Firestore (`eur3`, production mode) e
   Auth (email/password) ativos; config nos `.env` / `.env.production`.
   Ver "Firebase: os dois projetos" abaixo para o que falta (regras + seed).
2. **Autenticação** — feito (2026-09-03): ver "Autenticação" abaixo.
3. **Ligar os ecrãs ao Firestore** — substituir os arrays de exemplo por
   queries reais (Secção 4 do `ROADMAP.md`).
4. **Painel da equipa (backoffice)** — ainda não desenhado nem construído.
5. **Notificações push** — Firebase Cloud Messaging + lógica dos lembretes
   automáticos (checkup 1 semana depois, etc.) ainda por implementar.
6. **Fotos reais** — só o Jaguar (`assets/work-jaguar-purple.jpg`) e o
   logótipo são reais; o resto são placeholders com gradiente dourado
   (`src/components/PlaceholderThumb.tsx`).

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
`firestore.rules`; estão publicadas no **dev** (2026-09-03). O **prod**
ainda tem as regras iniciais de production mode (tudo negado) — publica lá
na Secção 11, antes do lançamento.

O Firebase CLI já está autenticado nesta máquina (`v.godric@gmail.com`).
Sempre que mudares `firestore.rules`:

```bash
npx.cmd firebase-tools deploy --only firestore:rules --project dev
```

(troca `dev` por `prod` para o outro projeto; os aliases estão em
`.firebaserc`). Nota: o Claude Code em modo automático não pode correr
deploys — corre tu este comando no teu PowerShell.

Para confirmar que tudo está ligado (config do `.env` + regras):

```bash
npm run check:firestore
```

### Popular com dados de exemplo

Para o critério de conclusão da Secção 1 ("pelo menos um documento de
exemplo em cada coleção"), usa o script de seed — precisa de uma chave de
service account porque as regras negam escritas de cliente:

```bash
# 1. Descarrega uma chave de service account:
#    Definições do projeto > Contas de serviço > Gerar nova chave privada
#    (guarda como serviceAccountKey.dev.json na raiz do projeto — já está
#    no .gitignore, nunca vai para o git)
# 2. Corre:
npm run seed -- ./serviceAccountKey.dev.json
```

Não faças seed do `prod` — o roadmap diz para o deixar vazio até ao
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
