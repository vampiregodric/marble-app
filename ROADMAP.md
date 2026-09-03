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
ROADMAP.md e ataca a Secção 3."*

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
**Fica para depois:** preencher `COMPANY` em `src/legal/texts.ts`
(denominação, NIF, morada, email de privacidade) e correr
`npm run build:legal`; revisão por advogado; job de contas inativas
(Secção 6); publicar `docs/legal/` num URL público (Secção 11). Ponto a
confirmar com a Marble Studios: a cláusula 5 dos termos assume que fotos
dos trabalhos podem ir para o portfólio/redes sem identificar o dono e com
matrícula ocultada, salvo pedido em contrário.

### Secção 4 — Ligar os 6 ecrãs a dados reais
**Estado:** Por fazer
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

### Secção 5 — Painel da equipa (backoffice)
**Estado:** Por fazer
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

### Secção 6 — Notificações push automáticas
**Estado:** Por fazer
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

### Secção 7 — Ecrã de pedido de orçamento
**Estado:** Por fazer
**Depende de:** Secção 1 (para guardar o pedido)
**Objetivo:** O botão "Pedir orçamento semelhante" no Detalhe do Trabalho
(`src/screens/WorkDetailScreen.tsx`) ainda não faz nada. Construir o
formulário/fluxo de pedido de orçamento.

### Secção 8 — Fluxo de agendamento de checkup
**Estado:** Por fazer
**Depende de:** Secção 1, Secção 6
**Objetivo:** O botão "Agendar agora" no cartão de "Ação pendente" do
Perfil (`src/screens/ProfileScreen.tsx`) ainda não faz nada. Decidir e
construir: calendário dentro da app, ou só confirmação simples que avisa
a equipa?

### Secção 9 — Conteúdo estático: AI Business & Marble Ads
**Estado:** Por fazer
**Depende de:** nada
**Objetivo:** As secções "AI Business" (consultoria de IA) e "Marble Ads"
(Google/Meta Ads) na Home ainda só têm o cartão — precisam de uma página
própria quando clicadas (provavelmente informativa + formulário de
contacto, sem muita lógica de dados).

### Secção 10 — Distribuição: Xtreme Polishing Systems & Inozetek
**Estado:** Por fazer
**Depende de:** nada
**Objetivo:** O cartão "Xtreme Polishing Systems" na Home precisa de
ligar a algo real (link externo? página própria?). Preparar o mesmo
tratamento para a Inozetek quando a parceria for oficial (ver SPEC.md).

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
`npm run build:legal`); falta publicá-las (o mais simples é GitHub Pages a
servir a pasta `docs/`) e preencher `COMPANY` em `src/legal/texts.ts`
antes. Preencher também o formulário "Data safety" (Play) / "App Privacy"
(Apple) com o que a política declara: nome, email, telemóvel, dados de
veículo, identificador de push.

---

## Notas para quem pega numa secção

- Todos os ecrãs seguem o mesmo sistema de cores/tipografia em
  `src/theme/theme.ts` — usa sempre esses tokens, não cores à mão.
- O projeto vive fora do OneDrive de propósito (ver aviso em
  `DEVELOPMENT.md`) — nunca movas a pasta de volta para lá.
- Faz commit no fim da tua secção, com mensagem clara do que ficou feito.
